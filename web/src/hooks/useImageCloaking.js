import { useState, useCallback, useRef, useEffect } from 'react'
import { processImageWithFawkes, processImageWithAdvCloak } from '../utils/cloakingEngine'
import { calculateImageMetrics } from '../utils/imageUtils'
import { processingEstimator } from '../utils/processingEstimator'
import { createLogger } from '../utils/logger'

const logger = createLogger('useImageCloaking')

// Robust and simplified hook for image cloaking
export function useImageCloaking() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)
  const [currentStatus, setCurrentStatus] = useState('')
  
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
        
        workerRef.current.onmessage = (e) => {
          const { type, progress: workerProgress, result, error: workerError, status } = e.data
          
          switch (type) {
            case 'WORKER_READY':
              workerAvailable.current = true
              logger.debug('Worker ready and available')
              break
            case 'PROGRESS':
              setProgress(workerProgress)
              break
            case 'STATUS':
              setCurrentStatus(status)
              break
            case 'COMPLETE':
              handleProcessingComplete(result)
              break
            case 'WORKER_ERROR':
              logger.warn('Worker failed, falling back to main thread:', workerError)
              workerAvailable.current = false
              // Don't treat as error, fall back to main thread
              break
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
        
        // Test worker availability
        workerRef.current.postMessage({ type: 'HEALTH_CHECK', taskId: Date.now() })
        
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
    }
  }, [])

  const processImage = useCallback(async (imageFile, settings) => {
    // Clean slate
    resetProcessing()
    
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
        setCurrentStatus('Processing with Web Worker...')
        result = await processWithWorker(imageDataURL, settings)
      } else {
        // Main thread processing only when worker not available
        setCurrentStatus('Processing on main thread...')
        result = await processOnMainThread(imageDataURL, settings)
      }

      // Processing completed successfully

      return result
    } catch (error) {
      handleProcessingError(error)
      throw error
    }
  }, [])

  const processWithWorker = useCallback((imageDataURL, settings) => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current || !workerAvailable.current) {
        reject(new Error('Worker not available'))
        return
      }

      const taskId = Date.now()
      let completed = false
      
      const messageHandler = (e) => {
        if (e.data.taskId !== taskId) return
        
        if (e.data.type === 'COMPLETE' && !completed) {
          completed = true
          workerRef.current.removeEventListener('message', messageHandler)
          resolve(e.data.result)
        } else if (e.data.type === 'WORKER_ERROR' && !completed) {
          completed = true
          workerRef.current.removeEventListener('message', messageHandler)
          reject(new Error(e.data.error))
        }
      }
      
      workerRef.current.addEventListener('message', messageHandler)
      
      // Send task to worker
      try {
        const taskType = settings.method === 'both' ? 'PROCESS_BOTH' : 
                        settings.method === 'fawkes' ? 'PROCESS_FAWKES' : 'PROCESS_ADVCLOAK'
        
        workerRef.current.postMessage({
          type: taskType,
          taskId,
          data: {
            imageDataURL,
            protectionLevel: settings.fawkesLevel,
            fawkesLevel: settings.fawkesLevel,
            epsilon: settings.advCloakEpsilon,
            iterations: settings.advCloakIterations,
            advCloakEpsilon: settings.advCloakEpsilon,
            advCloakIterations: settings.advCloakIterations
          }
        })
      } catch (error) {
        completed = true
        workerRef.current.removeEventListener('message', messageHandler)
        reject(new Error(`Failed to send task to worker: ${error.message}`))
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
          fawkesResult, 
          settings.advCloakEpsilon, 
          settings.advCloakIterations,
          (p) => progressCallback(50 + p * 0.5),
          abortController.current.signal
        )
      }

      return {
        imageDataURL: result,
        method: settings.method,
        processingTime: Date.now() - startTime
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
        
        // Calculate metrics with timeout to prevent hanging
        const metricsPromise = calculateImageMetrics(originalImageDataURL.current, result.imageDataURL)
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Metrics calculation timeout')), 5000)
        )
        
        metrics = await Promise.race([metricsPromise, timeoutPromise])
        logger.debug('Metrics calculated successfully:', metrics)
      } else {
        logger.warn('Cannot calculate metrics: missing original or processed image')
      }
    } catch (error) {
      logger.warn('Metrics calculation failed:', error.message)
      // Continue with default metrics - don't let this block completion
    }
    
    // Set results immediately - don't wait for anything else
    setResults({
      [result.method]: {
        imageData: result.imageDataURL,
        metrics,
        processingTime: result.processingTime || 0,
        method: result.method
      }
    })
    
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