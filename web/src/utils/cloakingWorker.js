/**
 * Self-contained Web Worker for fast image cloaking
 * Embeds optimized algorithms to avoid import issues
 */

import { createLogger } from './logger'

const logger = createLogger('CloakingWorker')

// Self-contained cloaking implementation for worker
class WorkerFaceDetector {
  constructor() {
    this.features = [
      { type: 'horizontal', x: 0.2, y: 0.3, w: 0.6, h: 0.2, weight: 1.2 },
      { type: 'vertical', x: 0.4, y: 0.4, w: 0.2, h: 0.3, weight: 0.8 },
      { type: 'horizontal', x: 0.3, y: 0.65, w: 0.4, h: 0.15, weight: 1.0 }
    ]
  }

  async detectFaces(imageData, options = {}) {
    const { maxFaces = 3, minSize = 48 } = options
    const { data, width, height } = imageData
    
    const grayscale = this.rgbaToGrayscale(data, width, height)
    const faces = []
    const step = Math.max(8, Math.floor(minSize * 0.3))
    
    for (let y = 0; y < height - minSize; y += step) {
      for (let x = 0; x < width - minSize; x += step) {
        const confidence = this.quickFaceScore(grayscale, width, x, y, minSize)
        if (confidence > 0.6) {
          faces.push({ x, y, width: minSize, height: minSize, confidence })
        }
      }
      if (y % (step * 6) === 0) await this.yieldControl()
    }
    
    return this.simpleNMS(faces, 0.4).slice(0, maxFaces)
  }

  rgbaToGrayscale(data, width, height) {
    const grayscale = new Float32Array(width * height)
    for (let i = 0; i < width * height; i++) {
      const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2]
      grayscale[i] = (r * 0.299 + g * 0.587 + b * 0.114) / 255.0
    }
    return grayscale
  }

  quickFaceScore(grayscale, width, x, y, size) {
    let score = 0
    for (const feature of this.features) {
      const fx = Math.floor(x + feature.x * size)
      const fy = Math.floor(y + feature.y * size)
      const fw = Math.floor(feature.w * size)
      const fh = Math.floor(feature.h * size)
      
      let sum1 = 0, sum2 = 0, count1 = 0, count2 = 0
      
      for (let dy = 0; dy < fh; dy += 2) {
        for (let dx = 0; dx < fw; dx += 2) {
          const px = fx + dx, py = fy + dy
          if (px < width && py < grayscale.length / width) {
            const value = grayscale[py * width + px]
            if (feature.type === 'horizontal') {
              if (dy < fh / 2) { sum1 += value; count1++ }
              else { sum2 += value; count2++ }
            } else {
              if (dx < fw / 2) { sum1 += value; count1++ }
              else { sum2 += value; count2++ }
            }
          }
        }
      }
      
      const avg1 = count1 > 0 ? sum1 / count1 : 0
      const avg2 = count2 > 0 ? sum2 / count2 : 0
      score += Math.abs(avg1 - avg2) * feature.weight
    }
    return Math.min(1.0, score / this.features.length)
  }

  simpleNMS(faces, threshold) {
    if (!faces.length) return []
    faces.sort((a, b) => b.confidence - a.confidence)
    const keep = [faces[0]]
    
    for (let i = 1; i < faces.length; i++) {
      let suppress = false
      for (const kept of keep) {
        if (this.calculateOverlap(faces[i], kept) > threshold) {
          suppress = true
          break
        }
      }
      if (!suppress && keep.length < 4) keep.push(faces[i])
    }
    return keep
  }

  calculateOverlap(rect1, rect2) {
    const x1 = Math.max(rect1.x, rect2.x)
    const y1 = Math.max(rect1.y, rect2.y)
    const x2 = Math.min(rect1.x + rect1.width, rect2.x + rect2.width)
    const y2 = Math.min(rect1.y + rect1.height, rect2.y + rect2.height)
    
    if (x2 <= x1 || y2 <= y1) return 0
    const intersection = (x2 - x1) * (y2 - y1)
    const union = rect1.width * rect1.height + rect2.width * rect2.height - intersection
    return intersection / union
  }

  async yieldControl() {
    return new Promise(resolve => setTimeout(resolve, 0))
  }
}

