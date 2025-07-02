import { useState, useCallback, useEffect } from 'react'
import { Shield, Info, Zap, Lock, ChevronDown, ChevronUp, Eye, Camera, Users, Globe } from 'lucide-react'
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

  // Auto-scroll to protection settings when image is selected
  useEffect(() => {
    if (selectedImage && !results) {
      // Use setTimeout to ensure the component has rendered
      setTimeout(() => {
        const protectionSettings = document.querySelector('#protection-settings')
        if (protectionSettings) {
          protectionSettings.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
          })
        }
      }, 100)
    }
  }, [selectedImage, results])

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
    // Scroll back to upload section
    setTimeout(() => {
      const uploadSection = document.querySelector('#upload-section')
      if (uploadSection) {
        uploadSection.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        })
      }
    }, 100)
  }, [resetResults])

  const scrollToUpload = () => {
    const uploadSection = document.querySelector('#upload-section')
    if (uploadSection) {
      uploadSection.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 scroll-smooth">
      <Header onGetStarted={scrollToUpload} />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-primary-100 p-4 rounded-full animate-bounce-subtle">
              <Shield className="w-10 h-10 text-primary-600" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Photo Privacy Tool
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed mb-6">
            Research-based techniques that attempt to make photos harder for some AI systems to analyze. 
            Your images stay <span className="text-primary-600 font-semibold">perfectly clear to humans</span> but may 
            <span className="text-amber-600 font-semibold"> confuse some AI models</span> - results vary by system.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-full">
              <Lock className="w-4 h-4" />
              <span className="text-sm font-medium">100% Private - Never Uploaded</span>
            </div>
            <div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-4 py-2 rounded-full">
              <Globe className="w-4 h-4" />
              <span className="text-sm font-medium">Works in Any Browser</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-12">
          {/* Upload Section - Always visible */}
          <div id="upload-section" className="scroll-mt-20">
            {!selectedImage ? (
              <div className="animate-fade-in">
                <ImageUploader onImageSelect={handleImageSelect} />
              </div>
            ) : !results ? (
              /* Processing Section */
              <div className="animate-slide-up scroll-mt-20" id="processing-panel">
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
            ) : (
              /* Results Section */
              <div className="animate-slide-up scroll-mt-20">
                <ResultsDisplay
                  originalImage={selectedImage}
                  results={results}
                  settings={settings}
                  onReset={handleReset}
                />
              </div>
            )}
          </div>

          {/* Information Sections - Only show when no image is selected */}
          {!selectedImage && (
            <>
              {/* Why Use This Section */}
              <section id="why-section" className="scroll-mt-20">
                <div className="text-center mb-12">
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Protect Your Photos?</h2>
                  <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                    Every day, AI systems scan billions of photos to identify people. Here's how we help you stay private.
                  </p>
                </div>
                
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="card text-center">
                    <div className="bg-red-100 p-3 rounded-full mx-auto mb-4 w-fit">
                      <Camera className="w-6 h-6 text-red-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Social Media Scanning</h3>
                    <p className="text-gray-600 text-sm">
                      Platforms use AI to identify you across photos, even when you're not tagged
                    </p>
                  </div>
                  
                  <div className="card text-center">
                    <div className="bg-orange-100 p-3 rounded-full mx-auto mb-4 w-fit">
                      <Eye className="w-6 h-6 text-orange-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Government Surveillance</h3>
                    <p className="text-gray-600 text-sm">
                      Public cameras and databases can track your movements using facial recognition
                    </p>
                  </div>
                  
                  <div className="card text-center">
                    <div className="bg-purple-100 p-3 rounded-full mx-auto mb-4 w-fit">
                      <Users className="w-6 h-6 text-purple-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Employer Tracking</h3>
                    <p className="text-gray-600 text-sm">
                      Companies may scan public photos to research employees and job candidates
                    </p>
                  </div>
                  
                  <div className="card text-center">
                    <div className="bg-blue-100 p-3 rounded-full mx-auto mb-4 w-fit">
                      <Globe className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Data Brokers</h3>
                    <p className="text-gray-600 text-sm">
                      Companies collect and sell your facial data without your knowledge or consent
                    </p>
                  </div>
                </div>
              </section>

              {/* How it Works Section */}
              <section id="how-it-works-section" className="scroll-mt-20">
                <div className="text-center mb-12">
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">How Does It Work?</h2>
                  <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                    We add tiny, invisible noise patterns that may interfere with some AI vision systems - based on adversarial machine learning research
                  </p>
                </div>
                
                <div className="grid md:grid-cols-2 gap-8 mb-8">
                  <div className="card">
                    <div className="flex items-start gap-4">
                      <div className="bg-blue-100 p-2 rounded-lg flex-shrink-0">
                        <Eye className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">What Humans See</h3>
                        <p className="text-gray-600 mb-3">
                          Your photo looks exactly the same. No visible changes, no quality loss, no weird artifacts. 
                          Anyone looking at it sees a perfectly normal photo.
                        </p>
                        <div className="text-sm text-green-600 font-medium">
                          ✓ 100% identical appearance
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <div className="flex items-start gap-4">
                      <div className="bg-red-100 p-2 rounded-lg flex-shrink-0">
                        <Shield className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">What Some AI May See</h3>
                        <p className="text-gray-600 mb-3">
                          Some AI systems may get confused by the noise patterns, but results vary greatly. 
                          Advanced or updated AI systems may still analyze the image successfully.
                        </p>
                        <div className="text-sm text-amber-600 font-medium">
                          ~ Possible AI interference (not guaranteed)
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Simple 4-Step Process</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-bold text-lg mb-3">1</div>
                        <div className="text-sm font-medium text-gray-900 mb-1">Upload Your Photo</div>
                        <div className="text-xs text-gray-500 text-center">Drag & drop or click to select</div>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-bold text-lg mb-3">2</div>
                        <div className="text-sm font-medium text-gray-900 mb-1">Choose Protection</div>
                        <div className="text-xs text-gray-500 text-center">Select what you want to block</div>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-bold text-lg mb-3">3</div>
                        <div className="text-sm font-medium text-gray-900 mb-1">AI Processing</div>
                        <div className="text-xs text-gray-500 text-center">We add invisible protection</div>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 bg-security-100 text-security-600 rounded-full flex items-center justify-center font-bold text-lg mb-3">4</div>
                        <div className="text-sm font-medium text-gray-900 mb-1">Download & Share</div>
                        <div className="text-xs text-gray-500 text-center">Your privacy is protected</div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* FAQ Section */}
              <section id="faq-section" className="scroll-mt-20">
                <div className="text-center mb-12">
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">Common Questions</h2>
                  <p className="text-xl text-gray-600">Everything you need to know about protecting your photos</p>
                </div>
                
                <div className="max-w-3xl mx-auto space-y-4">
                  <FAQItem
                    question="Is this really free? What's the catch?"
                    answer="Yes, it's completely free! There's no catch. We believe privacy is a human right. The tool works entirely in your browser, so we don't even see your photos. We don't collect any data, show ads, or sell anything. This is open-source software made for the public good."
                  />
                  <FAQItem
                    question="Are my photos actually safe?"
                    answer="Absolutely! Your photos never leave your device. Everything happens in your browser using advanced AI technology. We can't see your photos, store them, or access them in any way. This is verifiable because our code is completely open source."
                  />
                  <FAQItem
                    question="Will people notice the photos look different?"
                    answer="No! The changes are completely invisible to humans. Your friends and family will see exactly the same photo you always had. Only AI systems will be confused. Think of it like invisible ink that only robots can see."
                  />
                  <FAQItem
                    question="Which protection should I use for my photos?"
                    answer="For family photos and selfies, use Face Shield. For documents, artwork, or photos without clear faces, use Universal Shield. If you want maximum protection and don't mind waiting a bit longer, use Maximum Protection which combines both."
                  />
                  <FAQItem
                    question="How long does it take to protect a photo?"
                    answer="Usually 1-3 minutes depending on your device and the photo size. Larger photos and Maximum Protection take longer. You can use your device normally while it's processing - it won't slow anything down."
                  />
                  <FAQItem
                    question="Does this work against all AI systems?"
                    answer="No - this is experimental research-based technology with limited and variable effectiveness. It may interfere with some older or simpler AI vision systems, but many modern AI systems (especially those from major tech companies) may not be affected. There are no guarantees, and effectiveness varies greatly by system. This is an ongoing research area, not a reliable security tool."
                  />
                  <FAQItem
                    question="Can I use this on my phone?"
                    answer="Yes! This works on any device with a modern web browser - phones, tablets, laptops, and desktops. No app download required. Just visit this website and start protecting your photos."
                  />
                  <FAQItem
                    question="What are the limitations I should know about?"
                    answer="Important limitations: 1) This is experimental research technology, not a proven security tool. 2) Many modern AI systems may not be affected at all. 3) There's no way to test effectiveness against real AI systems. 4) The web version uses simplified algorithms compared to research implementations. 5) Face detection may fail, preventing Fawkes processing. 6) Results vary greatly and cannot be guaranteed. Use this as an experimental tool, not for serious privacy protection."
                  />
                </div>
              </section>

              {/* Trust Signals Section */}
              <section>
                <div className="card text-center">
                  <h3 className="text-xl font-semibold text-gray-900 mb-6">Trusted by Privacy-Conscious People Worldwide</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                    <div>
                      <div className="text-2xl font-bold text-primary-600">100%</div>
                      <div className="text-gray-600">Client-Side Processing</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-primary-600">0</div>
                      <div className="text-gray-600">Data Collection</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-primary-600">∞</div>
                      <div className="text-gray-600">Photos Protected</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-primary-600">MIT</div>
                      <div className="text-gray-600">Open Source License</div>
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 py-8 border-t border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 text-center text-gray-500">
          <p>&copy; 2024 ImageShield. Privacy is a human right.</p>
          <p className="text-sm mt-2">
            Open source • No tracking • Client-side only • Made for the public good
          </p>
          <div className="mt-4 flex justify-center space-x-6 text-sm">
            <a href="#" className="hover:text-gray-700">Privacy Policy</a>
            <a href="#" className="hover:text-gray-700">How It Works</a>
            <a href="#" className="hover:text-gray-700">GitHub</a>
            <a href="#" className="hover:text-gray-700">Contact</a>
          </div>
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