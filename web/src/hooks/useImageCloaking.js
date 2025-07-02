import { useState, useCallback, useRef, useEffect } from 'react'
import { processImageWithFawkes, processImageWithAdvCloak, cleanup } from '../utils/cloakingEngine'
import { calculateImageMetrics } from '../utils/imageUtils'
import { processingEstimator } from '../utils/processingEstimator'
import { createLogger } from '../utils/logger'
import { globalThrottle } from '../utils/processingThrottle'

const logger = createLogger('useImageCloaking')

// Robust and simplified hook for image cloaking
export function useImageCloaking() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)
  const [currentStatus, setCurrentStatus] = useState('')
  const [throttleStats, setThrottleStats] = useState(globalThrottle.getStats())
  
  const workerRef = useRef(null)
  const abortController = useRef(null)
  const workerAvailable = useRef(false)
  const processingStartTime = useRef(null)
  const estimatedProcessingTime = useRef(null)
  const currentPixelCount = useRef(null)
  const originalImageDataURL = useRef(null)

  // Initialize worker with robust error handling
  useEffect(() => {
    const initWorker = () => {
      try {
        workerRef.current = new Worker(new URL('../utils/cloakingWorker.js', import.meta.url))
        
        const initTaskId = Date.now()
        
        workerRef.current.onmessage = (e) => {
          const { type, taskId, progress: workerProgress, result, error: workerError, status } = e.data
          
          // Handle worker initialization
          if (type === 'initialized' && taskId === initTaskId) {
            workerAvailable.current = true
            logger.info('Web Worker initialized successfully')
            return
          }
          
          // Handle global errors during processing
          if (type === 'error' && !taskId) {
            logger.warn('Worker error:', workerError)
            workerAvailable.current = false
          }
        }
        
        workerRef.current.onerror = (error) => {
          logger.warn('Worker error, disabling worker:', error)
          workerAvailable.current = false
          workerRef.current = null
        }
        
        workerRef.current.onmessageerror = (error) => {
          logger.warn('Worker message error, disabling worker:', error)
          workerAvailable.current = false
          workerRef.current = null
        }
        
        // Initialize worker
        workerRef.current.postMessage({ 
          type: 'init', 
          taskId: initTaskId 
        })
        
      } catch (error) {
        logger.warn('Worker initialization failed, using main thread only:', error)
        workerRef.current = null
        workerAvailable.current = false
      }
    }

    initWorker()
    
    return () => {
      if (workerRef.current) {
        try {
          workerRef.current.terminate()
        } catch (error) {
          logger.warn('Error terminating worker:', error)
        }
      }
      
      // Cleanup TensorFlow.js resources
      try {
        cleanup()
      } catch (cleanupError) {
        logger.warn('Error during cleanup:', cleanupError)
      }
    }
  }, [])

  const processImage = useCallback(async (imageFile, settings) => {
    // Clean slate
    resetProcessing()
    
    // Reset throttle stats for new processing session
    globalThrottle.reset()
    
    if (!imageFile || !imageFile.type.startsWith('image/')) {
      throw new Error('Please select a valid image file')
    }
    
    if (imageFile.size > 10 * 1024 * 1024) { // 10MB limit
      throw new Error('Image too large. Please use an image smaller than 10MB.')
    }

    setIsProcessing(true)
    setCurrentStatus('Loading image...')
    abortController.current = new AbortController()
    processingStartTime.current = Date.now()
    
    // Start monitoring throttle stats during processing
    const statsInterval = setInterval(() => {
      setThrottleStats(globalThrottle.getStats())
    }, 500) // Update every 500ms
    
    // Cleanup function for stats monitoring
    const cleanupStats = () => clearInterval(statsInterval)

    try {
      // Get estimated time and pixel count for calibration
      try {
        const estimate = await processingEstimator.estimateProcessingTime(imageFile, settings)
        estimatedProcessingTime.current = estimate
        
        // Get pixel count for calibration
        const img = new Image()
        img.src = URL.createObjectURL(imageFile)
        await new Promise((resolve) => {
          img.onload = () => {
            currentPixelCount.current = img.width * img.height
            resolve()
          }
          img.onerror = () => {
            currentPixelCount.current = Math.min(imageFile.size * 0.3, 2073600)
            resolve()
          }
        })
      } catch (calibrationError) {
        logger.warn('Failed to get calibration data:', calibrationError)
      }
      
      // Convert to data URL and store reference
      const imageDataURL = await fileToDataURL(imageFile)
      originalImageDataURL.current = imageDataURL
      setProgress(5)

      // No automatic timeout - user can cancel manually

      let result
      // Use worker when available, otherwise main thread
      if (workerAvailable.current && workerRef.current && settings.useWorker !== false) {
        try {
          setCurrentStatus('Processing with Web Worker...')
          result = await processWithWorker(imageDataURL, settings)
          
          // Format worker result to match expected structure
          result = {
            imageDataURL: result.processedDataURL,
            processedDataURL: result.processedDataURL,
            method: settings.method, // Worker doesn't include method, add it here
            processingTime: 0, // Worker doesn't track timing
            facesDetected: result.facesDetected || 0,
            epsilon: result.epsilon,
            iterations: result.iterations,
            protectionLevel: result.protectionLevel
          }
          
          logger.debug('Formatted worker result:', {
            resultKeys: Object.keys(result),
            hasProcessedDataURL: !!result.processedDataURL,
            hasImageDataURL: !!result.imageDataURL,
            method: result.method
          })
        } catch (workerError) {
          if (workerError.message === 'FALLBACK_TO_MAIN_THREAD') {
            logger.info('Falling back to main thread processing due to worker backend issues')
            setCurrentStatus('Switching to main thread processing...')
            result = await processOnMainThread(imageDataURL, settings)
          } else {
            throw workerError
          }
        }
      } else {
        // Main thread processing only when worker not available
        setCurrentStatus('Processing on main thread...')
        result = await processOnMainThread(imageDataURL, settings)
      }

      // Both paths now go through handleProcessingComplete
      await handleProcessingComplete(result)
      
      // Cleanup stats monitoring
      cleanupStats()
      setThrottleStats(globalThrottle.getStats()) // Final update

      return result
    } catch (error) {
      // Cleanup stats monitoring on error
      cleanupStats()
      setThrottleStats(globalThrottle.getStats()) // Final update
      
      handleProcessingError(error)
      throw error
    }
  }, [])

  const processWithWorker = useCallback(async (imageDataURL, settings) => {
    // Detect faces - required for Fawkes, optional for AdvCloak
    setCurrentStatus('Detecting faces...')
    const { detectFaces } = await import('../utils/cloakingEngine')
    const faces = await detectFaces(imageDataURL)
    
    // Only require faces for Fawkes method
    if (faces.length === 0 && (settings.method === 'fawkes' || settings.method === 'both')) {
      throw new Error('No faces detected in the image. Fawkes protection requires faces to be present.')
    }

    return new Promise((resolve, reject) => {
      if (!workerRef.current || !workerAvailable.current) {
        reject(new Error('Worker not available'))
        return
      }

      try {
        const taskId = Date.now()
        let completed = false
        
        const messageHandler = (e) => {
          if (e.data.taskId !== taskId) return
          
          if (e.data.type === 'result' && !completed) {
            completed = true
            workerRef.current.removeEventListener('message', messageHandler)
            logger.debug('Received result from worker:', {
              taskId,
              resultKeys: Object.keys(e.data.result || {}),
              hasProcessedDataURL: !!e.data.result?.processedDataURL,
              processedDataURLLength: e.data.result?.processedDataURL?.length
            })
            resolve(e.data.result)
          } else if (e.data.type === 'error' && !completed) {
            completed = true
            workerRef.current.removeEventListener('message', messageHandler)
            
            const errorMessage = e.data.error
            logger.warn('Worker processing failed:', errorMessage)
            
            // If it's a backend error, fall back to main thread
            if (errorMessage.includes('backend') || errorMessage.includes('Backend')) {
              logger.info('Backend error detected, falling back to main thread')
              workerAvailable.current = false
              reject(new Error('FALLBACK_TO_MAIN_THREAD'))
            } else {
              reject(new Error(errorMessage))
            }
          } else if (e.data.type === 'progress') {
            setProgress(e.data.progress)
            if (e.data.status) {
              setCurrentStatus(e.data.status)
            }
          }
        }
        
        workerRef.current.addEventListener('message', messageHandler)
        
        // Map protection level to epsilon for Fawkes
        const fawkesEpsilonMap = {
          low: 0.02,
          mid: 0.03, 
          high: 0.05
        }
        
        // Send task to worker with new protocol
        const taskType = settings.method === 'both' ? 'both' : 
                        settings.method === 'fawkes' ? 'fawkes' : 'advcloak'
        
        workerRef.current.postMessage({
          type: taskType,
          taskId,
          data: {
            imageDataURL,
            faces,
            fawkesEpsilon: fawkesEpsilonMap[settings.fawkesLevel] || 0.03,
            advCloakEpsilon: settings.advCloakEpsilon,
            advCloakIterations: settings.advCloakIterations
          }
        })
        
      } catch (error) {
        reject(new Error(`Failed to process with worker: ${error.message}`))
      }
    })
  }, [])

  const processOnMainThread = useCallback(async (imageDataURL, settings) => {
    const startTime = Date.now()
    
    const progressCallback = (progress) => {
      setProgress(progress)
      // Yield control to prevent UI blocking
      return new Promise(resolve => setTimeout(resolve, 0))
    }

    let result

    try {
      if (settings.method === 'fawkes') {
        setCurrentStatus('Applying Fawkes protection...')
        result = await processImageWithFawkes(imageDataURL, settings.fawkesLevel, progressCallback, abortController.current.signal)
      } else if (settings.method === 'advcloak') {
        setCurrentStatus('Applying AdvCloak protection...')
        result = await processImageWithAdvCloak(imageDataURL, settings.advCloakEpsilon, settings.advCloakIterations, progressCallback, abortController.current.signal)
      } else if (settings.method === 'both') {
        setCurrentStatus('Step 1/2: Applying Fawkes protection...')
        const fawkesResult = await processImageWithFawkes(
          imageDataURL, 
          settings.fawkesLevel, 
          (p) => progressCallback(p * 0.5),
          abortController.current.signal
        )
        
        setCurrentStatus('Step 2/2: Applying AdvCloak protection...')
        result = await processImageWithAdvCloak(
          fawkesResult.processedDataURL, 
          settings.advCloakEpsilon, 
          settings.advCloakIterations,
          (p) => progressCallback(50 + p * 0.5),
          abortController.current.signal
        )
      }

      return {
        imageDataURL: result.processedDataURL || result,
        processedDataURL: result.processedDataURL || result,
        method: settings.method,
        processingTime: Date.now() - startTime,
        facesDetected: result.facesDetected || 0,
        epsilon: result.epsilon,
        iterations: result.iterations,
        protectionLevel: result.protectionLevel
      }
    } catch (error) {
      throw new Error(`Main thread processing failed: ${error.message}`)
    }
  }, [])

  const handleProcessingComplete = useCallback(async (result) => {
    setCurrentStatus('Finalizing...')
    setProgress(95)
    
    // Record actual processing time for calibration
    if (processingStartTime.current && estimatedProcessingTime.current && currentPixelCount.current) {
      const actualTime = Math.round((Date.now() - processingStartTime.current) / 1000)
      try {
        processingEstimator.recordActualTime(
          result.method,
          estimatedProcessingTime.current,
          actualTime,
          currentPixelCount.current
        )
        logger.debug(`Processing completed: estimated ${estimatedProcessingTime.current}s, actual ${actualTime}s`)
      } catch (error) {
        logger.warn('Failed to record processing time:', error)
      }
    }
    
    // Calculate metrics with robust error handling
    let metrics = { psnr: null, ssim: null, mse: null, perceptual_distance: null }
    
    try {
      // Only calculate metrics if we have both original and processed images
      if (originalImageDataURL.current && result.imageDataURL) {
        setCurrentStatus('Calculating quality metrics...')
        
        // Calculate actual quality metrics using imageUtils
        const qualityMetrics = await calculateImageMetrics(
          originalImageDataURL.current, 
          result.imageDataURL
        )
        
        // Merge quality metrics with metadata
        metrics = {
          ...qualityMetrics,
          facesDetected: result.facesDetected || 0,
          epsilon: result.epsilon,
          iterations: result.iterations,
          protectionLevel: result.protectionLevel,
          method: result.method
        }
        
        logger.debug('Metrics calculated successfully:', {
          psnr: metrics.psnr,
          ssim: metrics.ssim,
          mse: metrics.mse,
          facesDetected: metrics.facesDetected
        })
      } else {
        logger.warn('Cannot calculate metrics: missing original or processed image', {
          hasOriginal: !!originalImageDataURL.current,
          hasProcessed: !!result.imageDataURL
        })
      }
    } catch (error) {
      logger.warn('Metrics calculation failed:', error.message)
      // Continue with metadata only if quality calculation fails
      metrics = {
        psnr: null,
        ssim: null,
        mse: null,
        perceptual_distance: null,
        facesDetected: result.facesDetected || 0,
        epsilon: result.epsilon,
        iterations: result.iterations,
        protectionLevel: result.protectionLevel,
        method: result.method
      }
    }
    
    // Set results immediately - don't wait for anything else
    const processedDataURL = result.imageDataURL || result.processedDataURL
    logger.debug('Setting results in state:', {
      resultKeys: Object.keys(result),
      hasImageDataURL: !!result.imageDataURL,
      hasProcessedDataURL: !!result.processedDataURL,
      finalProcessedDataURLLength: processedDataURL?.length,
      resultMethod: result.method,
      processedDataURLPrefix: processedDataURL?.substring(0, 50)
    })
    
    const finalResults = {
      [result.method]: {
        originalDataURL: originalImageDataURL.current,
        processedDataURL: processedDataURL,
        imageData: processedDataURL, // For compatibility with ResultsDisplay
        method: result.method,
        processingTime: result.processingTime || 0,
        facesDetected: result.facesDetected || 0,
        epsilon: result.epsilon,
        iterations: result.iterations,
        protectionLevel: result.protectionLevel,
        metrics
      }
    }
    
    logger.debug('Final results object being set:', {
      resultKeys: Object.keys(finalResults),
      methodKeys: Object.keys(finalResults[result.method] || {}),
      hasImageData: !!finalResults[result.method]?.imageData,
      imageDataLength: finalResults[result.method]?.imageData?.length
    })
    
    setResults(finalResults)
    
    setProgress(100)
    setCurrentStatus('Complete!')
    setIsProcessing(false)
    
    // Clear status after delay
    setTimeout(() => setCurrentStatus(''), 3000)
  }, [])

  const handleProcessingError = useCallback((error) => {
    logger.error('Processing error:', error)
    setError(error.message)
    setIsProcessing(false)
    setCurrentStatus('')
    setProgress(0)
  }, [])

  const resetProcessing = useCallback(() => {
    if (abortController.current) {
      abortController.current.abort()
    }
    
    setIsProcessing(false)
    setProgress(0)
    setError(null)
    setCurrentStatus('')
    
    // Clear tracking data
    processingStartTime.current = null
    estimatedProcessingTime.current = null
    currentPixelCount.current = null
    originalImageDataURL.current = null
  }, [])

  const resetResults = useCallback(() => {
    resetProcessing()
    setResults(null)
  }, [resetProcessing])

  const cancelProcessing = useCallback(() => {
    if (!isProcessing) return
    
          logger.debug('Cancelling processing...')
    setCurrentStatus('Cancelling...')
    
    // Abort any ongoing operations
    if (abortController.current) {
      abortController.current.abort()
    }
    
    // Terminate worker if it's running
    if (workerRef.current && workerAvailable.current) {
      try {
        workerRef.current.terminate()
                  logger.debug('Worker terminated')
      } catch (error) {
        logger.warn('Error terminating worker:', error)
      }
      
      // Reinitialize worker for next use
      setTimeout(() => {
        try {
          workerRef.current = new Worker(new URL('../utils/cloakingWorker.js', import.meta.url))
          workerAvailable.current = false
          
          workerRef.current.onmessage = (e) => {
            if (e.data.type === 'WORKER_READY') {
              workerAvailable.current = true
                              logger.debug('Worker reinitialized')
            }
          }
          
          workerRef.current.onerror = () => {
            workerAvailable.current = false
            workerRef.current = null
          }
          
          workerRef.current.postMessage({ type: 'HEALTH_CHECK', taskId: Date.now() })
        } catch (error) {
          logger.warn('Failed to reinitialize worker:', error)
          workerAvailable.current = false
        }
      }, 100)
    }
    
    // Reset state
    setIsProcessing(false)
    setProgress(0)
    setCurrentStatus('Cancelled by user')
    setError(null)
    
    // Clear tracking data
    processingStartTime.current = null
    estimatedProcessingTime.current = null
    currentPixelCount.current = null
    
    // Clear status after delay
    setTimeout(() => setCurrentStatus(''), 2000)
  }, [isProcessing])

  return {
    processImage,
    cancelProcessing,
    isProcessing,
    progress,
    results,
    error,
    currentStatus,
    resetResults,
    // Performance monitoring
    throttleStats,
    // Expose worker status for debugging
    workerAvailable: workerAvailable.current
  }
}

// Utility functions
async function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsDataURL(file)
    } catch (error) {
      reject(error)
    }
  })
} 