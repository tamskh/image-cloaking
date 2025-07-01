import React, { useState, useEffect } from 'react'
import { Play, RotateCcw, X, Shield, Zap, Clock, AlertCircle, Settings } from 'lucide-react'
import SettingsPanel from './SettingsPanel'
import { getProcessingTimeEstimate } from '../utils/processingEstimator'
import { createLogger } from '../utils/logger'

const logger = createLogger('ProcessingPanel')

function ProcessingPanel({ 
  image, 
  settings, 
  isProcessing, 
  progress, 
  error, 
  onProcess, 
  onCancel,
  onReset,
  onSettingsChange
}) {
  const [showSettings, setShowSettings] = useState(false)
  const [estimatedTime, setEstimatedTime] = useState({ formatted: 'Calculating...', seconds: 0 })

  const getMethodIcon = (method) => {
    switch (method) {
      case 'fawkes': return <Shield className="w-4 h-4" />
      case 'advcloak': return <Zap className="w-4 h-4" />
      case 'both': return <><Shield className="w-4 h-4" /><Zap className="w-4 h-4" /></>
      default: return <Shield className="w-4 h-4" />
    }
  }

  const getMethodName = (method) => {
    switch (method) {
      case 'fawkes': return 'Fawkes Protection'
      case 'advcloak': return 'AdvCloak Protection'
      case 'both': return 'Dual Protection (Sequential)'
      default: return 'Protection'
    }
  }

  // Calculate estimated time when image or settings change
  useEffect(() => {
    let mounted = true
    
    const calculateEstimate = async () => {
      try {
        const estimate = await getProcessingTimeEstimate(image, settings)
        if (mounted) {
          setEstimatedTime(estimate)
        }
      } catch (error) {
        logger.warn('Failed to calculate time estimate:', error)
        if (mounted) {
          setEstimatedTime({ 
            formatted: 'Unknown', 
            seconds: 0,
            error: true
          })
        }
      }
    }
    
    calculateEstimate()
    
    return () => {
      mounted = false
    }
  }, [image, settings])

  return (
    <div className="max-w-4xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Image Preview */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Source Image</h3>
          <div className="relative">
            <img 
              src={URL.createObjectURL(image)} 
              alt="Source for cloaking" 
              className="w-full h-auto max-h-64 object-contain rounded-lg"
            />
            <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
              {(image.size / 1024 / 1024).toFixed(1)} MB
            </div>
          </div>
          
          <div className="mt-4 grid grid-cols-1 xs:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">File name:</span>
              <div className="font-medium truncate">{image.name}</div>
            </div>
            <div>
              <span className="text-gray-600">Type:</span>
              <div className="font-medium">{image.type}</div>
            </div>
          </div>
        </div>

        {/* Settings Summary & Controls */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Processing Configuration</h3>
            <button
              onClick={() => setShowSettings(!showSettings)}
              disabled={isProcessing}
              className={`text-sm px-3 py-1.5 border rounded-md transition-colors duration-200 flex items-center gap-2 ${
                isProcessing 
                  ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed' 
                  : 'bg-gray-100 border-gray-300 hover:bg-gray-200 text-gray-600'
              }`}
            >
              <Settings className="w-3 h-3" />
              <span className="hidden xs:inline">{showSettings && !isProcessing ? 'Hide' : 'Settings'}</span>
            </button>
          </div>
          
          {/* Method Summary */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-3 p-3 bg-primary-50 rounded-lg">
              <div className="flex items-center gap-1 text-primary-600">
                {getMethodIcon(settings.method)}
              </div>
              <div>
                <div className="font-medium text-primary-900">{getMethodName(settings.method)}</div>
                <div className="text-sm text-primary-700">
                  {settings.method === 'fawkes' && `${settings.fawkesLevel} intensity`}
                  {settings.method === 'advcloak' && `ε=${settings.advCloakEpsilon}, ${settings.advCloakIterations} iterations`}
                  {settings.method === 'both' && `Fawkes ${settings.fawkesLevel} → AdvCloak (ε=${settings.advCloakEpsilon})`}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>
                Estimated time: {estimatedTime.error ? 'Unknown' : `~${estimatedTime.formatted}`}
                {estimatedTime.isEstimate && (
                  <span className="text-xs text-gray-500 ml-1">(estimate)</span>
                )}
              </span>
            </div>
          </div>

          {/* Progress */}
          {isProcessing && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Processing...</span>
                <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-2 text-xs text-gray-500">
                {progress < 25 && "Initializing models..."}
                {progress >= 25 && progress < 55 && settings.method === 'both' && "Applying Fawkes protection..."}
                {progress >= 55 && progress < 90 && settings.method === 'both' && "Applying AdvCloak protection..."}
                {progress >= 25 && progress < 75 && settings.method !== 'both' && "Applying cloaking algorithms..."}
                {progress >= 75 && "Finalizing results..."}
              </div>
              <div className="mt-1 text-xs text-gray-400">
                Processing can take several minutes for large images or complex settings. You can cancel anytime.
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Processing Error</span>
              </div>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          )}

          {/* Controls */}
          <div className="flex flex-col xs:flex-row gap-3">
            {!isProcessing ? (
              <button
                onClick={onProcess}
                className="btn-primary flex items-center justify-center gap-2 flex-1"
              >
                <Play className="w-4 h-4" />
                Start Cloaking
              </button>
            ) : (
              <button
                onClick={onCancel}
                className="btn-danger flex items-center justify-center gap-2 flex-1"
              >
                <X className="w-4 h-4" />
                Cancel Processing
              </button>
            )}
            
            <button
              onClick={onReset}
              disabled={isProcessing}
              className="btn-secondary flex items-center justify-center gap-2 xs:w-auto"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden xs:inline">Reset</span>
            </button>
          </div>

          {/* Privacy Notice */}
          <div className="mt-6 p-3 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2 text-green-700 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="font-medium">Privacy Protected:</span>
              Your image never leaves this browser
            </div>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && !isProcessing && (
        <div className="mt-8 animate-slide-up">
          <SettingsPanel settings={settings} onChange={onSettingsChange} isProcessing={isProcessing} />
        </div>
      )}
    </div>
  )
}

export default ProcessingPanel 