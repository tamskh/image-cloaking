import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, Image as ImageIcon, X, AlertCircle } from 'lucide-react'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ACCEPTED_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp']
}

function ImageUploader({ onImageSelect }) {
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState(null)

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    setError(null)
    
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0]
      if (rejection.errors[0]?.code === 'file-too-large') {
        setError('File too large. Please select an image under 10MB.')
      } else if (rejection.errors[0]?.code === 'file-invalid-type') {
        setError('Invalid file type. Please select a JPG, PNG, or WebP image.')
      } else {
        setError('Invalid file. Please try another image.')
      }
      return
    }

    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0]
      
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreview(e.target.result)
      }
      reader.readAsDataURL(file)
      
      // Pass file to parent
      onImageSelect(file)
    }
  }, [onImageSelect])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: false
  })

  const handleRemove = () => {
    setPreview(null)
    setError(null)
    onImageSelect(null)
  }

  if (preview) {
    return (
      <div className="card max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Selected Image</h3>
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
            alt="Selected for cloaking" 
            className="w-full h-auto max-h-96 object-contain rounded-lg"
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-all duration-200 rounded-lg" />
        </div>
        
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-2">
            Ready to cloak this image. Choose your protection method and click &quot;Start Cloaking&quot; below.
          </p>
          <div className="flex items-center gap-2 text-xs text-green-600">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            Processing will happen entirely in your browser
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Your Image</h2>
        <p className="text-gray-600">
          Select an image to protect from AI recognition
        </p>
      </div>

      <div
        {...getRootProps()}
        className={`dropzone ${isDragActive ? 'active' : ''}`}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center gap-4">
          <div className="bg-primary-100 p-4 rounded-full">
            {isDragActive ? (
              <Upload className="w-8 h-8 text-primary-600" />
            ) : (
              <ImageIcon className="w-8 h-8 text-primary-600" />
            )}
          </div>
          
          <div className="text-center">
            {isDragActive ? (
              <p className="text-lg font-medium text-primary-600">
                Drop your image here
              </p>
            ) : (
              <>
                <p className="text-lg font-medium text-gray-900 mb-1">
                  Drag & drop your image here
                </p>
                <p className="text-gray-500 mb-4">
                  or click to browse your files
                </p>
                <button className="btn-primary">
                  Choose Image
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="font-medium text-gray-900 mb-1">Supported Formats</div>
          <div>JPG, PNG, WebP</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="font-medium text-gray-900 mb-1">Max File Size</div>
          <div>10MB</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="font-medium text-gray-900 mb-1">Privacy</div>
          <div>100% Client-side</div>
        </div>
      </div>
    </div>
  )
}

export default ImageUploader 