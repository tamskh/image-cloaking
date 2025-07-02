/**
 * Advanced Processing throttle utility to prevent browser freezing
 * Uses frame timing, memory pressure, and cooperative scheduling
 */

export class ProcessingThrottle {
  constructor() {
    this.frameTime = 16.67 // Target 60fps (16.67ms per frame)
    this.frameBudget = 8 // Use max 8ms per frame for processing
    this.lastFrameStart = 0
    this.frameCount = 0
    this.realFPS = 60
    this.memoryPressure = 0
    this.performanceGrade = 'good'
    this.isThrottling = false
    this.processingTime = 0
    this.yieldCount = 0
    
    // Frame timing tracking
    this.frameTimings = []
    this.maxFrameTimings = 30
    
    // Memory monitoring
    this.memoryBaseline = this.getMemoryUsage()
    this.memoryThreshold = this.memoryBaseline * 1.5 // 50% increase threshold
    
    // Start frame monitoring
    this.startFrameMonitoring()
  }

  // Start monitoring actual frame timing using requestAnimationFrame
  startFrameMonitoring() {
    let lastTime = performance.now()
    
    const frameCallback = (currentTime) => {
      const frameDelta = currentTime - lastTime
      this.frameTimings.push(frameDelta)
      
      // Keep only recent frame timings
      if (this.frameTimings.length > this.maxFrameTimings) {
        this.frameTimings.shift()
      }
      
      // Calculate real FPS from actual frame timing
      if (this.frameTimings.length > 5) {
        const avgFrameTime = this.frameTimings.reduce((a, b) => a + b, 0) / this.frameTimings.length
        this.realFPS = Math.min(60, 1000 / avgFrameTime)
        this.frameTime = avgFrameTime
        
        // Adjust frame budget based on actual performance
        this.frameBudget = Math.max(4, Math.min(12, avgFrameTime * 0.5))
      }
      
      lastTime = currentTime
      this.frameCount++
      
      // Update performance grade
      this.updatePerformanceGrade()
      
      // Continue monitoring
      requestAnimationFrame(frameCallback)
    }
    
    requestAnimationFrame(frameCallback)
  }

  // Update performance grade based on real metrics
  updatePerformanceGrade() {
    const memoryUsage = this.getMemoryUsage()
    this.memoryPressure = Math.max(0, (memoryUsage - this.memoryBaseline) / this.memoryBaseline)
    
    if (this.realFPS > 50 && this.memoryPressure < 0.3) {
      this.performanceGrade = 'excellent'
    } else if (this.realFPS > 40 && this.memoryPressure < 0.5) {
      this.performanceGrade = 'good'
    } else if (this.realFPS > 25 && this.memoryPressure < 0.8) {
      this.performanceGrade = 'fair'
    } else {
      this.performanceGrade = 'poor'
    }
  }

  // Check if we should yield based on frame budget and processing time
  shouldYield(processingStartTime = null) {
    const now = performance.now()
    
    if (processingStartTime) {
      this.processingTime = now - processingStartTime
    }
    
    // Always yield if we've exceeded frame budget
    if (this.processingTime >= this.frameBudget) {
      this.isThrottling = true
      return true
    }
    
    // Yield if performance is poor
    if (this.performanceGrade === 'poor') {
      this.isThrottling = true
      return true
    }
    
    // Yield if memory pressure is high
    if (this.memoryPressure > 0.7) {
      this.isThrottling = true
      return true
    }
    
    // Yield if frame rate is dropping
    if (this.realFPS < 30) {
      this.isThrottling = true
      return true
    }
    
    return false
  }

