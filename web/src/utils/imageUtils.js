/**
 * Image utility functions for the web application
 */

import { createLogger } from './logger'

const logger = createLogger('ImageUtils')

// Convert data URL to blob for downloading
export function dataURLToBlob(dataURL) {
  const parts = dataURL.split(',')
  const byteString = atob(parts[1])
  const mimeString = parts[0].split(':')[1].split(';')[0]
  
  const arrayBuffer = new ArrayBuffer(byteString.length)
  const uint8Array = new Uint8Array(arrayBuffer)
  
  for (let i = 0; i < byteString.length; i++) {
    uint8Array[i] = byteString.charCodeAt(i)
  }
  
  return new Blob([arrayBuffer], { type: mimeString })
}

// Download image from data URL
export function downloadImage(dataURL, filename) {
  const blob = dataURLToBlob(dataURL)
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
}

// Get image data from data URL
export function getImageDataFromDataURL(dataURL) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      resolve(imageData)
    }
    
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = dataURL
  })
}

// Convert ImageData to data URL
export function imageDataToDataURL(imageData) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  
  canvas.width = imageData.width
  canvas.height = imageData.height
  ctx.putImageData(imageData, 0, 0)
  
  return canvas.toDataURL('image/png')
}

// Calculate PSNR between two images
function calculatePSNR(original, processed) {
  const { data: origData } = original
  const { data: procData } = processed
  
  if (origData.length !== procData.length) {
    throw new Error('Images must have the same dimensions')
  }
  
  let mse = 0
  const numPixels = origData.length / 4 // RGBA channels
  
  for (let i = 0; i < origData.length; i += 4) {
    // Calculate MSE for RGB channels (ignore alpha)
    const rDiff = origData[i] - procData[i]
    const gDiff = origData[i + 1] - procData[i + 1]
    const bDiff = origData[i + 2] - procData[i + 2]
    
    mse += (rDiff * rDiff + gDiff * gDiff + bDiff * bDiff) / 3
  }
  
  mse /= numPixels
  
  if (mse === 0) return Infinity
  
  const maxPixelValue = 255
  return 20 * Math.log10(maxPixelValue / Math.sqrt(mse))
}

// Calculate SSIM (simplified version)
function calculateSSIM(original, processed) {
  const { data: origData, width, height } = original
  const { data: procData } = processed
  
  // Simplified SSIM calculation for RGB
  const c1 = 6.5025 // (0.01 * 255)^2
  const c2 = 58.5225 // (0.03 * 255)^2
  
  let sumX = 0, sumY = 0, sumXX = 0, sumYY = 0, sumXY = 0
  const numPixels = width * height
  
  for (let i = 0; i < origData.length; i += 4) {
    // Convert to grayscale using luminance formula
    const x = 0.299 * origData[i] + 0.587 * origData[i + 1] + 0.114 * origData[i + 2]
    const y = 0.299 * procData[i] + 0.587 * procData[i + 1] + 0.114 * procData[i + 2]
    
    sumX += x
    sumY += y
    sumXX += x * x
    sumYY += y * y
    sumXY += x * y
  }
  
  const meanX = sumX / numPixels
  const meanY = sumY / numPixels
  const varX = (sumXX / numPixels) - (meanX * meanX)
  const varY = (sumYY / numPixels) - (meanY * meanY)
  const covXY = (sumXY / numPixels) - (meanX * meanY)
  
  const numerator = (2 * meanX * meanY + c1) * (2 * covXY + c2)
  const denominator = (meanX * meanX + meanY * meanY + c1) * (varX + varY + c2)
  
  return numerator / denominator
}

// Calculate MSE
function calculateMSE(original, processed) {
  const { data: origData } = original
  const { data: procData } = processed
  
  let mse = 0
  const numPixels = origData.length / 4
  
  for (let i = 0; i < origData.length; i += 4) {
    const rDiff = origData[i] - procData[i]
    const gDiff = origData[i + 1] - procData[i + 1]
    const bDiff = origData[i + 2] - procData[i + 2]
    
    mse += (rDiff * rDiff + gDiff * gDiff + bDiff * bDiff) / 3
  }
  
  return mse / numPixels
}

// Calculate perceptual distance (simplified LAB distance)
function calculatePerceptualDistance(original, processed) {
  const { data: origData } = original
  const { data: procData } = processed
  
  let totalDistance = 0
  const numPixels = origData.length / 4
  
  for (let i = 0; i < origData.length; i += 4) {
    // Simple RGB distance as approximation
    const rDiff = origData[i] - procData[i]
    const gDiff = origData[i + 1] - procData[i + 1]
    const bDiff = origData[i + 2] - procData[i + 2]
    
    totalDistance += Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff)
  }
  
  return totalDistance / numPixels
}

// Main function to calculate all image metrics
export async function calculateImageMetrics(originalDataURL, processedDataURL) {
  try {
    const [originalImageData, processedImageData] = await Promise.all([
      getImageDataFromDataURL(originalDataURL),
      getImageDataFromDataURL(processedDataURL)
    ])
    
    // Ensure images have the same dimensions
    if (originalImageData.width !== processedImageData.width || 
        originalImageData.height !== processedImageData.height) {
      throw new Error('Images must have the same dimensions for comparison')
    }
    
    const metrics = {
      psnr: calculatePSNR(originalImageData, processedImageData),
      ssim: calculateSSIM(originalImageData, processedImageData),
      mse: calculateMSE(originalImageData, processedImageData),
      perceptual_distance: calculatePerceptualDistance(originalImageData, processedImageData)
    }
    
    return metrics
  } catch (error) {
    logger.error('Error calculating metrics:', error)
    return {
      psnr: null,
      ssim: null,
      mse: null,
      perceptual_distance: null
    }
  }
}

// Resize image while maintaining aspect ratio
export function resizeImage(imageData, maxWidth = 1024, maxHeight = 1024) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  
  const { width, height } = imageData
  
  // Calculate new dimensions
  let newWidth = width
  let newHeight = height
  
  if (width > maxWidth || height > maxHeight) {
    const aspectRatio = width / height
    
    if (width > height) {
      newWidth = maxWidth
      newHeight = Math.round(maxWidth / aspectRatio)
    } else {
      newHeight = maxHeight
      newWidth = Math.round(maxHeight * aspectRatio)
    }
  }
  
  // Set canvas size
  canvas.width = newWidth
  canvas.height = newHeight
  
  // Create temporary canvas for original image
  const tempCanvas = document.createElement('canvas')
  const tempCtx = tempCanvas.getContext('2d')
  tempCanvas.width = width
  tempCanvas.height = height
  tempCtx.putImageData(imageData, 0, 0)
  
  // Draw resized image
  ctx.drawImage(tempCanvas, 0, 0, width, height, 0, 0, newWidth, newHeight)
  
  return ctx.getImageData(0, 0, newWidth, newHeight)
} 