class WorkerVisionModel {
  constructor() {
    this.filters = Array.from({ length: 16 }, () => ({
      weights: new Float32Array(9).map(() => (Math.random() - 0.5) * 0.4),
      bias: (Math.random() - 0.5) * 0.2
    }))
  }

  async computeGradients(imageData) {
    const { data, width, height } = imageData
    const gradients = new Float32Array(data.length)
    const chunkSize = Math.min(2000, Math.floor(data.length / 6))
    
    for (let start = 0; start < data.length; start += chunkSize) {
      const end = Math.min(start + chunkSize, data.length)
      
      for (let i = start; i < end; i += 4) {
        if (i + 3 < data.length) {
          const pixelIdx = Math.floor(i / 4)
          const x = pixelIdx % width
          const y = Math.floor(pixelIdx / width)
          const baseGrad = this.computePixelGradient(data, x, y, width, height)
          
          gradients[i] = baseGrad * 0.299
          gradients[i + 1] = baseGrad * 0.587
          gradients[i + 2] = baseGrad * 0.114
          gradients[i + 3] = 0
        }
      }
      
      if (start % (chunkSize * 2) === 0) {
        await new Promise(resolve => setTimeout(resolve, 0))
      }
    }
    return gradients
  }

  computePixelGradient(data, x, y, width, height) {
    let response = 0
    for (let f = 0; f < Math.min(4, this.filters.length); f++) {
      const filter = this.filters[f]
      let conv = 0
      
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const idx = (ny * width + nx) * 4
            const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / (3 * 255)
            conv += gray * filter.weights[(dy + 1) * 3 + (dx + 1)]
          }
        }
      }
      response += Math.tanh(conv + filter.bias)
    }
    return response / 4
  }
}

// Image utilities for worker
function getImageDataFromDataURL(dataURL) {
  return new Promise((resolve, reject) => {
    if (!dataURL || typeof dataURL !== 'string') {
      reject(new Error('Invalid data URL'))
      return
    }

    try {
      if (typeof OffscreenCanvas !== 'undefined') {
        // Modern approach with OffscreenCanvas
        fetch(dataURL)
          .then(response => response.blob())
          .then(blob => createImageBitmap(blob))
          .then(imageBitmap => {
            const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height)
            const ctx = canvas.getContext('2d')
            ctx.drawImage(imageBitmap, 0, 0)
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            resolve(imageData)
          })
          .catch(reject)
      } else {
        reject(new Error('OffscreenCanvas not supported'))
      }
    } catch (error) {
      reject(error)
    }
  })
}

function imageDataToDataURL(imageData) {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(imageData.width, imageData.height)
    const ctx = canvas.getContext('2d')
    ctx.putImageData(imageData, 0, 0)
    return canvas.convertToBlob({ type: 'image/png' })
      .then(blob => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.onerror = reject
          reader.readAsDataURL(blob)
        })
      })
  }
  throw new Error('OffscreenCanvas not supported')
}

// Core processing functions
async function processImageWithFawkes(imageDataURL, protectionLevel, progressCallback) {
  try {
    progressCallback?.(5)
    const imageData = await getImageDataFromDataURL(imageDataURL)
    progressCallback?.(15)

    const faceDetector = new WorkerFaceDetector()
    const faces = await faceDetector.detectFaces(imageData, { maxFaces: 3 })
    progressCallback?.(35)

    const model = new WorkerVisionModel()
    const epsilon = { 'low': 0.03, 'mid': 0.05, 'high': 0.07 }[protectionLevel] || 0.05

    const result = await applyFastAdversarialAttack(imageData, model, faces, epsilon, 8, progressCallback)
    progressCallback?.(95)

    const resultDataURL = await imageDataToDataURL(result)
    progressCallback?.(100)

    return resultDataURL
  } catch (error) {
    logger.error(`Fawkes processing failed: ${error.message}`)
    throw new Error(`Fawkes processing failed: ${error.message}`)
  }
}