  // Advanced yielding with multiple strategies
  async yield(priority = 'normal') {
    this.yieldCount++
    this.processingTime = 0 // Reset processing time after yield
    
    return new Promise(resolve => {
      const yieldTime = this.calculateYieldTime(priority)
      
      // Strategy 1: Use scheduler.postTask if available (Chrome 94+)
      if (typeof scheduler !== 'undefined' && scheduler.postTask) {
        const taskPriority = priority === 'high' ? 'user-blocking' : 
                            priority === 'low' ? 'background' : 'user-visible'
        
        scheduler.postTask(() => resolve(), { priority: taskPriority })
        return
      }
      
      // Strategy 2: Use requestIdleCallback with proper timeout
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => resolve(), { 
          timeout: yieldTime 
        })
        return
      }
      
      // Strategy 3: Use MessageChannel for immediate yielding
      if (yieldTime === 0) {
        const channel = new MessageChannel()
        channel.port2.onmessage = () => resolve()
        channel.port1.postMessage(null)
        return
      }
      
      // Strategy 4: Fallback to setTimeout
      setTimeout(resolve, yieldTime)
    })
  }

  // Calculate yield time based on current performance and priority
  calculateYieldTime(priority = 'normal') {
    const baseTime = this.getBaseYieldTime()
    
    // Adjust based on priority
    const priorityMultiplier = {
      'high': 0.5,
      'normal': 1.0,
      'low': 1.5
    }[priority] || 1.0
    
    // Adjust based on memory pressure
    const memoryMultiplier = 1 + Math.min(this.memoryPressure, 1.0)
    
    return Math.floor(baseTime * priorityMultiplier * memoryMultiplier)
  }

  // Get base yield time based on performance grade
  getBaseYieldTime() {
    switch (this.performanceGrade) {
      case 'excellent': return 0  // Immediate yield
      case 'good': return 1
      case 'fair': return 5
      case 'poor': return 16      // Full frame yield
      default: return 5
    }
  }

  // Get memory usage with better fallbacks
  getMemoryUsage() {
    if (typeof performance !== 'undefined' && performance.memory) {
      return performance.memory.usedJSHeapSize
    }
    
    // Estimate based on other factors
    if (typeof navigator !== 'undefined' && navigator.deviceMemory) {
      return navigator.deviceMemory * 1024 * 1024 * 0.1 // Rough estimate
    }
    
    return 100 * 1024 * 1024 // Default 100MB estimate
  }

  // Get comprehensive performance statistics
  getStats() {
    return {
      realFPS: Math.round(this.realFPS * 10) / 10,
      frameTime: Math.round(this.frameTime * 10) / 10,
      frameBudget: this.frameBudget,
      processingTime: this.processingTime,
      memoryPressure: Math.round(this.memoryPressure * 100) / 100,
      memoryUsage: Math.round(this.getMemoryUsage() / 1024 / 1024),
      performanceGrade: this.performanceGrade,
      isThrottling: this.isThrottling,
      frameCount: this.frameCount,
      yieldCount: this.yieldCount
    }
  }

  // Reset all statistics
  reset() {
    this.frameCount = 0
    this.yieldCount = 0
    this.processingTime = 0
    this.isThrottling = false
    this.frameTimings = []
    this.memoryBaseline = this.getMemoryUsage()
  }
}

// Global throttle instance
export const globalThrottle = new ProcessingThrottle()

// Advanced chunked processing with time-based scheduling
export async function processInChunks(
  array, 
  chunkProcessor, 
  options = {}
) {
  const {
    initialChunkSize = 10,
    maxChunkSize = 100,
    minChunkSize = 1,
    progressCallback = null,
    throttle = globalThrottle,
    priority = 'normal'
  } = options

  const results = []
  const totalItems = array.length
  let processedItems = 0
  let adaptiveChunkSize = initialChunkSize
  
  for (let i = 0; i < array.length; i += adaptiveChunkSize) {
    const processingStart = performance.now()
    const chunk = array.slice(i, i + adaptiveChunkSize)
    
    // Process the chunk
    const chunkResults = await chunkProcessor(chunk, i)
    results.push(...chunkResults)
    
    processedItems += chunk.length
    const processingTime = performance.now() - processingStart
    
    // Adaptive chunk sizing based on processing time
    if (processingTime < throttle.frameBudget * 0.5) {
      // Processing was fast, increase chunk size
      adaptiveChunkSize = Math.min(maxChunkSize, Math.ceil(adaptiveChunkSize * 1.2))
    } else if (processingTime > throttle.frameBudget * 0.8) {
      // Processing was slow, decrease chunk size
      adaptiveChunkSize = Math.max(minChunkSize, Math.ceil(adaptiveChunkSize * 0.8))
    }
    
    // Update progress
    if (progressCallback) {
      const progress = (processedItems / totalItems) * 100
      progressCallback(progress)
    }
    
    // Check if we should yield
    if (throttle.shouldYield(processingStart)) {
      await throttle.yield(priority)
    }
  }
  
  return results
}

// Specialized processing for tensor operations with memory management
export async function processTensorInBatches(
  tensorData,
  batchProcessor,
  options = {}
) {
  const {
    batchSize = 1000,
    progressCallback = null,
    memoryCleanup = null,
    throttle = globalThrottle
  } = options

  const results = []
  const totalBatches = Math.ceil(tensorData.length / batchSize)
  
  for (let i = 0; i < totalBatches; i++) {
    const processingStart = performance.now()
    const startIdx = i * batchSize
    const endIdx = Math.min(startIdx + batchSize, tensorData.length)
    const batch = tensorData.slice(startIdx, endIdx)
    
    // Process batch
    const batchResult = await batchProcessor(batch, i)
    results.push(batchResult)
    
    // Memory cleanup if provided
    if (memoryCleanup) {
      memoryCleanup()
    }
    
    // Progress update
    if (progressCallback) {
      const progress = ((i + 1) / totalBatches) * 100
      progressCallback(progress)
    }
    
    // Always yield after tensor operations to prevent blocking
    if (throttle.shouldYield(processingStart) || throttle.memoryPressure > 0.5) {
      await throttle.yield('normal')
    }
  }
  
  return results
}

// React hook for using processing throttle
export function useProcessingThrottle() {
  const throttle = globalThrottle
  
  return {
    throttle,
    stats: throttle.getStats(),
    shouldYield: throttle.shouldYield.bind(throttle),
    yield: throttle.yield.bind(throttle),
    processInChunks: (array, processor, options) => 
      processInChunks(array, processor, { ...options, throttle }),
    processTensorInBatches: (tensorData, processor, options) =>
      processTensorInBatches(tensorData, processor, { ...options, throttle })
  }
} 