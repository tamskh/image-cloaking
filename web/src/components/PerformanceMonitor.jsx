/**
 * Performance monitoring component for image cloaking
 * Shows real-time performance stats and processing recommendations
 */
import { useState, useEffect } from 'react'

export function PerformanceMonitor({ throttleStats, isProcessing }) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  if (!throttleStats) return null

  const getPerformanceColor = (grade) => {
    switch (grade) {
      case 'excellent': return 'text-green-600'
      case 'good': return 'text-blue-600'
      case 'fair': return 'text-yellow-600'
      case 'poor': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getPerformanceIcon = (grade) => {
    switch (grade) {
      case 'excellent': return '🚀'
      case 'good': return '✅'
      case 'fair': return '⚠️'
      case 'poor': return '🔥'
      default: return '❓'
    }
  }

  const getRecommendation = (grade) => {
    switch (grade) {
      case 'excellent':
        return 'Performance is excellent! You can use maximum quality settings.'
      case 'good':
        return 'Good performance. Standard settings work well.'
      case 'fair':
        return 'Moderate performance. Consider using lower iterations or enabling Web Worker.'
      case 'poor':
        return 'Performance is limited. Use Web Worker and reduce image size or iterations.'
      default:
        return 'Monitoring performance...'
    }
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs font-mono">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <span>Performance Monitor</span>
          <span className={getPerformanceColor(throttleStats.performanceGrade)}>
            {getPerformanceIcon(throttleStats.performanceGrade)} {throttleStats.performanceGrade}
          </span>
          {throttleStats.isThrottling && (
            <span className="bg-yellow-100 text-yellow-800 px-1 py-0.5 rounded text-xs">
              THROTTLING
            </span>
          )}
        </div>
        <button className="text-gray-400 hover:text-gray-600">
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>
      
      {isExpanded && (
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1">
          <div>FPS: <span className={getPerformanceColor(throttleStats.performanceGrade)}>
            {throttleStats.realFPS}
          </span></div>
          <div>Frame Time: {throttleStats.frameTime}ms</div>
          
          <div>Frame Budget: {throttleStats.frameBudget}ms</div>
          <div>Processing Time: {throttleStats.processingTime}ms</div>
          
          <div>Memory: {throttleStats.memoryUsage}MB</div>
          <div>Memory Pressure: {(throttleStats.memoryPressure * 100).toFixed(1)}%</div>
          
          <div>Frames: {throttleStats.frameCount}</div>
          <div>Yields: <span className="text-blue-600">{throttleStats.yieldCount}</span></div>
        </div>
      )}
      
      {/* Visual indicators */}
      <div className="mt-2 flex gap-1">
        {/* FPS indicator */}
        <div className="flex-1 h-1 bg-gray-200 rounded">
          <div 
            className={`h-full rounded transition-all duration-300 ${
              throttleStats.realFPS > 50 ? 'bg-green-500' :
              throttleStats.realFPS > 40 ? 'bg-blue-500' :
              throttleStats.realFPS > 25 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(100, (throttleStats.realFPS / 60) * 100)}%` }}
          />
        </div>
        
        {/* Memory pressure indicator */}
        <div className="flex-1 h-1 bg-gray-200 rounded">
          <div 
            className={`h-full rounded transition-all duration-300 ${
              throttleStats.memoryPressure < 0.3 ? 'bg-green-500' :
              throttleStats.memoryPressure < 0.5 ? 'bg-blue-500' :
              throttleStats.memoryPressure < 0.8 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(100, throttleStats.memoryPressure * 100)}%` }}
          />
        </div>
        
        {/* Processing load indicator */}
        <div className="flex-1 h-1 bg-gray-200 rounded">
          <div 
            className={`h-full rounded transition-all duration-300 ${
              throttleStats.processingTime < throttleStats.frameBudget * 0.5 ? 'bg-green-500' :
              throttleStats.processingTime < throttleStats.frameBudget * 0.8 ? 'bg-blue-500' :
              throttleStats.processingTime < throttleStats.frameBudget ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ 
              width: `${Math.min(100, (throttleStats.processingTime / throttleStats.frameBudget) * 100)}%` 
            }}
          />
        </div>
      </div>
      
      {/* Legend for visual indicators */}
      {isExpanded && (
        <div className="mt-1 flex justify-between text-xs text-gray-500">
          <span>FPS</span>
          <span>Memory</span>
          <span>CPU Load</span>
        </div>
      )}
      
      {/* Anti-freeze status */}
      {isProcessing && (
        <div className="mt-2 flex items-center gap-1 text-xs">
          <div className={`w-2 h-2 rounded-full ${
            throttleStats.isThrottling ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'
          }`} />
          <span className="text-gray-600">
            {throttleStats.isThrottling 
              ? `Anti-freeze active (${throttleStats.yieldCount} yields)`
              : 'Processing smoothly'
            }
          </span>
        </div>
      )}

      {/* Performance recommendation */}
      {isExpanded && (
        <div className="mt-3 p-2 bg-blue-50 rounded border-l-2 border-blue-400">
          <p className="text-xs text-blue-800">
            💡 {getRecommendation(throttleStats.performanceGrade)}
          </p>
        </div>
      )}
    </div>
  )
}

export default PerformanceMonitor 