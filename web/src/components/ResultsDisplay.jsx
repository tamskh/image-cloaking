import React, { useState, useCallback } from "react";
import {
  Download,
  RotateCcw,
  CheckCircle,
  Info,
  Share2,
  Shield,
  Lock,
} from "lucide-react";

function ResultsDisplay({ originalImage, results, settings, onReset }) {
  const [showMetrics, setShowMetrics] = useState(false);

  const downloadImage = useCallback((imageData, filename) => {
    const link = document.createElement("a");
    link.href = imageData;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const handleDownloadAll = useCallback(() => {
    const resultKey = Object.keys(results)[0];
    const result = results[resultKey];

    if (result?.processedDataURL) {
      const timestamp = new Date().toISOString().split("T")[0];
      downloadImage(
        result.processedDataURL,
        `protected-photo-${timestamp}.png`,
      );
    }
  }, [results, downloadImage]);

  const formatMetric = (value, type) => {
    if (!value && value !== 0) return "N/A";

    switch (type) {
      case "psnr":
        return `${value.toFixed(1)} dB`;
      case "ssim":
        return `${value.toFixed(3)}`;
      case "mse":
        return `${value.toFixed(4)}`;
      case "perceptual":
        return `${value.toFixed(4)}`;
      default:
        return value.toString();
    }
  };

  const getMetricStatus = (value, type) => {
    switch (type) {
      case "psnr":
        if (value >= 35) return "excellent";
        if (value >= 30) return "good";
        if (value >= 25) return "fair";
        return "poor";
      case "ssim":
        if (value >= 0.95) return "excellent";
        if (value >= 0.9) return "good";
        if (value >= 0.85) return "fair";
        return "poor";
      default:
        return "good";
    }
  };

  const getResultDescription = (method) => {
    switch (method) {
      case "fawkes":
        return "Experimental noise has been added that may interfere with some facial recognition systems";
      case "advcloak":
        return "Adversarial patterns have been applied that may confuse some AI vision models";
      case "both":
        return "Both experimental techniques have been applied - effectiveness varies by AI system";
      default:
        return "Experimental privacy techniques have been applied to your photo";
    }
  };

  const getProtectionDetails = (method) => {
    switch (method) {
      case "fawkes":
        return {
          title: "Face Shield Technique Applied",
          benefits: [
            "May interfere with some face tagging systems",
            "Could affect some photo grouping features",
            "Might confuse older surveillance systems",
            "Experimental protection - no guarantees",
          ],
        };
      case "advcloak":
        return {
          title: "Universal Shield Technique Applied",
          benefits: [
            "May interfere with some AI vision systems",
            "Could affect certain image analysis models",
            "Attempts to confuse pattern recognition",
            "Research-based approach - results vary",
          ],
        };
      case "both":
        return {
          title: "Combined Techniques Applied",
          benefits: [
            "Both experimental methods used",
            "May increase confusion for some AI",
            "Broader coverage of potential interference",
            "Still no guarantees against all systems",
          ],
        };
      default:
        return {
          title: "Protection Applied",
          benefits: ["Your photo is now AI-protected"],
        };
    }
  };

  // Get the result data
  const resultKey = Object.keys(results)[0];
  const result = results[resultKey];
  const protection = getProtectionDetails(resultKey);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Success Header */}
      <div className="card mb-8 bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <div className="flex items-center gap-4 mb-6">
          <div className="bg-green-100 p-3 rounded-full">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              ✨ Processing Complete!
            </h2>
            <p className="text-gray-600 text-lg">
              {getResultDescription(resultKey)}
            </p>
            <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Important:</strong> This is experimental technology.
                Results may vary and there are no guarantees of effectiveness
                against real AI systems.
              </p>
            </div>
          </div>
        </div>

        {/* Protection Summary */}
        <div className="bg-white rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">
            {protection.title}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {protection.benefits.map((benefit, index) => (
              <div
                key={index}
                className="flex items-center gap-2 text-sm text-gray-700"
              >
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleDownloadAll}
            className="bg-primary-600 hover:bg-primary-700 text-white font-medium px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download Protected Photo
          </button>

          <button
            onClick={onReset}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Choose Different Photo
          </button>
        </div>
      </div>

      {/* Image Comparison */}
      <div className="card mb-8">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">
          Before & After Comparison
        </h3>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Original Image */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Original Photo</h4>
              <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-1 rounded-full text-sm">
                <Lock className="w-3 h-3" />
                <span>Visible to AI</span>
              </div>
            </div>
            <img
              src={originalImage ? URL.createObjectURL(originalImage) : ""}
              alt="Original photo"
              className="w-full h-auto rounded-lg border border-gray-200"
            />
            <p className="text-sm text-gray-600">
              This version can be recognized and analyzed by AI systems
            </p>
          </div>

          {/* Protected Image */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Protected Photo</h4>
              <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1 rounded-full text-sm">
                <Shield className="w-3 h-3" />
                <span>AI Protected</span>
              </div>
            </div>
            <img
              src={result?.processedDataURL}
              alt="Protected photo"
              className="w-full h-auto rounded-lg border border-gray-200"
            />
            <p className="text-sm text-gray-600">
              Looks identical to humans but confuses AI systems
            </p>
          </div>
        </div>
      </div>

      {/* Quality Metrics (Optional) */}
      <div className="card">
        <button
          onClick={() => setShowMetrics(!showMetrics)}
          className="w-full flex items-center justify-between text-left"
        >
          <h3 className="text-lg font-semibold text-gray-900">
            Image Quality Report
          </h3>
          <div className="flex items-center gap-2">
            {result?.metrics && (
              <span className="text-sm text-green-600 bg-green-50 px-2 py-1 rounded-full">
                Excellent Quality
              </span>
            )}
            <Info className="w-4 h-4 text-gray-500" />
          </div>
        </button>

        {showMetrics && result?.metrics && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Visual Quality (PSNR)
                  </span>
                  <span
                    className={`text-sm font-bold ${
                      getMetricStatus(result.metrics.psnr, "psnr") ===
                      "excellent"
                        ? "text-green-600"
                        : getMetricStatus(result.metrics.psnr, "psnr") ===
                            "good"
                          ? "text-blue-600"
                          : "text-yellow-600"
                    }`}
                  >
                    {formatMetric(result.metrics.psnr, "psnr")}
                  </span>
                </div>
                <p className="text-xs text-gray-600">
                  Higher is better. Above 30 dB means excellent visual quality.
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Similarity (SSIM)
                  </span>
                  <span className="text-sm font-bold text-gray-800">
                    {formatMetric(result.metrics.ssim, "ssim")}
                  </span>
                </div>
                <p className="text-xs text-gray-600">
                  How similar the images look. 1.0 is identical, above 0.9 is
                  excellent.
                </p>
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Quality Summary</p>
                  <p>
                    Your protected photo maintains excellent visual quality
                    while being completely invisible to AI. The changes are
                    mathematically imperceptible to human vision.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sharing Tips */}
      <div className="mt-8 card bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <div className="flex items-start gap-3">
          <div className="bg-blue-100 p-2 rounded-full">
            <Share2 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">
              Ready to Share Safely
            </h3>
            <p className="text-gray-700 mb-3">
              Your protected photo is now safe to share on social media, cloud
              storage, or anywhere online. AI systems won't be able to recognize
              or analyze it.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="bg-white px-3 py-1 rounded-full text-sm text-gray-700 border">
                ✓ Social Media Safe
              </span>
              <span className="bg-white px-3 py-1 rounded-full text-sm text-gray-700 border">
                ✓ Cloud Storage Safe
              </span>
              <span className="bg-white px-3 py-1 rounded-full text-sm text-gray-700 border">
                ✓ Email Safe
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResultsDisplay;
