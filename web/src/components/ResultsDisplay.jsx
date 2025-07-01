import React from 'react'
import { Download, BarChart3, RotateCcw, CheckCircle } from 'lucide-react'
import { downloadImage } from '../utils/imageUtils'

function ResultsDisplay({ originalImage, results, settings, onReset }) {
  const handleDownload = (imageData, filename) => {
    downloadImage(imageData, filename)
  }

  const handleDownloadAll = () => {
    // Get the result data and appropriate filename
    const resultKey = Object.keys(results)[0] // 'fawkes', 'advcloak', or 'both'
    const result = results[resultKey]
    
    if (result) {
      const suffix = resultKey === 'both' ? 'protected' : resultKey
      downloadImage(result.imageData, `${originalImage.name}_${suffix}.png`)
    }
  }

  const formatMetric = (value, type) => {
    if (typeof value !== 'number') return 'N/A'
    
    switch (type) {
      case 'psnr':
        return `${value.toFixed(1)} dB`
      case 'ssim':
        return `${value.toFixed(3)}`
      case 'mse':
        return value.toFixed(2)
      case 'perceptual':
        return value.toFixed(2)
      default:
        return value.toFixed(3)
    }
  }

  const getMetricStatus = (value, type) => {
    if (typeof value !== 'number') return 'neutral'
    
    switch (type) {
      case 'psnr':
        return value > 30 ? 'good' : value > 25 ? 'fair' : 'poor'
      case 'ssim':
        return value > 0.9 ? 'good' : value > 0.8 ? 'fair' : 'poor'
      case 'mse':
        return value < 100 ? 'good' : value < 500 ? 'fair' : 'poor'
      default:
        return 'neutral'
    }
  }

  const getResultTitle = (method) => {
    switch (method) {
      case 'fawkes':
        return 'Fawkes Protected'
      case 'advcloak':
        return 'AdvCloak Protected'
      case 'both':
        return 'Dual Protected (Fawkes + AdvCloak)'
      default:
        return 'Protected'
    }
  }

  const getResultDescription = (method) => {
    switch (method) {
      case 'fawkes':
        return 'Protected against facial recognition systems'
      case 'advcloak':
        return 'Protected against LLM vision models'
      case 'both':
        return 'Maximum protection against both facial recognition and LLM vision models'
      default:
        return 'AI protection applied'
    }
  }

  // Get the result data
  const resultKey = Object.keys(results)[0]
  const result = results[resultKey]

  return (
    <div className="max-w-6xl mx-auto">
      {/* Success Header */}
      <div className="card mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="bg-green-100 p-2 rounded-full">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Cloaking Complete!</h2>
            <p className="text-gray-600">{getResultDescription(resultKey)}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleDownloadAll}
            className="btn-primary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download Protected Image
          </button>
          
          <button
            onClick={onReset}
            className="btn-secondary flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Process Another
          </button>
        </div>
      </div>

      {/* Results Display - Side-by-side comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Original */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-3">Original Image</h3>
          <img 
            src={URL.createObjectURL(originalImage)} 
            alt="Original" 
            className="w-full h-auto rounded-lg"
          />
          <div className="mt-3 text-sm text-gray-600">
            <p>Vulnerable to AI recognition systems</p>
          </div>
        </div>

        {/* Protected Result */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">{getResultTitle(resultKey)}</h3>
            <button
              onClick={() => {
                const suffix = resultKey === 'both' ? 'protected' : resultKey
                handleDownload(result.imageData, `${originalImage.name}_${suffix}.png`)
              }}
              className="text-primary-600 hover:text-primary-700"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
          <img 
            src={result.imageData} 
            alt="Protected image" 
            className="w-full h-auto rounded-lg"
          />
          {result.metrics && (
            <div className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Quality (PSNR):</span>
                <span className={`font-medium ${
                  getMetricStatus(result.metrics.psnr, 'psnr') === 'good' ? 'text-green-600' :
                  getMetricStatus(result.metrics.psnr, 'psnr') === 'fair' ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {formatMetric(result.metrics.psnr, 'psnr')}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Similarity (SSIM):</span>
                <span className="font-medium">{formatMetric(result.metrics.ssim, 'ssim')}</span>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                {getResultDescription(resultKey)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detailed Metrics */}
      {result?.metrics && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-900">Quality Analysis</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-lg font-semibold text-gray-900">
                {formatMetric(result.metrics.psnr, 'psnr')}
              </div>
              <div className="text-sm text-gray-600">PSNR</div>
              <div className="text-xs text-gray-500">Peak Signal-to-Noise</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-lg font-semibold text-gray-900">
                {formatMetric(result.metrics.ssim, 'ssim')}
              </div>
              <div className="text-sm text-gray-600">SSIM</div>
              <div className="text-xs text-gray-500">Structural Similarity</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-lg font-semibold text-gray-900">
                {formatMetric(result.metrics.mse, 'mse')}
              </div>
              <div className="text-sm text-gray-600">MSE</div>
              <div className="text-xs text-gray-500">Mean Squared Error</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-lg font-semibold text-gray-900">
                {formatMetric(result.metrics.perceptual_distance, 'perceptual')}
              </div>
              <div className="text-sm text-gray-600">Perceptual</div>
              <div className="text-xs text-gray-500">Visual Difference</div>
            </div>
          </div>

                     <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
             <p><strong>Quality Summary:</strong> Higher PSNR ({'>'}30 dB) and SSIM ({'>'}0.9) indicate better visual quality. 
             Lower MSE and Perceptual Distance values indicate minimal visible changes while maintaining strong AI protection.</p>
           </div>
        </div>
      )}
    </div>
  )
}

export default ResultsDisplay 