async function processImageWithAdvCloak(imageDataURL, epsilon, iterations, progressCallback) {
  try {
    progressCallback?.(5)
    const imageData = await getImageDataFromDataURL(imageDataURL)
    progressCallback?.(15)

    const model = new WorkerVisionModel()
    const result = await applyFastGlobalAttack(imageData, model, epsilon, iterations, progressCallback)
    progressCallback?.(95)

    const resultDataURL = await imageDataToDataURL(result)
    progressCallback?.(100)

    return resultDataURL
  } catch (error) {
    logger.error(`AdvCloak processing failed: ${error.message}`)
    throw new Error(`AdvCloak processing failed: ${error.message}`)
  }
}

async function applyFastAdversarialAttack(imageData, model, faces, epsilon, iterations, progressCallback) {
  const { data, width, height } = imageData
  const newData = new Uint8ClampedArray(data)

  // Face-focused perturbations
  for (let i = 0; i < faces.length; i++) {
    await applyFacePerturbations(newData, data, faces[i], epsilon * 1.5, width, height)
    progressCallback?.(40 + (i / faces.length) * 30)
  }

  // Global perturbations
  await applyFastGlobalPerturbations(newData, data, model, epsilon * 0.7, iterations, width, height, progressCallback)

  return new ImageData(newData, width, height)
}

async function applyFastGlobalAttack(imageData, model, epsilon, iterations, progressCallback) {
  const { data, width, height } = imageData
  const newData = new Uint8ClampedArray(data)
  
  await applyFastGlobalPerturbations(newData, data, model, epsilon, iterations, width, height, progressCallback)
  
  return new ImageData(newData, width, height)
}

async function applyFacePerturbations(newData, originalData, face, epsilon, width, height) {
  const { x, y, width: faceWidth, height: faceHeight } = face
  const patterns = [
    { region: [0.2, 0.3, 0.6, 0.2], strength: 1.2 },
    { region: [0.4, 0.4, 0.2, 0.3], strength: 0.8 },
    { region: [0.3, 0.65, 0.4, 0.15], strength: 1.0 }
  ]

  for (const pattern of patterns) {
    const [rx, ry, rw, rh] = pattern.region
    const regionX = Math.floor(x + faceWidth * rx)
    const regionY = Math.floor(y + faceHeight * ry)
    const regionW = Math.floor(faceWidth * rw)
    const regionH = Math.floor(faceHeight * rh)

    for (let dy = 0; dy < regionH; dy += 2) {
      for (let dx = 0; dx < regionW; dx += 2) {
        const px = regionX + dx, py = regionY + dy
        if (px < width && py < height) {
          const idx = (py * width + px) * 4
          const noise = (Math.sin(dx * 0.3) * Math.cos(dy * 0.3)) * epsilon * pattern.strength * 255

          for (let c = 0; c < 3; c++) {
            const perturbedValue = originalData[idx + c] + noise
            newData[idx + c] = Math.round(Math.max(0, Math.min(255, perturbedValue)))
          }
        }
      }
    }
  }
}

async function applyFastGlobalPerturbations(newData, originalData, model, epsilon, iterations, width, height, progressCallback) {
  const alpha = epsilon / iterations
  const totalPixels = width * height

  for (let iter = 0; iter < iterations; iter++) {
    const currentImageData = new ImageData(newData, width, height)
    const gradients = await model.computeGradients(currentImageData)

    const chunkSize = Math.min(4000, Math.floor(totalPixels / 8))

    for (let start = 0; start < totalPixels; start += chunkSize) {
      const end = Math.min(start + chunkSize, totalPixels)

      for (let pixelIdx = start; pixelIdx < end; pixelIdx++) {
        const dataIdx = pixelIdx * 4

        for (let c = 0; c < 3; c++) {
          const gradIdx = dataIdx + c
          const grad = gradients[gradIdx]

          const originalValue = originalData[dataIdx + c] / 255.0
          let currentValue = newData[dataIdx + c] / 255.0

          currentValue += alpha * Math.sign(grad)

          const diff = currentValue - originalValue
          if (Math.abs(diff) > epsilon) {
            currentValue = originalValue + epsilon * Math.sign(diff)
          }

          newData[dataIdx + c] = Math.round(Math.max(0, Math.min(255, currentValue * 255)))
        }
      }

      if (start % (chunkSize * 3) === 0) {
        await new Promise(resolve => setTimeout(resolve, 0))
      }
    }

    if (progressCallback) {
      const progress = 70 + ((iter + 1) / iterations) * 25
      progressCallback(progress)
    }

    await new Promise(resolve => setTimeout(resolve, 0))
  }
}

