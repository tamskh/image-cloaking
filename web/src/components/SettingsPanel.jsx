import React from 'react'
import { Settings, Shield, Zap, Info } from 'lucide-react'

function SettingsPanel({ settings, onChange, isProcessing = false }) {
  const handleMethodChange = (method) => {
    onChange({ ...settings, method })
  }

  const handleFawkesLevelChange = (level) => {
    onChange({ ...settings, fawkesLevel: level })
  }

  const handleAdvCloakChange = (field, value) => {
    onChange({ ...settings, [field]: value })
  }

  return (
    <div className={`card max-w-4xl mx-auto ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-5 h-5 text-primary-600" />
        <h3 className="text-lg font-semibold text-gray-900">Advanced Settings</h3>
        {isProcessing && (
          <span className="text-sm text-gray-500 ml-auto">(Processing...)</span>
        )}
      </div>

      <div className="space-y-8">
        {/* Protection Method */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-3">
            Protection Method
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { 
                id: 'fawkes', 
                name: 'Fawkes Only', 
                desc: 'Facial recognition protection',
                icon: Shield 
              },
              { 
                id: 'advcloak', 
                name: 'AdvCloak Only', 
                desc: 'Advanced LLM & vision AI protection',
                icon: Zap 
              },
              { 
                id: 'both', 
                name: 'Both Methods', 
                desc: 'Maximum protection',
                icon: Shield 
              }
            ].map(({ id, name, desc, icon: Icon }) => (
              <button
                key={id}
                onClick={() => handleMethodChange(id)}
                disabled={isProcessing}
                className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                  settings.method === id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${isProcessing ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4 text-primary-600" />
                  <span className="font-medium text-gray-900">{name}</span>
                </div>
                <p className="text-sm text-gray-600">{desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Fawkes Settings */}
        {(settings.method === 'fawkes' || settings.method === 'both') && (
          <div className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-primary-600" />
              <h4 className="font-medium text-gray-900">Fawkes Settings</h4>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Protection Level
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'low', name: 'Low', desc: 'Subtle protection' },
                  { id: 'mid', name: 'Medium', desc: 'Balanced approach' },
                  { id: 'high', name: 'High', desc: 'Maximum protection' }
                ].map(({ id, name, desc }) => (
                  <button
                    key={id}
                    onClick={() => handleFawkesLevelChange(id)}
                    disabled={isProcessing}
                    className={`p-3 rounded-lg border transition-all duration-200 text-center ${
                      settings.fawkesLevel === id
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${isProcessing ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    <div className="font-medium">{name}</div>
                    <div className="text-xs text-gray-600 mt-1">{desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* AdvCloak Settings */}
        {(settings.method === 'advcloak' || settings.method === 'both') && (
          <div className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-primary-600" />
              <h4 className="font-medium text-gray-900">AdvCloak Settings</h4>
            </div>
            
            <div className="space-y-6">
              {/* Epsilon */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Perturbation Strength (Epsilon): {settings.advCloakEpsilon}
                </label>
                <input
                  type="range"
                  min="0.02"
                  max="0.12"
                  step="0.01"
                  value={settings.advCloakEpsilon}
                  onChange={(e) => handleAdvCloakChange('advCloakEpsilon', parseFloat(e.target.value))}
                  disabled={isProcessing}
                  className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider ${
                    isProcessing ? 'cursor-not-allowed opacity-50' : ''
                  }`}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Minimal (0.02)</span>
                  <span>Maximum LLM Protection (0.12)</span>
                </div>
              </div>

              {/* Iterations */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Optimization Iterations: {settings.advCloakIterations}
                </label>
                <input
                  type="range"
                  min="15"
                  max="50"
                  step="5"
                  value={settings.advCloakIterations}
                  onChange={(e) => handleAdvCloakChange('advCloakIterations', parseInt(e.target.value))}
                  disabled={isProcessing}
                  className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider ${
                    isProcessing ? 'cursor-not-allowed opacity-50' : ''
                  }`}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Faster (15)</span>
                  <span>Maximum Protection (50)</span>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <strong>Updated for LLM Protection:</strong> Default values have been optimized to effectively fool advanced AI models like GPT-4V and Claude Vision. Higher epsilon (0.08+) provides maximum protection against state-of-the-art LLMs.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SettingsPanel 