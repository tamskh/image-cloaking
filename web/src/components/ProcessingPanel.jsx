import React, { useState, useEffect } from "react";
import { Play, RotateCcw, X, Shield, Zap, AlertCircle } from "lucide-react";
import { getProcessingTimeEstimate } from "../utils/processingEstimator";
import { createLogger } from "../utils/logger";

const logger = createLogger("ProcessingPanel");

function ProcessingPanel({
  image,
  settings,
  isProcessing,
  progress,
  error,
  onProcess,
  onCancel,
  onReset,
  onSettingsChange,
}) {
  const [estimatedTime, setEstimatedTime] = useState({
    formatted: "Calculating...",
    seconds: 0,
  });

  // Method configurations
  const methods = [
    {
      id: "fawkes",
      name: "Face Shield",
      icon: Shield,
      description: "Protects photos with faces",
      time: "30-90 sec",
    },
    {
      id: "advcloak",
      name: "Universal Shield",
      icon: Zap,
      description: "Works on any image",
      time: "1-2 min",
    },
    {
      id: "both",
      name: "Combined",
      icon: Shield,
      description: "Both methods (slower)",
      time: "2-4 min",
    },
  ];

  const strengthOptions = {
    fawkes: [
      { id: "low", name: "Light" },
      { id: "mid", name: "Standard", recommended: true },
      { id: "high", name: "Strong" },
    ],
    advcloak: [
      { id: "light", name: "Light", epsilon: 0.03, iterations: 10 },
      {
        id: "standard",
        name: "Standard",
        epsilon: 0.05,
        iterations: 15,
        recommended: true,
      },
      { id: "strong", name: "Strong", epsilon: 0.08, iterations: 20 },
    ],
    both: [
      { id: "balanced", name: "Balanced", recommended: true },
      { id: "maximum", name: "Maximum" },
    ],
  };

  // Calculate estimated time
  useEffect(() => {
    let mounted = true;

    const calculateEstimate = async () => {
      try {
        const estimate = await getProcessingTimeEstimate(image, settings);
        if (mounted) setEstimatedTime(estimate);
      } catch (error) {
        logger.warn("Time estimation failed:", error);
        if (mounted) setEstimatedTime({ formatted: "Unknown", seconds: 0 });
      }
    };

    calculateEstimate();
    return () => {
      mounted = false;
    };
  }, [image, settings]);

  const handleMethodChange = (methodId) => {
    let newSettings = { ...settings, method: methodId };

    // Set defaults for each method
    if (methodId === "fawkes") {
      newSettings.fawkesLevel = "mid";
    } else if (methodId === "advcloak") {
      newSettings.advCloakEpsilon = 0.05;
      newSettings.advCloakIterations = 15;
    } else if (methodId === "both") {
      newSettings.fawkesLevel = "mid";
      newSettings.advCloakEpsilon = 0.05;
      newSettings.advCloakIterations = 15;
    }

    onSettingsChange(newSettings);
  };

  const handleStrengthChange = (strengthId) => {
    const options = strengthOptions[settings.method];
    const selected = options.find((o) => o.id === strengthId);
    let newSettings = { ...settings };

    if (settings.method === "fawkes") {
      newSettings.fawkesLevel = strengthId;
    } else if (settings.method === "advcloak") {
      newSettings.advCloakEpsilon = selected.epsilon;
      newSettings.advCloakIterations = selected.iterations;
    } else if (settings.method === "both") {
      if (strengthId === "balanced") {
        newSettings.fawkesLevel = "mid";
        newSettings.advCloakEpsilon = 0.05;
        newSettings.advCloakIterations = 15;
      } else {
        newSettings.fawkesLevel = "high";
        newSettings.advCloakEpsilon = 0.08;
        newSettings.advCloakIterations = 20;
      }
    }

    onSettingsChange(newSettings);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Image Preview */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-1/2">
            <img
              src={URL.createObjectURL(image)}
              alt="Your photo to protect"
              className="w-full h-auto max-h-80 object-contain rounded-lg"
            />
          </div>
          <div className="lg:w-1/2 space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Ready to Protect
              </h2>
              <p className="text-gray-600 text-sm mb-4">
                Choose your protection method below and start processing.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 p-3 rounded">
                <span className="text-gray-600">File:</span>
                <p className="font-medium text-xs break-all">{image.name}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <span className="text-gray-600">Size:</span>
                <p className="font-medium">
                  {(image.size / 1024 / 1024).toFixed(1)} MB
                </p>
              </div>
            </div>

            <div className="p-3 bg-green-50 rounded border border-green-200">
              <p className="text-green-800 text-sm">
                <strong>Private:</strong> Your photo never leaves your device
              </p>
            </div>

            <button
              onClick={onReset}
              className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Choose Different Photo
            </button>
          </div>
        </div>
      </div>

      {/* Settings */}
      <div
        id="protection-settings"
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 scroll-mt-20"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Protection Settings
        </h3>

        {/* Warning */}
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded">
          <p className="text-amber-800 text-sm">
            <strong>Experimental:</strong> These are research techniques with no
            guarantees of effectiveness.
          </p>
        </div>

        {/* Method Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Protection Method
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {methods.map((method) => {
              const Icon = method.icon;
              const isSelected = settings.method === method.id;
              return (
                <button
                  key={method.id}
                  onClick={() => handleMethodChange(method.id)}
                  disabled={isProcessing}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    isSelected
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  } ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Icon className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-gray-900">
                      {method.name}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mb-1">
                    {method.description}
                  </p>
                  <p className="text-gray-500 text-xs">{method.time}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Strength Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Protection Strength
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {strengthOptions[settings.method]?.map((option) => {
              const isSelected =
                settings.method === "fawkes"
                  ? settings.fawkesLevel === option.id
                  : settings.method === "advcloak"
                    ? settings.advCloakEpsilon === option.epsilon
                    : option.recommended; // For 'both' method

              return (
                <button
                  key={option.id}
                  onClick={() => handleStrengthChange(option.id)}
                  disabled={isProcessing}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    isSelected
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  } ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">
                      {option.name}
                    </span>
                    {option.recommended && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        Recommended
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Processing Controls */}
        <div className="space-y-4">
          {/* Progress */}
          {isProcessing && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Processing...
                </span>
                <span className="text-sm text-gray-500">
                  {Math.round(progress)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-2 text-center text-sm text-gray-600">
                {progress < 25 && "Initializing..."}
                {progress >= 25 && progress < 75 && "Applying protection..."}
                {progress >= 75 && "Finalizing..."}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">Error</span>
              </div>
              <p className="text-red-600 mt-1 text-sm">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            {!isProcessing ? (
              <button
                onClick={onProcess}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
              >
                <Play className="w-5 h-5" />
                Start Protection
              </button>
            ) : (
              <button
                onClick={onCancel}
                className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
                Cancel
              </button>
            )}

            <button
              onClick={onReset}
              disabled={isProcessing}
              className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-6 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-5 h-5" />
              Reset
            </button>
          </div>

          {/* Time Estimate */}
          <div className="text-center text-sm text-gray-500">
            Estimated time: {estimatedTime.formatted}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProcessingPanel;
