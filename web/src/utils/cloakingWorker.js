/**
 * TensorFlow.js Web Worker for adversarial image processing
 * Focuses on compute-heavy adversarial attacks, receives face detection from main thread
 */

// Import TensorFlow.js with latest stable version
importScripts('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.20.0/dist/tf.min.js')

let isInitialized = false

// Worker logger with debug always enabled
const logger = {
  debug: (message, ...args) => console.log(`[CloakingWorker] DEBUG: ${message}`, ...args),
  info: (message, ...args) => console.info(`[CloakingWorker] ${message}`, ...args),
  warn: (message, ...args) => console.warn(`[CloakingWorker] ${message}`, ...args),
  error: (message, ...args) => console.error(`[CloakingWorker] ${message}`, ...args)
}

// Memory management utilities
function logMemoryUsage(context = '') {
  const memInfo = tf.memory()
  const memoryMB = memInfo.numBytes / 1024 / 1024
  if (memoryMB > 200) { // Log if > 200MB (lower threshold)
    logger.warn(`${context} Memory usage: ${memoryMB.toFixed(2)} MB (${memInfo.numTensors} tensors)`)
  }
}

function forceGarbageCollection() {
  try {
    // Force cleanup of disposed tensors
    tf.disposeVariables()
    
    // Manual WebGL context cleanup
    if (tf.getBackend() === 'webgl') {
      const backend = tf.backend()
      if (backend && backend.gpgpu && backend.gpgpu.gl) {
        backend.gpgpu.gl.finish()
      }
    }
    
    // Browser garbage collection if available
    if (typeof gc !== 'undefined') {
      gc()
    }
    
    // Force a small delay to allow cleanup
    return new Promise(resolve => setTimeout(resolve, 10))
  } catch (error) {
    logger.warn('Garbage collection error:', error)
  }
}

// DRY Utilities for tensor processing
function safeDispose(...tensors) {
  tensors.forEach(tensor => {
    try {
      if (tensor && typeof tensor.dispose === 'function' && !tensor.isDisposed) {
        tensor.dispose()
      }
    } catch (error) {
      logger.warn('Failed to dispose tensor:', error)
    }
  })
}

// Simplified backend check - don't interfere with active computations
function isBackendReady() {
  try {
    return tf && tf.getBackend() && tf.backend()
  } catch (error) {
    return false
  }
}

async function initializeWorker() {
  if (isInitialized) return
  
  try {
    logger.info('Initializing TensorFlow.js worker...')
    
    // Wait a bit for TensorFlow.js to fully load
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Initialize TensorFlow.js - simple and safe
    await tf.ready()
    
    // Use WebGL if available, CPU otherwise
    try {
      await tf.setBackend('webgl')
      await tf.ready()
      logger.info('Worker using WebGL backend')
    } catch (webglError) {
      logger.warn('WebGL failed, using CPU backend:', webglError)
      await tf.setBackend('cpu')
      await tf.ready()
      logger.info('Worker using CPU backend')
    }
    
    // Configure environment for stability
    tf.env().set('WEBGL_DELETE_TEXTURE_THRESHOLD', -1) // Disable auto cleanup
    tf.env().set('WEBGL_FORCE_F16_TEXTURES', false)
    tf.env().set('WEBGL_PACK', false)
    tf.env().set('WEBGL_CPU_FORWARD', false)
    
    // Simple test to ensure backend works
    const testOp = tf.tidy(() => {
      const a = tf.ones([2, 2])
      const b = tf.ones([2, 2])
      return tf.add(a, b)
    })
    
    const testResult = testOp.dataSync()
    if (testResult[0] !== 2.0) {
      throw new Error('Backend test operation failed')
    }
    testOp.dispose()
    
    isInitialized = true
    logger.info(`Worker initialized successfully with ${tf.getBackend()} backend`)
    
  } catch (error) {
    logger.error('Worker initialization failed:', error)
    isInitialized = false
    throw new Error('Worker initialization failed: ' + error.message)
  }
}

