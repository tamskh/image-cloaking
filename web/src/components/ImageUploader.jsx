import React, { useState, useCallback } from 'react'
import { Upload, X, Shield, Lock, Eye } from 'lucide-react'

function ImageUploader({ onImageSelect }) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [preview, setPreview] = useState(null)

  const handleImageSelect = useCallback((file) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreview(e.target.result)
        onImageSelect(file)
      }
      reader.readAsDataURL(file)
    }
  }, [onImageSelect])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const file = e.dataTransfer.files[0]
    handleImageSelect(file)
  }, [handleImageSelect])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleFileInput = useCallback((e) => {
    const file = e.target.files[0]
    handleImageSelect(file)
  }, [handleImageSelect])

  const handleRemove = useCallback(() => {
    setPreview(null)
    onImageSelect(null)
  }, [onImageSelect])

  if (preview) {
    return (
      <div className="card max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Photo Ready for Protection</h3>
          <button
            onClick={handleRemove}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="relative">
          <img 
            src={preview} 
            alt="Your photo ready for protection" 
            className="w-full h-auto max-h-96 object-contain rounded-lg"
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-all duration-200 rounded-lg" />
        </div>
        
        <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
          <div className="flex items-start gap-3">
            <div className="bg-green-100 p-2 rounded-full flex-shrink-0">
              <Shield className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-700 font-medium mb-1">
                Your photo is ready! Choose how you want to protect it below.
              </p>
              <div className="flex items-center gap-2 text-xs text-green-600">
                <Lock className="w-3 h-3" />
                <span>This photo will never leave your device</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative border-2 border-dashed rounded-xl p-8 md:p-12 text-center transition-all duration-300 cursor-pointer
          ${isDragOver 
            ? 'border-primary-400 bg-primary-50 scale-[1.02]' 
            : 'border-gray-300 hover:border-gray-400 bg-gray-50 hover:bg-gray-100'
          }
        `}
      >
        <input
          type="file"
          accept="image/*"
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <div className="flex flex-col items-center">
          <div className={`
            p-4 rounded-full mb-4 transition-colors duration-300
            ${isDragOver ? 'bg-primary-100' : 'bg-gray-200'}
          `}>
            <Upload className={`
              w-8 h-8 transition-colors duration-300
              ${isDragOver ? 'text-primary-600' : 'text-gray-500'}
            `} />
          </div>
          
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Upload Your Photo to Protect
          </h3>
          <p className="text-gray-600 mb-4 max-w-md">
            Drag and drop your photo here, or click to select from your device. 
            Your photo stays 100% private on your device.
          </p>
          
          <div className="flex items-center gap-2 text-sm text-primary-600 bg-primary-50 px-4 py-2 rounded-full mb-6">
            <Lock className="w-4 h-4" />
            <span className="font-medium">Never uploaded • Always private</span>
          </div>
          
          <button className="bg-primary-600 hover:bg-primary-700 text-white font-medium px-6 py-3 rounded-lg transition-colors duration-200">
            Choose Photo to Protect
          </button>
        </div>
      </div>

      {/* Benefits Preview */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
          <div className="bg-green-100 p-2 rounded-full mx-auto mb-3 w-fit">
            <Shield className="w-5 h-5 text-green-600" />
          </div>
          <div className="font-medium text-gray-900 mb-1">Stop Face Recognition</div>
          <div className="text-sm text-gray-600">Block Facebook, Google & surveillance AI</div>
        </div>
        
        <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
          <div className="bg-blue-100 p-2 rounded-full mx-auto mb-3 w-fit">
            <Eye className="w-5 h-5 text-blue-600" />
          </div>
          <div className="font-medium text-gray-900 mb-1">Looks Identical</div>
          <div className="text-sm text-gray-600">Perfect quality for humans to see</div>
        </div>
        
        <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
          <div className="bg-purple-100 p-2 rounded-full mx-auto mb-3 w-fit">
            <Lock className="w-5 h-5 text-purple-600" />
          </div>
          <div className="font-medium text-gray-900 mb-1">100% Private</div>
          <div className="text-sm text-gray-600">Never uploaded anywhere</div>
        </div>
      </div>

      {/* Technical Info */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="font-medium text-gray-900 mb-1">Supported Formats</div>
          <div>JPG, PNG, WebP, HEIC</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="font-medium text-gray-900 mb-1">Max File Size</div>
          <div>10MB per photo</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="font-medium text-gray-900 mb-1">Processing Time</div>
          <div>Usually 1-3 minutes</div>
        </div>
      </div>

      {/* Trust Signal */}
      <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
        <div className="flex items-center justify-center gap-3 text-sm">
          <div className="flex items-center gap-2 text-green-700">
            <Lock className="w-4 h-4" />
            <span className="font-medium">Your photos never leave your device</span>
          </div>
          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
          <div className="flex items-center gap-2 text-blue-700">
            <Eye className="w-4 h-4" />
            <span className="font-medium">Open source & verifiable</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ImageUploader 