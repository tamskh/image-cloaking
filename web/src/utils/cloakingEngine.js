/**
 * TensorFlow.js-based adversarial image cloaking for privacy protection
 * Uses MediaPipe face detection and TensorFlow.js for gradient-based adversarial attacks
 */

import * as tf from '@tensorflow/tfjs'
import '@tensorflow/tfjs-backend-webgl'
import '@tensorflow/tfjs-backend-cpu'
import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision'
import { createLogger } from './logger'
import { globalThrottle } from './processingThrottle'

const logger = createLogger('CloakingEngine')

// Initialize TensorFlow.js
let tfInitialized = false
let faceDetector = null
let isInitializing = false

async function initializeTensorFlow() {
  if (tfInitialized) return
  if (isInitializing) {
    // Wait for initialization to complete
    while (isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    return
  }
  
  isInitializing = true
  
  try {
    // Set backend preference (WebGL for GPU acceleration, CPU as fallback)
    await tf.setBackend('webgl')
    await tf.ready()
    
    logger.info('TensorFlow.js initialized with WebGL backend')
    tfInitialized = true
  } catch (error) {
    logger.warn('WebGL backend failed, falling back to CPU:', error)
    try {
      await tf.setBackend('cpu')
      await tf.ready()
      logger.info('TensorFlow.js initialized with CPU backend')
      tfInitialized = true
    } catch (cpuError) {
      logger.error('Failed to initialize TensorFlow.js:', cpuError)
      throw new Error('TensorFlow.js initialization failed')
    }
  } finally {
    isInitializing = false
  }
}

async function initializeFaceDetector() {
  if (faceDetector) return faceDetector
  
  try {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    )
    
    faceDetector = await FaceDetector.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite'
      },
      runningMode: 'IMAGE',
      minDetectionConfidence: 0.5,
      minSuppressionThreshold: 0.3
    })
    
    logger.info('MediaPipe face detector initialized')
    return faceDetector
  } catch (error) {
    logger.error('Failed to initialize face detector:', error)
    throw new Error('Face detector initialization failed')
  }
}

// Fast Gradient Sign Method (FGSM) attack
class FGSMAttack {
  constructor(epsilon = 0.03) {
    this.epsilon = epsilon
  }
  
  async generatePerturbation(imageTensor, targetClass = null) {
    let model = null
    let perturbation = null
    
    try {
      // Create a simple surrogate model for gradient calculation
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
      logger.error(`FGSM perturbation generation failed: ${error.message}`)
      
      // Cleanup on error
      if (model) model.dispose()
      if (perturbation) perturbation.dispose()
      
      // Try CPU fallback if WebGL failed
      if (error.message.includes('texture') || error.message.includes('WebGL')) {
        logger.info('Falling back to CPU backend for FGSM attack')
        return this.generatePerturbationCPU(imageTensor, targetClass)
      }
      
      throw error
    } finally {
      if (model) model.dispose()
    }
  }
  
  // CPU fallback for large images that exceed WebGL limits
  async generatePerturbationCPU(imageTensor, targetClass = null) {
    const originalBackend = tf.getBackend()
    
    try {
      // Switch to CPU backend
      await tf.setBackend('cpu')
      await tf.ready()
      
      // Create simpler model for CPU processing
      const model = this.createSimpleCPUModel(imageTensor.shape.slice(1))
      
      const lossGradFn = tf.grad(input => {
        const pred = model.predict(input)
        const trueClass = tf.argMax(pred, 1)
        const target = tf.oneHot(trueClass, pred.shape[1])
        return tf.losses.softmaxCrossEntropy(target, pred)
      })
      
      const gradients = lossGradFn(imageTensor)
      const signGradients = tf.sign(gradients)
      const perturbation = tf.mul(signGradients, this.epsilon)
      
      // Cleanup
      gradients.dispose()
      signGradients.dispose()
      model.dispose()
      
      return perturbation
      
    } finally {
      // Restore original backend
      if (originalBackend !== 'cpu') {
        try {
          await tf.setBackend(originalBackend)
          await tf.ready()
        } catch (backendError) {
          logger.warn(`Failed to restore ${originalBackend} backend:`, backendError)
        }
      }
    }
  }
  