// FGSM Attack Implementation (matches main thread pattern)
class WorkerFGSMAttack {
  constructor(epsilon = 0.03) {
    this.epsilon = epsilon
  }
  
  createSurrogateModel(inputShape) {
    try {
      const [height, width, channels] = inputShape
      const imageSize = height * width
      
      // Adaptive model architecture based on image size to prevent WebGL texture limits
      let filters1, filters2, filters3, kernelSize1, kernelSize2
      
      if (imageSize > 2048 * 2048) {
        // Large images: minimal model to avoid WebGL limits
        filters1 = 8
        filters2 = 16  
        filters3 = 24
        kernelSize1 = 3
        kernelSize2 = 3
        logger.info(`Worker: Using minimal surrogate model for large image: ${width}×${height}`)
      } else if (imageSize > 1024 * 1024) {
        // Medium images: reduced complexity
        filters1 = 12
        filters2 = 24
        filters3 = 32
        kernelSize1 = 3
        kernelSize2 = 3
      } else {
        // Small images: full model
        filters1 = 16
        filters2 = 32
        filters3 = 64
        kernelSize1 = 5
        kernelSize2 = 5
      }
      
      const model = tf.sequential({
        layers: [
          tf.layers.conv2d({
            filters: filters1,
            kernelSize: kernelSize1,
            activation: 'relu',
            inputShape: inputShape,
            dataFormat: 'channelsLast'
          }),
          tf.layers.maxPooling2d({ 
            poolSize: 2,
            dataFormat: 'channelsLast'
          }),
          tf.layers.conv2d({ 
            filters: filters2, 
            kernelSize: kernelSize2, 
            activation: 'relu',
            dataFormat: 'channelsLast'
          }),
          tf.layers.maxPooling2d({ 
            poolSize: 2,
            dataFormat: 'channelsLast'
          }),
          tf.layers.conv2d({ 
            filters: filters3, 
            kernelSize: 3, 
            activation: 'relu',
            dataFormat: 'channelsLast'
          }),
          tf.layers.globalAveragePooling2d({
            dataFormat: 'channelsLast'
          }),
          tf.layers.dense({ units: Math.min(64, filters3), activation: 'relu' }),
          tf.layers.dropout({ rate: 0.3 }), // Higher dropout for stability
          tf.layers.dense({ units: 10, activation: 'softmax' })
        ]
      })
      
      // Use lightweight optimizer for large images
      const optimizer = imageSize > 2048 * 2048 ? 'sgd' : 'adam'
      
      model.compile({
        optimizer: optimizer,
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
      })
      
      logger.debug(`Worker surrogate model: ${filters1}-${filters2}-${filters3} filters, ${kernelSize1}×${kernelSize2} kernels`)
      return model
    } catch (error) {
      logger.error('Worker: Failed to create surrogate model:', error)
      throw new Error('Worker model creation failed: ' + error.message)
    }
  }

  async generatePerturbation(imageTensor, targetClass = null) {
    let model = null
    let perturbation = null
    
    try {
      // Create model fresh each time - match main thread pattern exactly
      model = this.createSurrogateModel(imageTensor.shape.slice(1))
      
      // Create gradient function that computes loss w.r.t input
      const lossGradFn = tf.grad(input => {
        const pred = model.predict(input)
        if (targetClass !== null) {
          const target = tf.oneHot(targetClass, pred.shape[1])
          return tf.neg(tf.losses.softmaxCrossEntropy(target, pred))
        } else {
          const trueClass = tf.argMax(pred, 1)
          const target = tf.oneHot(trueClass, pred.shape[1])
          return tf.losses.softmaxCrossEntropy(target, pred)
        }
      })
      
      // Calculate gradients with respect to input tensor
      const gradients = lossGradFn(imageTensor)
      
      // Sign of gradients
      const signGradients = tf.sign(gradients)
      
      // Apply epsilon scaling
      perturbation = tf.mul(signGradients, this.epsilon)
      
      // Cleanup intermediate tensors
      gradients.dispose()
      signGradients.dispose()
      
      return perturbation
      
    } catch (error) {
      logger.error(`Worker FGSM perturbation generation failed: ${error.message}`)
      
      // Cleanup on error
      if (model) model.dispose()
      if (perturbation) perturbation.dispose()
      
      throw error
    } finally {
      if (model) model.dispose()
    }
  }
}

