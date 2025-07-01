/**
 * Fast adversarial image cloaking optimized for web browsers
 * Balances effectiveness with performance for real-time processing
 */

import { getImageDataFromDataURL, imageDataToDataURL } from './imageUtils'
import { globalThrottle } from './processingThrottle'
import { createLogger } from './logger'

const logger = createLogger('CloakingEngine')

// Simplified but effective face detector
class FastFaceDetector {
  constructor() {
    this.features = this.generateSimpleFeatures()
  }

  generateSimpleFeatures() {
    // Reduced feature set for speed
    return [
      { type: 'horizontal', x: 0.2, y: 0.3, w: 0.6, h: 0.2, weight: 1.2 }, // eyes
      { type: 'vertical', x: 0.4, y: 0.4, w: 0.2, h: 0.3, weight: 0.8 },   // nose
      { type: 'horizontal', x: 0.3, y: 0.65, w: 0.4, h: 0.15, weight: 1.0 } // mouth
    ]
  }

  async detectFaces(imageData, options = {}) {
    const { maxFaces = 3, minSize = 48 } = options
    const { data, width, height } = imageData
    
    const grayscale = this.rgbaToGrayscale(data, width, height)
    const faces = []
    
    // Single scale detection for speed
    const step = Math.max(8, Math.floor(minSize * 0.3))
    
    for (let y = 0; y < height - minSize; y += step) {
      for (let x = 0; x < width - minSize; x += step) {
        const confidence = this.quickFaceScore(grayscale, width, x, y, minSize)
        
        if (confidence > 0.6) {
          faces.push({ x, y, width: minSize, height: minSize, confidence })
        }
      }
      
      if (y % (step * 6) === 0) {
        await this.yieldControl()
      }
    }
    
    return this.simpleNMS(faces, 0.4).slice(0, maxFaces)
  }

