import React, { useState } from "react";
import { Shield, Github, Menu, X, Lock, Globe } from "lucide-react";

function Header({ onGetStarted }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    {
      label: "Why Protect Photos?",
      onClick: () => scrollToSection("why-section"),
    },
    {
      label: "How It Works",
      onClick: () => scrollToSection("how-it-works-section"),
    },
    { label: "Questions", onClick: () => scrollToSection("faq-section") },
  ];

  const scrollToSection = (sectionId) => {
    const element = document.querySelector(`#${sectionId}`);
    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
    setIsMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="bg-primary-600 p-2 rounded-lg">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900">ImageShield</h1>
              <p className="text-xs text-gray-500 hidden sm:block">
                Experimental Image Privacy Research
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={item.onClick}
                className="text-gray-600 hover:text-gray-900 transition-colors duration-200 text-sm font-medium"
              >
                {item.label}
              </button>
            ))}
            <a
              href="https://github.com/yourusername/image-cloaking"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors duration-200 text-sm font-medium"
            >
              <Github className="w-4 h-4" />
              Open Source
            </a>
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1 rounded-full">
              <Lock className="w-3 h-3" />
              <span className="text-xs font-medium">100% Private</span>
            </div>
            <button
              onClick={onGetStarted}
              className="bg-primary-600 hover:bg-primary-700 text-white font-medium px-4 py-2 rounded-lg transition-colors duration-200 text-sm"
            >
              Try it Now
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-gray-600 hover:text-gray-900 transition-colors duration-200"
          >
            {isMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200 bg-white">
            <div className="space-y-4">
              {navItems.map((item) => (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  className="block w-full text-left text-gray-600 hover:text-gray-900 transition-colors duration-200 py-2 font-medium"
                >
                  {item.label}
                </button>
              ))}
              <a
                href="https://github.com/yourusername/image-cloaking"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors duration-200 py-2 font-medium"
              >
                <Github className="w-4 h-4" />
                Open Source Code
              </a>
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-center gap-2 text-green-600 bg-green-50 px-3 py-2 rounded-full mb-3">
                  <Lock className="w-3 h-3" />
                  <span className="text-xs font-medium">
                    100% Private Processing
                  </span>
                </div>
                <button
                  onClick={onGetStarted}
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium px-4 py-3 rounded-lg transition-colors duration-200"
                >
                  Try Experimental Techniques
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;