// Iterative FGSM Attack (matches main thread pattern)
class WorkerIterativeFGSMAttack extends WorkerFGSMAttack {
  constructor(epsilon = 0.03, iterations = 10, stepSize = 0.007) {
    super(epsilon)
    this.iterations = iterations
    this.stepSize = stepSize
  }
  
  async generatePerturbation(imageTensor, targetClass = null, progressCallback = null) {
    const model = this.createSurrogateModel(imageTensor.shape.slice(1))
    
    let adversarialImage = tf.clone(imageTensor)
    
    // Create gradient function once outside the loop
    const lossGradFn = tf.grad(input => {
      const pred = model.predict(input)
      if (targetClass !== null) {
        const target = tf.oneHot(targetClass, pred.shape[1])
        return tf.neg(tf.losses.softmaxCrossEntropy(target, pred))
      } else {
        const trueClass = tf.argMax(pred, 1)
        const target = tf.oneHot(trueClass, pred.shape[1])
        return tf.losses.softmaxCrossEntropy(target, pred)
      }
    })
    
    // Async iteration with throttling and memory management - match main thread exactly
    for (let i = 0; i < this.iterations; i++) {
      const iterationStart = performance.now()
      const prevAdversarial = adversarialImage
      
      try {
        // Perform one iteration of gradient computation
        const newAdversarial = tf.tidy(() => {
          const gradients = lossGradFn(adversarialImage)
          const signGradients = tf.sign(gradients)
          const step = tf.mul(signGradients, this.stepSize)
          
          const tentativeAdversarial = tf.add(adversarialImage, step)
          
          // Clip to epsilon-ball around original image
          const perturbation = tf.sub(tentativeAdversarial, imageTensor)
          const clippedPerturbation = tf.clipByValue(perturbation, -this.epsilon, this.epsilon)
          const clippedAdversarial = tf.add(imageTensor, clippedPerturbation)
          
          // Clip to valid pixel range [-1, 1]
          return tf.clipByValue(clippedAdversarial, -1, 1)
        })
        
        // Dispose previous iteration's result (except first iteration)
        if (i > 0) {
          prevAdversarial.dispose()
        }
        
        adversarialImage = newAdversarial
        
        // Update progress
        if (progressCallback) {
          progressCallback((i + 1) / this.iterations)
        }
        
        // Memory management and yielding - less aggressive than before
        if (i % 5 === 0) { // Every 5 iterations instead of 3
          // Check memory usage
          const memInfo = tf.memory()
          if (memInfo.numBytes > 800 * 1024 * 1024) { // > 800MB instead of 500MB
            logger.warn(`Worker high memory usage: ${Math.round(memInfo.numBytes / 1024 / 1024)}MB, forcing cleanup`)
            // Don't use tf.dispose() which can corrupt active tensors
            await forceGarbageCollection()
          }
        }
        
        // Yield control if needed - simpler check
        const processingTime = performance.now() - iterationStart
        if (i % 3 === 0 || processingTime > 16) { // Every 3 iterations or if > 16ms (one frame)
          await new Promise(resolve => setTimeout(resolve, 1)) // Minimal yield
        }
        
      } catch (error) {
        // Cleanup on iteration error
        if (i > 0 && prevAdversarial) {
          prevAdversarial.dispose()
        }
        
        // Don't try fallbacks in worker - just fail and let main thread handle
        logger.error(`Worker iteration ${i + 1} failed: ${error.message}`)
        throw error
      }
    }
    
    // Calculate final perturbation
    const finalPerturbation = tf.sub(adversarialImage, imageTensor)
    
    // Cleanup
    adversarialImage.dispose()
    model.dispose()
    
    return finalPerturbation
  }
}