// Worker message handler
self.onmessage = async function(e) {
  const { type, data, taskId } = e.data
  const startTime = Date.now()
  
  try {
    self.postMessage({ type: 'STATUS', taskId, status: 'Worker processing started...' })

    let result
    switch (type) {
      case 'PROCESS_FAWKES':
        result = await processWithFawkes(data, taskId, startTime)
        break
      case 'PROCESS_ADVCLOAK':
        result = await processWithAdvCloak(data, taskId, startTime)
        break
      case 'PROCESS_BOTH':
        result = await processWithBoth(data, taskId, startTime)
        break
      case 'HEALTH_CHECK':
        self.postMessage({ type: 'WORKER_READY', taskId })
        return
      default:
        throw new Error(`Unknown task type: ${type}`)
    }

    self.postMessage({
      type: 'COMPLETE',
      taskId,
      result
    })
  } catch (error) {
    logger.error('Worker error:', error)
    self.postMessage({
      type: 'WORKER_ERROR',
      taskId,
      error: error.message
    })
  }
}

async function processWithFawkes(data, taskId, startTime) {
  const { imageDataURL, protectionLevel } = data
  
  const progressCallback = (progress) => {
    self.postMessage({ type: 'PROGRESS', taskId, progress })
  }

  const result = await processImageWithFawkes(imageDataURL, protectionLevel, progressCallback)
  
  return {
    imageDataURL: result,
    method: 'fawkes',
    processingTime: Date.now() - startTime
  }
}

async function processWithAdvCloak(data, taskId, startTime) {
  const { imageDataURL, epsilon, iterations } = data
  
  const progressCallback = (progress) => {
    self.postMessage({ type: 'PROGRESS', taskId, progress })
  }

  const safeEpsilon = Math.min(epsilon || 0.05, 0.08)
  const safeIterations = Math.min(iterations || 15, 20)

  const result = await processImageWithAdvCloak(imageDataURL, safeEpsilon, safeIterations, progressCallback)
  
  return {
    imageDataURL: result,
    method: 'advcloak',
    processingTime: Date.now() - startTime
  }
}

async function processWithBoth(data, taskId, startTime) {
  const { imageDataURL, fawkesLevel, advCloakEpsilon, advCloakIterations } = data
  
  const progressCallback = (progress) => {
    self.postMessage({ type: 'PROGRESS', taskId, progress })
  }

  // Step 1: Fawkes
  self.postMessage({ type: 'STATUS', taskId, status: 'Step 1/2: Applying Fawkes protection...' })
  const fawkesResult = await processImageWithFawkes(
    imageDataURL, 
    fawkesLevel,
    (p) => progressCallback(p * 0.5)
  )

  // Step 2: AdvCloak
  self.postMessage({ type: 'STATUS', taskId, status: 'Step 2/2: Applying AdvCloak protection...' })
  const safeEpsilon = Math.min(advCloakEpsilon || 0.05, 0.06)
  const safeIterations = Math.min(advCloakIterations || 12, 15)
  
  const finalResult = await processImageWithAdvCloak(
    fawkesResult,
    safeEpsilon,
    safeIterations,
    (p) => progressCallback(50 + p * 0.5)
  )

  return {
    imageDataURL: finalResult,
    method: 'both',
    processingTime: Date.now() - startTime
  }
}

// Worker cleanup and error recovery
self.addEventListener('error', (error) => {
  logger.error('Worker uncaught error:', error)
  self.postMessage({
    type: 'WORKER_ERROR',
    error: error.message,
    filename: error.filename,
    lineno: error.lineno
  })
})

self.addEventListener('unhandledrejection', (event) => {
  logger.error('Worker unhandled promise rejection:', event.reason)
  event.preventDefault()
  self.postMessage({
    type: 'WORKER_ERROR',
    error: event.reason.message || 'Unhandled promise rejection',
    stack: event.reason.stack
  })
})

// Periodic memory cleanup (every 30 seconds)
setInterval(() => {
  if (self.gc && typeof self.gc === 'function') {
    self.gc()
  }
}, 30000)

// Worker initialization check
self.postMessage({
  type: 'WORKER_READY',
  timestamp: Date.now()
}) 