  // Simplified model for CPU processing
  createSimpleCPUModel(inputShape) {
    return tf.sequential({
      layers: [
        tf.layers.flatten({ inputShape: inputShape }),
        tf.layers.dense({ units: 32, activation: 'relu' }),
        tf.layers.dense({ units: 10, activation: 'softmax' })
      ]
    })
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
        logger.info(`Using minimal surrogate model for large image: ${width}×${height}`)
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
      
      logger.debug(`Surrogate model created: ${filters1}-${filters2}-${filters3} filters, ${kernelSize1}×${kernelSize2} kernels`)
      return model
    } catch (error) {
      logger.error('Failed to create surrogate model:', error)
      throw new Error('Model creation failed: ' + error.message)
    }
  }
}

// Iterative FGSM (I-FGSM) attack
class IterativeFGSMAttack extends FGSMAttack {
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
    
    // Async iteration with throttling and memory management
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
          progressCallback((i + 1) / this.iterations * 100)
        }
        
        // Memory management and yielding - match worker behavior
        if (i % 5 === 0) { // Every 5 iterations
          // Check memory usage
          const memInfo = tf.memory()
          if (memInfo.numBytes > 800 * 1024 * 1024) { // > 800MB - same as worker
            logger.warn(`High memory usage: ${Math.round(memInfo.numBytes / 1024 / 1024)}MB, forcing cleanup`)
            // Force garbage collection instead of manual tensor disposal
            if (typeof gc !== 'undefined') {
              gc()
            }
          }
        }
        
        // Yield control if needed to prevent browser freezing
        if (globalThrottle.shouldYield(iterationStart)) {
          await globalThrottle.yield('normal')
        }
        
      } catch (error) {
        // Cleanup on iteration error
        if (i > 0 && prevAdversarial) {
          prevAdversarial.dispose()
        }
        
        // Try CPU fallback if WebGL fails mid-iteration
        if (error.message.includes('texture') || error.message.includes('WebGL')) {
          logger.warn(`WebGL error at iteration ${i + 1}, falling back to CPU`)
          if (adversarialImage) adversarialImage.dispose()
          if (model) model.dispose()
          throw new Error('FALLBACK_TO_CPU')
        }
        
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
  
  // CPU fallback for iterative attacks when WebGL fails
  async generatePerturbationCPU(imageTensor, targetClass = null, progressCallback = null) {
    const originalBackend = tf.getBackend()
    
    try {
      // Switch to CPU backend
      await tf.setBackend('cpu')
      await tf.ready()
      
      // Create simpler model for CPU processing
      const model = this.createSimpleCPUModel(imageTensor.shape.slice(1))
      
      let adversarialImage = tf.clone(imageTensor)
      
      const lossGradFn = tf.grad(input => {
        const pred = model.predict(input)
        const trueClass = tf.argMax(pred, 1)
        const target = tf.oneHot(trueClass, pred.shape[1])
        return tf.losses.softmaxCrossEntropy(target, pred)
      })
      
      // Reduced iterations for CPU
      const cpuIterations = Math.min(this.iterations, 5)
      
      for (let i = 0; i < cpuIterations; i++) {
        const prevAdversarial = adversarialImage
        
        const gradients = lossGradFn(adversarialImage)
        const signGradients = tf.sign(gradients)
        const step = tf.mul(signGradients, this.stepSize)
        
        const tentativeAdversarial = tf.add(adversarialImage, step)
        const perturbation = tf.sub(tentativeAdversarial, imageTensor)
        const clippedPerturbation = tf.clipByValue(perturbation, -this.epsilon, this.epsilon)
        const clippedAdversarial = tf.add(imageTensor, clippedPerturbation)
        
        adversarialImage = tf.clipByValue(clippedAdversarial, -1, 1)
        
        // Cleanup
        if (i > 0) prevAdversarial.dispose()
        gradients.dispose()
        signGradients.dispose()
        step.dispose()
        tentativeAdversarial.dispose()
        perturbation.dispose()
        clippedPerturbation.dispose()
        clippedAdversarial.dispose()
        
        if (progressCallback) {
          progressCallback((i + 1) / cpuIterations * 100)
        }
      }
      
      const finalPerturbation = tf.sub(adversarialImage, imageTensor)
      
      // Cleanup
      adversarialImage.dispose()
      model.dispose()
      
      return finalPerturbation
      
    } finally {
      // Restore original backend
      if (originalBackend !== 'cpu') {
        try {
          await tf.setBackend(originalBackend)
          await tf.ready()
        } catch (backendError) {
          logger.warn(`Failed to restore ${originalBackend} backend:`, backendError)
        }
      }
    }
  }
}