// Utility functions for tensor/image conversion
async function imageDataURLToTensor(dataURL) {
  try {
    // Convert data URL to blob
    const response = await fetch(dataURL)
    const blob = await response.blob()
    
    // Create ImageBitmap from blob (available in Web Workers)
    const imageBitmap = await createImageBitmap(blob)
    
    const originalWidth = imageBitmap.width
    const originalHeight = imageBitmap.height
    
    // More conservative limits to prevent conv2d intermediate tensor overflow
    const maxDimension = 2048 // Reduced to prevent conv2d texture overflow  
    const maxPixels = 2048 * 2048 // Max 4MP to prevent memory issues
    
    let finalWidth = originalWidth
    let finalHeight = originalHeight
    
    // Check if resizing is needed to prevent WebGL texture overflow
    const totalPixels = originalWidth * originalHeight
    if (originalWidth > maxDimension || originalHeight > maxDimension || totalPixels > maxPixels) {
      // Calculate scale to fit both dimension and pixel constraints
      const dimensionScale = Math.min(maxDimension / originalWidth, maxDimension / originalHeight)
      const pixelScale = Math.sqrt(maxPixels / totalPixels)
      const scale = Math.min(dimensionScale, pixelScale)
      
      finalWidth = Math.round(originalWidth * scale)
      finalHeight = Math.round(originalHeight * scale)
      
      logger.info(`Worker: Resizing image from ${originalWidth}×${originalHeight} to ${finalWidth}×${finalHeight} to prevent WebGL texture overflow`)
    }
    
    // Use OffscreenCanvas with final dimensions
    const canvas = new OffscreenCanvas(finalWidth, finalHeight)
    const ctx = canvas.getContext('2d')
    
    // Draw with resizing if necessary
    ctx.drawImage(imageBitmap, 0, 0, originalWidth, originalHeight, 0, 0, finalWidth, finalHeight)
    
    const imageData = ctx.getImageData(0, 0, finalWidth, finalHeight)
    
    // Convert to tensor with proper normalization
    const tensor = tf.browser.fromPixels(imageData)
      .expandDims(0)
      .div(255.0)
      .sub(0.5)
      .mul(2.0)
    
    // Clean up ImageBitmap
    imageBitmap.close()
    
    logger.debug(`Created tensor with shape: ${tensor.shape}`)
    return tensor
  } catch (error) {
    throw new Error(`Failed to convert image to tensor: ${error.message}`)
  }
}

