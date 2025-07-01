/**
 * Processing throttle utility to prevent browser freezing
 * Dynamically adjusts processing based on device performance
 */

export class ProcessingThrottle {
  constructor() {
    this.lastFrameTime = performance.now()
    this.frameCount = 0
    this.averageFPS = 60
    this.performanceHistory = []
    this.isThrottling = false
  }

  // Check if we should yield control to the main thread
  shouldYield(forceCheck = false) {
    const now = performance.now()
    const deltaTime = now - this.lastFrameTime
    
    // Calculate current FPS
    if (deltaTime > 0) {
      const currentFPS = 1000 / deltaTime
      this.frameCount++
      
      // Update average FPS (exponential moving average)
      this.averageFPS = this.averageFPS * 0.9 + currentFPS * 0.1
      
      // Track performance over time
      this.performanceHistory.push({
        timestamp: now,
        fps: currentFPS,
        memory: this.getMemoryUsage()
      })
      
      // Keep only last 50 measurements
      if (this.performanceHistory.length > 50) {
        this.performanceHistory.shift()
      }
    }
    
    this.lastFrameTime = now
    
    // Yield if FPS is too low or if forced
    const shouldYield = forceCheck || this.averageFPS < 30 || deltaTime > 33 // 30 FPS threshold
    
    if (shouldYield) {
      this.isThrottling = true
    }
    
    return shouldYield
  }

  // Yield control with appropriate delay based on performance
  async yield() {
    return new Promise(resolve => {
      const delay = this.calculateYieldDelay()
      
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(resolve, { timeout: delay })
      } else {
        setTimeout(resolve, delay)
      }
      
      this.isThrottling = false
    })
  }

  // Calculate appropriate yield delay based on current performance
  calculateYieldDelay() {
    if (this.averageFPS > 45) {
      return 0 // No delay needed
    } else if (this.averageFPS > 30) {
      return 1 // Minimal delay
    } else if (this.averageFPS > 20) {
      return 5 // Short delay
    } else {
      return 10 // Longer delay for very poor performance
    }
  }

  // Get memory usage if available
  getMemoryUsage() {
    if (typeof performance !== 'undefined' && performance.memory) {
      return performance.memory.usedJSHeapSize
    }
    return 0
  }

  // Get performance statistics
  getStats() {
    return {
      averageFPS: this.averageFPS,
      isThrottling: this.isThrottling,
      frameCount: this.frameCount,
      memoryUsage: this.getMemoryUsage(),
      performanceGrade: this.getPerformanceGrade()
    }
  }

  // Classify current performance
  getPerformanceGrade() {
    if (this.averageFPS > 45) return 'excellent'
    if (this.averageFPS > 30) return 'good'
    if (this.averageFPS > 20) return 'fair'
    return 'poor'
  }

  // Reset statistics
  reset() {
    this.frameCount = 0
    this.performanceHistory = []
    this.averageFPS = 60
    this.isThrottling = false
    this.lastFrameTime = performance.now()
  }
}

// Global throttle instance
export const globalThrottle = new ProcessingThrottle()

// Utility function for chunked processing with automatic yielding
export async function processInChunks(
  array, 
  chunkSize, 
  processingFunction, 
  progressCallback = null,
  throttle = globalThrottle
) {
  const results = []
  const totalItems = array.length
  let processedItems = 0
  
  for (let i = 0; i < array.length; i += chunkSize) {
    const chunk = array.slice(i, i + chunkSize)
    
    // Process the chunk
    const chunkResults = await processingFunction(chunk, i)
    results.push(...chunkResults)
    
    processedItems += chunk.length
    
    // Update progress
    if (progressCallback) {
      const progress = (processedItems / totalItems) * 100
      progressCallback(progress)
    }
    
    // Check if we should yield
    if (throttle.shouldYield()) {
      await throttle.yield()
    }
  }
  
  return results
}

// Utility for processing large image data arrays with yielding
export async function processImageDataInChunks(
  imageData,
  processingFunction,
  chunkSize = 1000,
  progressCallback = null
) {
  const { data, width, height } = imageData
  const totalPixels = width * height
  const newData = new Uint8ClampedArray(data)
  
  let processedPixels = 0
  const throttle = new ProcessingThrottle()
  
  for (let pixelIndex = 0; pixelIndex < totalPixels; pixelIndex += chunkSize) {
    const endIndex = Math.min(pixelIndex + chunkSize, totalPixels)
    
    // Process chunk of pixels
    for (let i = pixelIndex; i < endIndex; i++) {
      const dataIndex = i * 4
      const x = i % width
      const y = Math.floor(i / width)
      
      // Apply processing function to this pixel
      processingFunction(newData, dataIndex, x, y, width, height)
    }
    
    processedPixels = endIndex
    
    // Update progress
    if (progressCallback) {
      const progress = (processedPixels / totalPixels) * 100
      progressCallback(progress)
    }
    
    // Yield control if needed
    if (throttle.shouldYield()) {
      await throttle.yield()
    }
  }
  
  return new ImageData(newData, width, height)
}

// Smart delay function that adapts to system performance
export async function smartDelay(baseDelay = 1) {
  const stats = globalThrottle.getStats()
  
  let adaptiveDelay = baseDelay
  
  // Increase delay if performance is poor
  switch (stats.performanceGrade) {
    case 'poor':
      adaptiveDelay = baseDelay * 4
      break
    case 'fair':
      adaptiveDelay = baseDelay * 2
      break
    case 'good':
      adaptiveDelay = baseDelay * 1.2
      break
    case 'excellent':
      adaptiveDelay = baseDelay * 0.5
      break
  }
  
  return new Promise(resolve => setTimeout(resolve, adaptiveDelay))
}

// Performance monitoring for React components
export function useProcessingThrottle() {
  const [throttleStats, setThrottleStats] = useState(globalThrottle.getStats())
  
  const updateStats = useCallback(() => {
    setThrottleStats(globalThrottle.getStats())
  }, [])
  
  const startMonitoring = useCallback(() => {
    const interval = setInterval(updateStats, 1000) // Update every second
    return () => clearInterval(interval)
  }, [updateStats])
  
  const resetThrottle = useCallback(() => {
    globalThrottle.reset()
    updateStats()
  }, [updateStats])
  
  return {
    throttleStats,
    startMonitoring,
    resetThrottle,
    updateStats
  }
}

// React hook import at top level (this is required for the hooks above)
import { useState, useCallback } from 'react' 