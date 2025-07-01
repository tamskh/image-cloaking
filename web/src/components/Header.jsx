import { useState } from 'react'
import { Shield, Github, Menu, X } from 'lucide-react'

function Header({ onGetStarted }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const scrollToSection = (sectionId) => {
    const element = document.querySelector(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
      setIsMobileMenuOpen(false)
    }
  }

  const navItems = [
    { label: 'Features', onClick: () => scrollToSection('#features-section') },
    { label: 'How it Works', onClick: () => scrollToSection('#how-it-works-section') },
    { label: 'FAQ', onClick: () => scrollToSection('#faq-section') },
  ]

  return (
    <>
      <header className="bg-white/95 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="bg-primary-600 p-2 rounded-lg">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-gray-900">Image Cloaking</h1>
                <p className="text-xs text-gray-500 hidden sm:block">Phase 1 - Web Demo</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              {navItems.map((item) => (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  className="text-gray-600 hover:text-gray-900 transition-colors duration-200"
                >
                  {item.label}
                </button>
              ))}
              <a 
                href="https://github.com/yourusername/image-cloaking" 
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors duration-200"
              >
                <Github className="w-4 h-4" />
                GitHub
              </a>
            </nav>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-4">
              <span className="hidden lg:inline-block px-3 py-1 text-xs font-medium bg-security-100 text-security-700 rounded-full">
                🔒 Client-side Only
              </span>
              <button 
                onClick={onGetStarted}
                className="btn-primary text-sm py-2 px-4"
              >
                Get Started
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center gap-2">
              <span className="inline-block px-2 py-1 text-xs font-medium bg-security-100 text-security-700 rounded-full">
                🔒 Safe
              </span>
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-2 text-gray-600 hover:text-gray-900 transition-colors duration-200"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-80 max-w-[85%] bg-white shadow-xl animate-slide-down">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <div className="bg-primary-600 p-1.5 rounded-lg">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold text-gray-900">Image Cloaking</span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 text-gray-600 hover:text-gray-900 transition-colors duration-200"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <nav className="px-4 py-6 space-y-4">
              {navItems.map((item) => (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  className="block w-full text-left px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors duration-200"
                >
                  {item.label}
                </button>
              ))}
              <a 
                href="https://github.com/yourusername/image-cloaking" 
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors duration-200"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Github className="w-4 h-4" />
                GitHub
              </a>
              
              <div className="pt-4 border-t border-gray-200">
                <button 
                  onClick={() => {
                    onGetStarted()
                    setIsMobileMenuOpen(false)
                  }}
                  className="w-full btn-primary text-sm py-3"
                >
                  Get Started
                </button>
              </div>
              
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-security-100 text-security-700 rounded-full">
                  🔒 100% Client-side Processing
                </div>
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  )
}

export default Header 