// Fallback method: Manual pixel extraction and canvas drawing
async function tensorToImageDataURLFallback(tensor) {
  let squeezed = null
  let normalized = null
  
  try {
    logger.debug('Using fallback tensor to image conversion')
    
    // Remove batch dimension if present
    squeezed = tensor.rank === 4 ? tensor.squeeze([0]) : tensor.squeeze()
    const [height, width, channels] = squeezed.shape
    
    // Convert [-1, 1] to [0, 255] for ImageData
    normalized = squeezed.add(1).div(2).mul(255).clipByValue(0, 255)
    
    // Get pixel data
    const pixelData = await normalized.data()
    
    // Create ImageData
    const imageData = new ImageData(width, height)
    const data = imageData.data
    
    // Fill ImageData (convert RGB to RGBA)
    for (let i = 0; i < height * width; i++) {
      const pixelIndex = i * 4
      const tensorIndex = i * channels
      
      if (channels === 3) {
        data[pixelIndex] = pixelData[tensorIndex]     // R
        data[pixelIndex + 1] = pixelData[tensorIndex + 1] // G
        data[pixelIndex + 2] = pixelData[tensorIndex + 2] // B
        data[pixelIndex + 3] = 255 // A
      } else {
        // Grayscale
        const gray = pixelData[tensorIndex]
        data[pixelIndex] = gray     // R
        data[pixelIndex + 1] = gray // G
        data[pixelIndex + 2] = gray // B
        data[pixelIndex + 3] = 255  // A
      }
    }
    
    // Limit image size in fallback too (match main method)
    const maxDimension = 1600
    let finalWidth = width
    let finalHeight = height
    
    if (width > maxDimension || height > maxDimension) {
      const scale = Math.min(maxDimension / width, maxDimension / height)
      finalWidth = Math.round(width * scale)
      finalHeight = Math.round(height * scale)
      
      // Resize ImageData
      const tempCanvas = new OffscreenCanvas(width, height)
      const tempCtx = tempCanvas.getContext('2d')
      tempCtx.putImageData(imageData, 0, 0)
      
      const resizedCanvas = new OffscreenCanvas(finalWidth, finalHeight)
      const resizedCtx = resizedCanvas.getContext('2d')
      resizedCtx.drawImage(tempCanvas, 0, 0, width, height, 0, 0, finalWidth, finalHeight)
      
      imageData = resizedCtx.getImageData(0, 0, finalWidth, finalHeight)
    }
    
    // Create canvas and draw ImageData
    const canvas = new OffscreenCanvas(finalWidth, finalHeight)
    const ctx = canvas.getContext('2d')
    ctx.putImageData(imageData, 0, 0)
    
    // Use same adaptive compression logic as main method
    const targetMaxSize = 4 * 1024 * 1024 // 4MB target max
    let quality = 0.95
    let blob = await canvas.convertToBlob({ 
      type: 'image/jpeg', 
      quality: quality
    })
    
    // Iteratively reduce quality if file is too large
    while (blob.size > targetMaxSize && quality > 0.70) {
      quality -= 0.05
      blob = await canvas.convertToBlob({ 
        type: 'image/jpeg', 
        quality: quality
      })
    }
    
    // Ensure minimum quality
    if (quality < 0.70) {
      blob = await canvas.convertToBlob({ 
        type: 'image/jpeg', 
        quality: 0.75
      })
    }
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => reject(new Error('Failed to read blob as data URL'))
      reader.readAsDataURL(blob)
    })
    
  } finally {
    safeDispose(squeezed, normalized)
  }
}

