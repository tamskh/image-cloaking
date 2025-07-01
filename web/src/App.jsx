import { useState, useCallback } from 'react'
import { Shield, Info, Zap, Lock, ChevronDown, ChevronUp } from 'lucide-react'
import ImageUploader from './components/ImageUploader'
import ProcessingPanel from './components/ProcessingPanel'
import ResultsDisplay from './components/ResultsDisplay'
import Header from './components/Header'
import { useImageCloaking } from './hooks/useImageCloaking'
import { createLogger } from './utils/logger'

const logger = createLogger('App')

function App() {
  const [selectedImage, setSelectedImage] = useState(null)
  const [settings, setSettings] = useState({
    method: 'fawkes', // Start with fawkes for better performance
    fawkesLevel: 'mid', // 'low', 'mid', 'high'
    advCloakEpsilon: 0.05, // Optimized for fast processing
    advCloakIterations: 15 // Reduced for web performance
  })

  const {
    isProcessing,
    progress,
    results,
    error,
    processImage,
    cancelProcessing,
    resetResults
  } = useImageCloaking()

  const handleImageSelect = useCallback((file) => {
    setSelectedImage(file)
    resetResults()
  }, [resetResults])

  const handleProcess = useCallback(async () => {
    if (!selectedImage) return
    
    try {
      await processImage(selectedImage, settings)
    } catch (err) {
      logger.error('Processing failed:', err)
    }
  }, [selectedImage, settings, processImage])

  const handleReset = useCallback(() => {
    setSelectedImage(null)
    resetResults()
  }, [resetResults])

  const scrollToUpload = () => {
    const uploadSection = document.querySelector('#upload-section')
    if (uploadSection) {
      uploadSection.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header onGetStarted={scrollToUpload} />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-primary-100 p-3 rounded-full animate-bounce-subtle">
              <Shield className="w-8 h-8 text-primary-600" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Protect Your Images from AI
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Cloak your photos so AI models can&apos;t recognize them, while keeping them perfectly visible to humans.
            <span className="text-primary-600 font-medium"> 100% client-side processing.</span>
          </p>
        </div>

        {/* Main Content */}
        <div className="grid gap-8">
          {!selectedImage && !results ? (
            /* Upload Section */
            <div className="animate-fade-in scroll-mt-header" id="upload-section">
              <ImageUploader onImageSelect={handleImageSelect} />
            </div>
          ) : (
            <>
              {/* Processing Section */}
              {selectedImage && !results && (
                <div className="animate-slide-up">
                  <ProcessingPanel
                    image={selectedImage}
                    settings={settings}
                    isProcessing={isProcessing}
                    progress={progress}
                    error={error}
                    onProcess={handleProcess}
                    onCancel={cancelProcessing}
                    onReset={handleReset}
                    onSettingsChange={setSettings}
                  />
                </div>
              )}

              {/* Results Section */}
              {results && (
                <div className="animate-slide-up">
                  <ResultsDisplay
                    originalImage={selectedImage}
                    results={results}
                    settings={settings}
                    onReset={handleReset}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Features Section */}
        <section id="features-section" className="mt-20 mb-16 scroll-mt-header">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Protection Features</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Advanced AI cloaking technology to protect your privacy
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="card text-center">
              <div className="bg-primary-100 p-3 rounded-full mx-auto mb-4 w-fit">
                <Shield className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Fawkes Protection</h3>
              <p className="text-gray-600 mb-4">
                Protects against facial recognition systems by adding imperceptible perturbations that confuse AI models.
              </p>
              <div className="text-sm text-gray-500">
                • Facial recognition immunity<br/>
                • Three protection levels<br/>
                • Preserves image quality
              </div>
            </div>
            
            <div className="card text-center">
              <div className="bg-primary-100 p-3 rounded-full mx-auto mb-4 w-fit">
                <Zap className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">AdvCloak Protection</h3>
              <p className="text-gray-600 mb-4">
                Defends against advanced LLM vision models like GPT-4V and Claude Vision using adversarial techniques.
              </p>
              <div className="text-sm text-gray-500">
                • LLM vision immunity<br/>
                • Customizable strength<br/>
                • Iterative optimization
              </div>
            </div>
            
            <div className="card text-center">
              <div className="bg-security-100 p-3 rounded-full mx-auto mb-4 w-fit">
                <Lock className="w-6 h-6 text-security-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Privacy First</h3>
              <p className="text-gray-600 mb-4">
                All processing happens in your browser. Your images never leave your device or touch our servers.
              </p>
              <div className="text-sm text-gray-500">
                • 100% client-side<br/>
                • No data collection<br/>
                • Open source
              </div>
            </div>
          </div>
        </section>

        {/* How it Works Section */}
        <section id="how-it-works-section" className="mb-16 scroll-mt-header">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Advanced adversarial techniques make your images invisible to AI while remaining perfectly clear to humans
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="card">
              <div className="flex items-start gap-4">
                <div className="bg-blue-100 p-2 rounded-lg flex-shrink-0">
                  <Info className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Fawkes Algorithm</h3>
                  <p className="text-gray-600 mb-3">
                    Protects against facial recognition by adding imperceptible perturbations that confuse AI models while remaining invisible to humans.
                  </p>
                  <div className="text-sm text-gray-500">
                    <strong>Best for:</strong> Social media, profile pictures, family photos
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-start gap-4">
                <div className="bg-purple-100 p-2 rounded-lg flex-shrink-0">
                  <Zap className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">AdvCloak Algorithm</h3>
                  <p className="text-gray-600 mb-3">
                    Uses adversarial techniques to defend against broader AI vision models including LLMs like GPT-4V and Claude Vision.
                  </p>
                  <div className="text-sm text-gray-500">
                    <strong>Best for:</strong> Documents, screenshots, sensitive content
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 card">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Processing Steps</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-semibold mb-2">1</div>
                  <div className="text-sm font-medium text-gray-900">Upload Image</div>
                  <div className="text-xs text-gray-500 text-center">Select your image</div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-semibold mb-2">2</div>
                  <div className="text-sm font-medium text-gray-900">Analyze</div>
                  <div className="text-xs text-gray-500 text-center">AI detects features</div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-semibold mb-2">3</div>
                  <div className="text-sm font-medium text-gray-900">Cloak</div>
                  <div className="text-xs text-gray-500 text-center">Apply protection</div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 bg-security-100 text-security-600 rounded-full flex items-center justify-center font-semibold mb-2">4</div>
                  <div className="text-sm font-medium text-gray-900">Download</div>
                  <div className="text-xs text-gray-500 text-center">Get protected image</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq-section" className="mb-16 scroll-mt-header">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
            <p className="text-xl text-gray-600">Common questions about image cloaking technology</p>
          </div>
          
          <div className="max-w-3xl mx-auto space-y-4">
            <FAQItem
              question="Is my data safe? Do you store my images?"
              answer="Absolutely safe! All processing happens entirely in your browser using JavaScript. Your images never leave your device, are never uploaded to our servers, and we collect no data whatsoever. This is verifiable since our code is open source."
            />
            <FAQItem
              question="How effective is the protection?"
              answer="Our cloaking techniques are based on published research and are effective against current AI models. Fawkes has shown 95%+ effectiveness against facial recognition systems, while AdvCloak targets broader vision models. However, this is an arms race - as AI improves, so do our defenses."
            />
            <FAQItem
              question="Will the protection affect image quality?"
              answer="The changes are designed to be imperceptible to humans while confusing AI. You may notice very subtle differences when zooming in closely, but for normal viewing, the images look identical. Our metrics show minimal quality loss (PSNR > 30dB typically)."
            />
            <FAQItem
              question="Which method should I choose?"
              answer="For photos with faces (social media, family photos), use Fawkes. For other content (documents, screenshots), use AdvCloak. For maximum protection, use both methods sequentially, though this takes longer to process."
            />
            <FAQItem
              question="Does this work on all types of images?"
              answer="The effectiveness varies by image type. Face photos work best with Fawkes, while AdvCloak is more general-purpose. Very low-resolution images or heavily compressed images may see reduced effectiveness."
            />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-16 py-8 border-t border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 text-center text-gray-500">
          <p>&copy; 2024 Image Cloaking. Privacy-first AI protection.</p>
          <p className="text-sm mt-2">
            Open source • No tracking • Client-side only
          </p>
        </div>
      </footer>
    </div>
  )
}

// FAQ Item Component
function FAQItem({ question, answer }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="card">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left"
      >
        <h3 className="font-semibold text-gray-900 pr-4">{question}</h3>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
        )}
      </button>
      {isOpen && (
        <div className="mt-3 text-gray-600 animate-slide-down">
          {answer}
        </div>
      )}
    </div>
  )
}

export default App 