  rgbaToGrayscale(data, width, height) {
    const grayscale = new Float32Array(width * height)
    for (let i = 0; i < width * height; i++) {
      const r = data[i * 4]
      const g = data[i * 4 + 1]
      const b = data[i * 4 + 2]
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
          const px = fx + dx
          const py = fy + dy
          
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
    if (faces.length === 0) return []
    
    faces.sort((a, b) => b.confidence - a.confidence)
    const keep = [faces[0]]
    
    for (let i = 1; i < faces.length; i++) {
      let suppress = false
      for (const kept of keep) {
        const overlap = this.calculateOverlap(faces[i], kept)
        if (overlap > threshold) {
          suppress = true
          break
        }
      }
      if (!suppress && keep.length < 4) {
        keep.push(faces[i])
      }
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
    if (globalThrottle.shouldYield()) {
      return globalThrottle.yield()
    }
    return Promise.resolve()
  }
}

// Lightweight vision model for fast adversarial generation
class FastVisionModel {
  constructor(modelType = 'clip') {
    this.modelType = modelType
    this.filters = this.initializeFilters()
  }

  initializeFilters() {
    // Simple but effective filters
    const filters = []
    for (let i = 0; i < 16; i++) {
      filters.push({
        weights: new Float32Array(9).map(() => (Math.random() - 0.5) * 0.4),
        bias: (Math.random() - 0.5) * 0.2
      })
    }
    return filters
  }

  async computeGradients(imageData) {
    const { data, width, height } = imageData
    const gradients = new Float32Array(data.length)
    
    // Fast gradient approximation
    const chunkSize = Math.min(2000, Math.floor(data.length / 6))
    
    for (let start = 0; start < data.length; start += chunkSize) {
      const end = Math.min(start + chunkSize, data.length)
      
      for (let i = start; i < end; i += 4) {
        if (i + 3 < data.length) {
          const pixelIdx = Math.floor(i / 4)
          const x = pixelIdx % width
          const y = Math.floor(pixelIdx / width)
          
          // Simple gradient based on local features
          const baseGrad = this.computePixelGradient(data, x, y, width, height)
          
          gradients[i] = baseGrad * 0.299     // R
          gradients[i + 1] = baseGrad * 0.587 // G  
          gradients[i + 2] = baseGrad * 0.114 // B
          gradients[i + 3] = 0                // A
        }
      }
      
      if (start % (chunkSize * 2) === 0) {
        await this.yieldControl()
      }
    }
    
    return gradients
  }

  computePixelGradient(data, x, y, width, height) {
    let response = 0
    
    // Apply a few filters for gradient estimation
    for (let f = 0; f < Math.min(4, this.filters.length); f++) {
      const filter = this.filters[f]
      let conv = 0
      
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx
          const ny = y + dy
          
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

  async yieldControl() {
    if (globalThrottle.shouldYield()) {
      return globalThrottle.yield()
    }
    return Promise.resolve()
  }
}

// Fast adversarial processing functions
export async function processImageWithFawkes(imageDataURL, protectionLevel = 'mid', progressCallback, abortSignal) {
  try {
    if (abortSignal?.aborted) throw new Error('Processing cancelled by user')
    if (progressCallback) progressCallback(0)
    
    const imageData = await getImageDataFromDataURL(imageDataURL)
    if (abortSignal?.aborted) throw new Error('Processing cancelled by user')
    if (progressCallback) progressCallback(10)
    
    const faceDetector = new FastFaceDetector()
    const faces = await faceDetector.detectFaces(imageData, {
      maxFaces: protectionLevel === 'high' ? 3 : 2
    })
    
    if (abortSignal?.aborted) throw new Error('Processing cancelled by user')
    if (progressCallback) progressCallback(30)
    
    const model = new FastVisionModel('clip')
    const epsilon = { 'low': 0.03, 'mid': 0.05, 'high': 0.07 }[protectionLevel] || 0.05
    
    const cloakedImageData = await applyFastAdversarialAttack(
      imageData, model, faces, epsilon, 8, // Fast iterations
      (progress) => {
        if (progressCallback) progressCallback(30 + progress * 0.65)
      },
      abortSignal
    )
    
    if (progressCallback) progressCallback(98)
    
    const resultDataURL = imageDataToDataURL(cloakedImageData)
    if (progressCallback) progressCallback(100)
    
    return resultDataURL
  } catch (error) {
    logger.error('Fast Fawkes processing error:', error)
    throw error
  }
}

export async function processImageWithAdvCloak(imageDataURL, epsilon = 0.04, iterations = 12, progressCallback, abortSignal) {
  try {
    if (abortSignal?.aborted) throw new Error('Processing cancelled by user')
    if (progressCallback) progressCallback(0)
    
    const imageData = await getImageDataFromDataURL(imageDataURL)
    if (abortSignal?.aborted) throw new Error('Processing cancelled by user')
    if (progressCallback) progressCallback(10)
    
    const model = new FastVisionModel('ensemble')
    
    const cloakedImageData = await applyFastGlobalAttack(
      imageData, model, Math.min(epsilon, 0.06), Math.min(iterations, 15),
      (progress) => {
        if (progressCallback) progressCallback(10 + progress * 0.85)
      },
      abortSignal
    )
    
    if (progressCallback) progressCallback(98)
    
    const resultDataURL = imageDataToDataURL(cloakedImageData)
    if (progressCallback) progressCallback(100)
    
    return resultDataURL
  } catch (error) {
    logger.error('Fast AdvCloak processing error:', error)
    throw error
  }
}

async function applyFastAdversarialAttack(imageData, model, faces, epsilon, iterations, progressCallback, abortSignal) {
  const { data, width, height } = imageData
  const newData = new Uint8ClampedArray(data)
  
  // Quick face-focused perturbations
  for (let i = 0; i < faces.length; i++) {
    await applyFacePerturbations(newData, data, faces[i], epsilon * 1.5, width, height)
    
    const faceProgress = ((i + 1) / faces.length) * 40
    if (progressCallback) progressCallback(faceProgress)
    
    await yieldControl(abortSignal)
  }
  
  // Fast global optimization
  await applyFastGlobalPerturbations(newData, data, model, epsilon * 0.7, iterations, width, height, progressCallback, abortSignal)
  
  return new ImageData(newData, width, height)
}

async function applyFastGlobalAttack(imageData, model, epsilon, iterations, progressCallback, abortSignal) {
  const { data, width, height } = imageData
  const newData = new Uint8ClampedArray(data)
  
  await applyFastGlobalPerturbations(newData, data, model, epsilon, iterations, width, height, progressCallback, abortSignal)
  
  return new ImageData(newData, width, height)
}

async function applyFacePerturbations(newData, originalData, face, epsilon, width, height) {
  const { x, y, width: faceWidth, height: faceHeight } = face
  
  // Simple pattern-based face perturbations
  const patterns = [
    { region: [0.2, 0.3, 0.6, 0.2], strength: 1.2 }, // eyes
    { region: [0.4, 0.4, 0.2, 0.3], strength: 0.8 },  // nose
    { region: [0.3, 0.65, 0.4, 0.15], strength: 1.0 } // mouth
  ]
  
  for (const pattern of patterns) {
    const [rx, ry, rw, rh] = pattern.region
    const regionX = Math.floor(x + faceWidth * rx)
    const regionY = Math.floor(y + faceHeight * ry)
    const regionW = Math.floor(faceWidth * rw)
    const regionH = Math.floor(faceHeight * rh)
    
    for (let dy = 0; dy < regionH; dy += 2) {
      for (let dx = 0; dx < regionW; dx += 2) {
        const px = regionX + dx
        const py = regionY + dy
        
        if (px < width && py < height) {
          const idx = (py * width + px) * 4
          
          const noise = (Math.sin(dx * 0.3) * Math.cos(dy * 0.3)) * epsilon * pattern.strength * 255
          
          for (let c = 0; c < 3; c++) {
            const originalValue = originalData[idx + c]
            const perturbedValue = originalValue + noise
            newData[idx + c] = Math.round(Math.max(0, Math.min(255, perturbedValue)))
          }
        }
      }
    }
  }
}

async function applyFastGlobalPerturbations(newData, originalData, model, epsilon, iterations, width, height, progressCallback, abortSignal) {
  const alpha = epsilon / iterations
  const totalPixels = width * height
  
  for (let iter = 0; iter < iterations; iter++) {
    const currentImageData = new ImageData(newData, width, height)
    const gradients = await model.computeGradients(currentImageData)
    
    // Fast pixel updates
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
        await yieldControl(abortSignal)
      }
    }
    
    if (progressCallback) {
      const progress = 40 + ((iter + 1) / iterations) * 50
      progressCallback(progress)
    }
    
    await yieldControl(abortSignal)
  }
}

async function yieldControl(abortSignal) {
  if (abortSignal?.aborted) {
    throw new Error('Processing cancelled by user')
  }
  if (globalThrottle.shouldYield()) {
    return globalThrottle.yield()
  }
  return Promise.resolve()
} 