async function tensorToImageDataURL(tensor) {
  let squeezed = null
  let normalized = null
  
  try {
    logger.debug('Converting tensor to image, input shape:', tensor.shape)
    
    // Remove batch dimension if present
    squeezed = tensor.rank === 4 ? tensor.squeeze([0]) : tensor.squeeze()
    logger.debug('Squeezed tensor shape:', squeezed.shape)
    
    // Ensure we have a 3D tensor [height, width, channels]
    if (squeezed.rank !== 3) {
      throw new Error(`Expected 3D tensor, got ${squeezed.rank}D. Shape: ${squeezed.shape}`)
    }
    
    const [height, width, channels] = squeezed.shape
    logger.debug(`Image dimensions: ${width}x${height}x${channels}`)
    
    if (channels !== 3 && channels !== 1) {
      throw new Error(`Expected 1 or 3 channels, got ${channels}`)
    }
    
    // Convert [-1, 1] to [0, 1] for tf.browser.toPixels
    normalized = squeezed.add(1).div(2).clipByValue(0, 1)
    
    // Debug: Check value range
    const minVal = await normalized.min().data()
    const maxVal = await normalized.max().data()
    logger.debug(`Normalized value range: [${minVal[0].toFixed(3)}, ${maxVal[0].toFixed(3)}]`)
    
    // Reasonable size limits for good quality while keeping files manageable
    const maxDimension = 1600 // Increased for better quality
    let finalWidth = width
    let finalHeight = height
    
    if (width > maxDimension || height > maxDimension) {
      const scale = Math.min(maxDimension / width, maxDimension / height)
      finalWidth = Math.round(width * scale)
      finalHeight = Math.round(height * scale)
      logger.debug(`Resizing from ${width}x${height} to ${finalWidth}x${finalHeight}`)
    }
    
    // Create canvas with limited dimensions
    const canvas = new OffscreenCanvas(finalWidth, finalHeight)
    logger.debug(`Created canvas: ${finalWidth}x${finalHeight}`)
    
    if (finalWidth !== width || finalHeight !== height) {
      // Need to resize the tensor
      const resized = tf.image.resizeBilinear(normalized, [finalHeight, finalWidth])
      await tf.browser.toPixels(resized, canvas)
      resized.dispose()
    } else {
      // Convert tensor to pixels - tf.browser.toPixels expects [0-1] range for float32
      await tf.browser.toPixels(normalized, canvas)
    }
    logger.debug('Tensor converted to canvas pixels')
    
    // Adaptive JPEG compression targeting 2-4MB files
    const targetMaxSize = 4 * 1024 * 1024 // 4MB target max
    const targetMinSize = 1.5 * 1024 * 1024 // 1.5MB target min
    
    // Start with high quality and adjust down if needed
    let quality = 0.95
    let blob = await canvas.convertToBlob({ 
      type: 'image/jpeg', 
      quality: quality
    })
    
    logger.debug(`Initial blob size: ${(blob.size / 1024 / 1024).toFixed(2)}MB at ${Math.round(quality * 100)}% quality`)
    
    // Iteratively reduce quality if file is too large
    while (blob.size > targetMaxSize && quality > 0.70) {
      quality -= 0.05
      blob = await canvas.convertToBlob({ 
        type: 'image/jpeg', 
        quality: quality
      })
      logger.debug(`Adjusted to ${(blob.size / 1024 / 1024).toFixed(2)}MB at ${Math.round(quality * 100)}% quality`)
    }
    
    // Final check for minimum quality threshold
    if (quality < 0.70) {
      logger.warn('Quality dropped below 70%, using minimum acceptable quality')
      blob = await canvas.convertToBlob({ 
        type: 'image/jpeg', 
        quality: 0.75 // Don't go below 75% for acceptable quality
      })
    }
    
    if (blob.size === 0) {
      throw new Error('Generated blob is empty')
    }
    
    logger.debug(`Final optimized size: ${(blob.size / 1024 / 1024).toFixed(2)}MB at ${Math.round(quality * 100)}% quality`)
    
    // Convert blob to data URL
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result
        logger.debug(`Generated data URL, length: ${result.length}`)
        
        // Validate data URL size (should be reasonable after compression)
        const maxDataURLSize = 8 * 1024 * 1024 // 8MB (data URLs are ~33% larger than blobs)
        if (result.length > maxDataURLSize) {
          logger.warn(`Data URL size: ${(result.length / 1024 / 1024).toFixed(2)}MB exceeds target but proceeding`)
          // Don't reject - just warn and proceed since we already compressed
        }
        
        // Ensure data URL is valid
        if (!result.startsWith('data:image/')) {
          reject(new Error('Invalid data URL format'))
          return
        }
        
        resolve(result)
      }
      reader.onerror = () => reject(new Error('Failed to read blob as data URL'))
      reader.readAsDataURL(blob)
    })
    
  } catch (error) {
    logger.warn('Primary tensor conversion failed, trying fallback:', error.message)
    
    // Try fallback method
    try {
      return await tensorToImageDataURLFallback(tensor)
    } catch (fallbackError) {
      logger.error('Both primary and fallback conversion failed:', fallbackError)
      throw new Error(`Failed to convert tensor to image: ${error.message}. Fallback also failed: ${fallbackError.message}`)
    }
  } finally {
    // Always cleanup tensors
    safeDispose(squeezed, normalized)
  }
}

// DRY: Shared processing utilities
function createProgressUpdater(taskId) {
  return (progress, status = null) => {
    self.postMessage({
      type: 'progress',
      taskId,
      progress: progress * 100,
      ...(status && { status })
    })
  }
}

function createProcessingResult(processedDataURL, faces, epsilon, iterations, protectionLevel) {
  return {
    processedDataURL,
    facesDetected: faces?.length || 0,
    epsilon,
    iterations,
    protectionLevel
  }
}

