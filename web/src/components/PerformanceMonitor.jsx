/**
 * Performance monitoring component for image cloaking
 * Shows real-time performance stats and processing recommendations
 */
import React from 'react'
import { useProcessingThrottle } from '../utils/processingThrottle'

export function PerformanceMonitor({ isVisible = false, processingStats = null }) {
  const { throttleStats } = useProcessingThrottle()

  if (!isVisible) return null

  const getPerformanceColor = (grade) => {
    switch (grade) {
      case 'excellent': return 'text-green-600'
      case 'good': return 'text-blue-600'
      case 'fair': return 'text-yellow-600'
      case 'poor': return 'text-red-600'
      default: return 'text-gray-600'
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
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4">
      <h3 className="text-sm font-medium text-gray-900 mb-3">Performance Monitor</h3>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-600">Performance:</span>
          <span className={`ml-2 font-medium ${getPerformanceColor(throttleStats.performanceGrade)}`}>
            {throttleStats.performanceGrade || 'Unknown'}
          </span>
        </div>
        
        <div>
          <span className="text-gray-600">FPS:</span>
          <span className="ml-2 font-medium text-gray-900">
            {Math.round(throttleStats.averageFPS)}
          </span>
        </div>

        {processingStats && (
          <>
            <div>
              <span className="text-gray-600">Processing Time:</span>
              <span className="ml-2 font-medium text-gray-900">
                {(processingStats.totalTime / 1000).toFixed(1)}s
              </span>
            </div>
            
            <div>
              <span className="text-gray-600">Faces Detected:</span>
              <span className="ml-2 font-medium text-gray-900">
                {processingStats.facesDetected}
              </span>
            </div>
          </>
        )}
      </div>

      <div className="mt-3 p-3 bg-blue-50 rounded border-l-4 border-blue-400">
        <p className="text-sm text-blue-800">
          💡 {getRecommendation(throttleStats.performanceGrade)}
        </p>
      </div>

      {throttleStats.isThrottling && (
        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-xs text-yellow-800">
            ⚠️ Processing is being throttled to maintain browser responsiveness
          </p>
        </div>
      )}
    </div>
  )
}

export default PerformanceMonitor 