// Main processing functions
export async function processImageWithFawkes(imageDataURL, protectionLevel = 'mid', progressCallback, abortSignal) {
  await initializeTensorFlow()
  
  if (abortSignal?.aborted) {
    throw new Error('Operation aborted')
  }
  
  try {
    progressCallback?.(10)
    
    // Convert image to tensor
    const imageTensor = await imageDataURLToTensor(imageDataURL)
    progressCallback?.(20)
    
    // Detect faces
    const faces = await detectFaces(imageDataURL)
    progressCallback?.(40)
    
    if (faces.length === 0) {
      throw new Error('No faces detected in the image. Fawkes protection requires faces to be present.')
    }
    
    // Apply adversarial perturbations based on protection level
    let epsilon, iterations
    switch (protectionLevel) {
      case 'low':
        epsilon = 0.02
        iterations = 5
        break
      case 'mid':
        epsilon = 0.03
        iterations = 10
        break
      case 'high':
        epsilon = 0.05
        iterations = 15
        break
      default:
        epsilon = 0.03
        iterations = 10
    }
    
    // Apply adversarial perturbations with fallback handling
    let perturbation
    try {
      const attack = new IterativeFGSMAttack(epsilon, iterations)
      perturbation = await attack.generatePerturbation(
        imageTensor,
        null,
        (iterProgress) => progressCallback?.(40 + iterProgress * 0.5)
      )
    } catch (error) {
      if (error.message === 'FALLBACK_TO_CPU' || error.message.includes('texture') || error.message.includes('WebGL')) {
        logger.info('WebGL failed, trying CPU approach for Fawkes')
        
        // Try CPU-based iterative approach first
        try {
          const cpuAttack = new IterativeFGSMAttack(epsilon, Math.min(iterations, 5)) // Reduced iterations
          perturbation = await cpuAttack.generatePerturbationCPU(
            imageTensor,
            null,
            (iterProgress) => progressCallback?.(40 + iterProgress * 0.5)
          )
        } catch (cpuError) {
          // If CPU iterative fails, fall back to simple FGSM
          logger.info('CPU iterative failed, using simple FGSM')
          const simpleCpuAttack = new FGSMAttack(epsilon * 0.7)
          perturbation = await simpleCpuAttack.generatePerturbationCPU(imageTensor)
          progressCallback?.(90)
        }
      } else {
        throw error
      }
    }
    
    // Apply perturbation with explicit bounds checking
    const adversarialTensor = tf.add(imageTensor, perturbation)
    const clippedTensor = tf.clipByValue(adversarialTensor, -1, 1)
    
    // Debug: Verify tensor range before conversion
    const minVal = await clippedTensor.min().data()
    const maxVal = await clippedTensor.max().data()
    logger.debug(`Tensor range before conversion: [${minVal[0].toFixed(3)}, ${maxVal[0].toFixed(3)}]`)
    
    // Convert back to image data URL
    const resultDataURL = await tensorToImageDataURL(clippedTensor)
    progressCallback?.(100)
    
    // Cleanup
    imageTensor.dispose()
    perturbation.dispose()
    adversarialTensor.dispose()
    clippedTensor.dispose()
    
    return {
      originalDataURL: imageDataURL,
      processedDataURL: resultDataURL,
      method: 'fawkes',
      protectionLevel,
      facesDetected: faces.length,
      epsilon,
      iterations
    }
    
  } catch (error) {
    logger.error('Fawkes processing failed:', error)
    throw error
  }
}