// Processing functions - now receive face data from main thread
async function processWithFawkes(data, taskId) {
  const { imageDataURL, fawkesEpsilon, faces } = data
  const progressUpdate = createProgressUpdater(taskId)
  let imageTensor, perturbation, adversarialTensor, clampedTensor
  
  try {
    progressUpdate(0.05)
    
    // Simple backend check
    if (!isBackendReady()) {
      throw new Error('Worker backend not ready for Fawkes processing')
    }
    
    progressUpdate(0.1)
    logMemoryUsage('Start Fawkes')
    
    // Convert image to tensor
    imageTensor = await imageDataURLToTensor(imageDataURL)
    progressUpdate(0.3)
    logMemoryUsage('Image converted')
    
    // Apply FGSM attack (model created fresh inside)
    const attack = new WorkerFGSMAttack(fawkesEpsilon)
    perturbation = await attack.generatePerturbation(imageTensor)
    progressUpdate(0.7)
    logMemoryUsage('Perturbation generated')
    
    // Apply perturbation
    adversarialTensor = tf.add(imageTensor, perturbation)
    clampedTensor = tf.clipByValue(adversarialTensor, -1, 1)
    progressUpdate(0.9)
    
    // Debug: Check final tensor before conversion
    logger.debug('Final tensor shape before conversion:', clampedTensor.shape)
    const finalMin = await clampedTensor.min().data()
    const finalMax = await clampedTensor.max().data()
    logger.debug(`Final tensor value range: [${finalMin[0].toFixed(3)}, ${finalMax[0].toFixed(3)}]`)
    
    // Convert back to image
    const resultDataURL = await tensorToImageDataURL(clampedTensor)
    
    // Verify result
    if (!resultDataURL || !resultDataURL.startsWith('data:image/')) {
      throw new Error('Invalid image data URL generated')
    }
    logger.debug('Successfully generated result data URL')
    
    progressUpdate(1.0)
    
    // Cleanup all resources (no need to dispose attack class - model disposed internally)
    safeDispose(imageTensor, perturbation, adversarialTensor, clampedTensor)
    await forceGarbageCollection()
    logMemoryUsage('Fawkes complete')
    
    const result = createProcessingResult(resultDataURL, faces, fawkesEpsilon, 1, 'medium')
    logger.debug('Fawkes result created:', {
      hasProcessedDataURL: !!result.processedDataURL,
      processedDataURLLength: result.processedDataURL?.length,
      processedDataURLPrefix: result.processedDataURL?.substring(0, 50)
    })
    return result
    
  } catch (error) {
    // Cleanup on error
    safeDispose(imageTensor, perturbation, adversarialTensor, clampedTensor)
    await forceGarbageCollection()
    
    logger.error('Fawkes processing error:', error)
    throw error
  }
}

async function processWithAdvCloak(data, taskId) {
  const { imageDataURL, advCloakEpsilon, advCloakIterations, faces } = data
  const progressUpdate = createProgressUpdater(taskId)
  let imageTensor, perturbation, adversarialTensor, clampedTensor
  
  try {
    progressUpdate(0.05)
    
    // Simple backend check
    if (!isBackendReady()) {
      throw new Error('Worker backend not ready for AdvCloak processing')
    }
    
    progressUpdate(0.1)
    logMemoryUsage('Start AdvCloak')
    
    // Convert image to tensor
    imageTensor = await imageDataURLToTensor(imageDataURL)
    progressUpdate(0.2)
    logMemoryUsage('Image converted')
    
    // Apply Iterative FGSM attack (model created fresh inside)
    const attack = new WorkerIterativeFGSMAttack(
      advCloakEpsilon, 
      advCloakIterations, 
      advCloakEpsilon / Math.max(advCloakIterations, 1) // Prevent division by zero
    )
    
    perturbation = await attack.generatePerturbation(
      imageTensor, 
      null, 
      (iterProgress) => progressUpdate(0.2 + iterProgress * 0.6)
    )
    
    progressUpdate(0.8)
    logMemoryUsage('Perturbation generated')
    
    // Apply perturbation
    adversarialTensor = tf.add(imageTensor, perturbation)
    clampedTensor = tf.clipByValue(adversarialTensor, -1, 1)
    progressUpdate(0.9)
    
    // Debug: Check final tensor before conversion
    logger.debug('Final tensor shape before conversion:', clampedTensor.shape)
    const finalMin = await clampedTensor.min().data()
    const finalMax = await clampedTensor.max().data()
    logger.debug(`Final tensor value range: [${finalMin[0].toFixed(3)}, ${finalMax[0].toFixed(3)}]`)
    
    // Convert back to image
    const resultDataURL = await tensorToImageDataURL(clampedTensor)
    
    // Verify result
    if (!resultDataURL || !resultDataURL.startsWith('data:image/')) {
      throw new Error('Invalid image data URL generated')
    }
    logger.debug('Successfully generated result data URL')
    
    progressUpdate(1.0)
    
    // Cleanup all resources (no need to dispose attack class - model disposed internally)
    safeDispose(imageTensor, perturbation, adversarialTensor, clampedTensor)
    await forceGarbageCollection()
    logMemoryUsage('AdvCloak complete')
    
    return createProcessingResult(resultDataURL, faces, advCloakEpsilon, advCloakIterations, 'high')
    
  } catch (error) {
    // Cleanup on error
    safeDispose(imageTensor, perturbation, adversarialTensor, clampedTensor)
    await forceGarbageCollection()
    
    logger.error('AdvCloak processing error:', error)
    throw error
  }
}

async function processWithBoth(data, taskId) {
  const { imageDataURL, fawkesEpsilon, advCloakEpsilon, advCloakIterations, faces } = data
  
  try {
    // Step 1: Fawkes
    self.postMessage({
      type: 'progress',
      taskId,
      progress: 0,
      status: 'Applying Fawkes protection...'
    })
    
    const fawkesResult = await processWithFawkes({
      imageDataURL,
      fawkesEpsilon,
      faces
    }, taskId)
    
    // Step 2: AdvCloak on Fawkes result
    self.postMessage({
      type: 'progress',
      taskId,
      progress: 50,
      status: 'Applying AdvCloak protection...'
    })
    
    const finalResult = await processWithAdvCloak({
      imageDataURL: fawkesResult.processedDataURL,
      advCloakEpsilon,
      advCloakIterations,
      faces
    }, taskId)
    
    return {
      ...finalResult,
      protectionLevel: 'maximum'
    }
    
  } catch (error) {
    logger.error('Combined processing error:', error)
    throw error
  }
}

// Message handler
self.onmessage = async function(e) {
  const { type, taskId, data } = e.data
  
  try {
    if (type === 'init') {
      await initializeWorker()
      self.postMessage({ type: 'initialized', taskId })
      return
    }
    
    if (!isInitialized) {
      throw new Error('Worker not initialized')
    }
    
    // Simple backend check before processing
    if (!isBackendReady()) {
      throw new Error('Worker backend not ready for processing')
    }
    
    let result
    
    switch (type) {
      case 'fawkes':
        result = await processWithFawkes(data, taskId)
        break
      case 'advcloak':
        result = await processWithAdvCloak(data, taskId)
        break
      case 'both':
        result = await processWithBoth(data, taskId)
        break
      default:
        throw new Error(`Unknown processing type: ${type}`)
    }
    
    logger.debug('Sending result to main thread:', {
      taskId,
      resultKeys: Object.keys(result),
      hasProcessedDataURL: !!result.processedDataURL,
      processedDataURLLength: result.processedDataURL?.length
    })
    
    self.postMessage({
      type: 'result',
      taskId,
      result
    })
    
  } catch (error) {
    logger.error('Worker processing error:', error)
    self.postMessage({
      type: 'error',
      taskId,
      error: error.message
    })
  }
}

// Handle worker errors
self.onerror = function(error) {
  logger.error('Worker global error:', error)
}

self.onunhandledrejection = function(event) {
  logger.error('Worker unhandled rejection:', event.reason)
} 