export async function processImageWithAdvCloak(imageDataURL, epsilon = 0.04, iterations = 12, progressCallback, abortSignal) {
  await initializeTensorFlow()
  
  if (abortSignal?.aborted) {
    throw new Error('Operation aborted')
  }
  
  try {
    progressCallback?.(10)
    
    const imageTensor = await imageDataURLToTensor(imageDataURL)
    progressCallback?.(20)
    
    // AdvCloak works on any image, not just faces
    const faces = await detectFaces(imageDataURL)
    progressCallback?.(30)
    
    // Use FGSM attack for AdvCloak with fallback handling
    let perturbation
    try {
      const attack = new FGSMAttack(epsilon)
      perturbation = await attack.generatePerturbation(imageTensor)
      progressCallback?.(70)
    } catch (error) {
      if (error.message === 'FALLBACK_TO_CPU' || error.message.includes('texture') || error.message.includes('WebGL')) {
        logger.info('WebGL failed, trying CPU backend for AdvCloak')
        
        // Try with simpler CPU-based approach
        const cpuAttack = new FGSMAttack(epsilon * 0.5) // Reduce epsilon for CPU
        perturbation = await cpuAttack.generatePerturbationCPU(imageTensor)
        progressCallback?.(70)
      } else {
        throw error
      }
    }
    
    const adversarialTensor = tf.add(imageTensor, perturbation)
    const clippedTensor = tf.clipByValue(adversarialTensor, -1, 1)
    
    // Debug: Verify tensor range before conversion
    const minVal = await clippedTensor.min().data()
    const maxVal = await clippedTensor.max().data()
    logger.debug(`AdvCloak tensor range before conversion: [${minVal[0].toFixed(3)}, ${maxVal[0].toFixed(3)}]`)
    
    const resultDataURL = await tensorToImageDataURL(clippedTensor)
    progressCallback?.(100)
    
    // Cleanup
    imageTensor.dispose()
    perturbation.dispose()
    adversarialTensor.dispose()
    clippedTensor.dispose()
    
    return {
      originalDataURL: imageDataURL,
      processedDataURL: resultDataURL,
      method: 'advcloak',
      epsilon,
      iterations,
      facesDetected: faces.length
    }
    
  } catch (error) {
    logger.error('AdvCloak processing failed:', error)
    throw error
  }
}

// Face detection using MediaPipe - exported for worker communication
export async function detectFaces(imageDataURL) {
  const detector = await initializeFaceDetector()
  
  try {
    // Create image element for MediaPipe
    const img = new Image()
    img.src = imageDataURL
    
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
    })
    
    // Detect faces
    const detections = detector.detect(img)
    
    return detections.detections.map(detection => ({
      x: detection.boundingBox.originX,
      y: detection.boundingBox.originY,
      width: detection.boundingBox.width,
      height: detection.boundingBox.height,
      confidence: detection.categories[0]?.score || 0,
      keypoints: detection.keypoints?.map(kp => ({ x: kp.x, y: kp.y })) || []
    }))
    
  } catch (error) {
    logger.error('Face detection failed:', error)
    return []
  }
}

// Utility functions for tensor/image conversion
async function imageDataURLToTensor(dataURL) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        
        const originalWidth = img.width
        const originalHeight = img.height
        
        // More conservative limits to prevent conv2d intermediate tensor overflow
        const maxDimension = 2048 // Reduced to prevent conv2d texture overflow
        const maxPixels = 2048 * 2048 // Max 4MP to prevent memory issues
        
        let finalWidth = originalWidth
        let finalHeight = originalHeight
        
        // Check if resizing is needed
        const totalPixels = originalWidth * originalHeight
        if (originalWidth > maxDimension || originalHeight > maxDimension || totalPixels > maxPixels) {
          // Calculate scale to fit both dimension and pixel constraints
          const dimensionScale = Math.min(maxDimension / originalWidth, maxDimension / originalHeight)
          const pixelScale = Math.sqrt(maxPixels / totalPixels)
          const scale = Math.min(dimensionScale, pixelScale)
          
          finalWidth = Math.round(originalWidth * scale)
          finalHeight = Math.round(originalHeight * scale)
          
          logger.info(`Resizing image from ${originalWidth}×${originalHeight} to ${finalWidth}×${finalHeight} to prevent WebGL texture overflow`)
        }
        
        canvas.width = finalWidth
        canvas.height = finalHeight
        
        // Draw with resizing if necessary
        ctx.drawImage(img, 0, 0, originalWidth, originalHeight, 0, 0, finalWidth, finalHeight)
        
        // Convert to tensor and normalize to [-1, 1]
        const tensor = tf.browser.fromPixels(canvas)
          .expandDims(0)
          .toFloat()
          .div(255.0)    // First normalize to [0, 1]
          .mul(2.0)      // Scale to [0, 2]
          .sub(1.0)      // Shift to [-1, 1]
        
        // Verify the tensor is in expected range
        const minVal = tf.min(tensor).dataSync()[0]
        const maxVal = tf.max(tensor).dataSync()[0]
        logger.debug(`Input tensor range: [${minVal.toFixed(3)}, ${maxVal.toFixed(3)}], shape: ${tensor.shape}`)
        
        if (minVal < -1.1 || maxVal > 1.1) {
          logger.warn(`Tensor values outside expected [-1, 1] range: [${minVal}, ${maxVal}]`)
          const clippedTensor = tf.clipByValue(tensor, -1, 1)
          tensor.dispose()
          resolve(clippedTensor)
        } else {
          resolve(tensor)
        }
      } catch (error) {
        logger.error('Failed to convert image to tensor:', error)
        reject(new Error('Image to tensor conversion failed: ' + error.message))
      }
    }
    img.onerror = (error) => {
      logger.error('Failed to load image:', error)
      reject(new Error('Failed to load image for processing'))
    }
    img.src = dataURL
  })
}

async function tensorToImageDataURL(tensor) {
  try {
    // Ensure tensor is properly clipped to [-1, 1] range first
    const clippedTensor = tf.clipByValue(tensor, -1, 1)
    
    // Denormalize from [-1, 1] to [0, 1] for tf.browser.toPixels
    const denormalized = clippedTensor.add(1.0).div(2.0).clipByValue(0, 1)
    
    // Remove batch dimension and get original dimensions
    const squeezed = denormalized.squeeze()
    const [height, width, channels] = squeezed.shape
    
    // Convert to canvas with original dimensions
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    
    // tf.browser.toPixels expects values in [0, 1] and will scale to [0, 255] internally
    await tf.browser.toPixels(squeezed, canvas)
    
    // Use higher quality JPEG compression to preserve quality
    // Start with high quality and only reduce if file is too large
    let quality = 0.95
    let dataURL = canvas.toDataURL('image/jpeg', quality)
    
    // If file is very large (>5MB as base64), reduce quality slightly
    const sizeEstimate = dataURL.length * 0.75 / 1024 / 1024 // Rough MB estimate
    if (sizeEstimate > 5) {
      quality = 0.85
      dataURL = canvas.toDataURL('image/jpeg', quality)
    }
    
    logger.debug(`Image converted: ${width}x${height}, estimated size: ${sizeEstimate.toFixed(2)}MB, quality: ${Math.round(quality * 100)}%`)
    
    // Cleanup
    clippedTensor.dispose()
    denormalized.dispose()
    squeezed.dispose()
    
    return dataURL
    
  } catch (error) {
    logger.error('Tensor to image conversion failed:', error)
    throw new Error('Failed to convert tensor to image: ' + error.message)
  }
}

// Memory cleanup utility
export function cleanup() {
  tf.disposeVariables()
  if (faceDetector) {
    faceDetector.close?.()
    faceDetector = null
  }
  logger.info('TensorFlow.js resources cleaned up')
} 