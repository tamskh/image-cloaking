/**
 * Robust processing time estimator for image cloaking operations
 * Considers image properties, method complexity, and device performance
 */

import { createLogger } from "./logger";

const logger = createLogger("ProcessingEstimator");

// Base processing rates (pixels per second) for different operations
const PROCESSING_RATES = {
  // Face detection rates (pixels/sec) - optimized for web
  faceDetection: {
    fast: 800000, // Modern devices
    medium: 500000, // Average devices
    slow: 300000, // Older devices
  },

  // Adversarial perturbation rates (pixels/sec) - realistic for browser
  fawkesBase: {
    low: 600000,
    mid: 400000,
    high: 250000,
  },

  advCloakIteration: {
    fast: 200000,
    medium: 120000,
    slow: 80000,
  },

  // Overhead times (seconds)
  overhead: {
    initialization: 1,
    faceProcessing: 0.5,
    finalization: 0.5,
    workerSetup: 0.2,
  },
};

// Device performance detection
class DevicePerformance {
  constructor() {
    this.tier = this.detectPerformanceTier();
    this.concurrency = this.detectConcurrency();
  }

  detectPerformanceTier() {
    // Simple heuristics for device performance
    const cores = navigator.hardwareConcurrency || 4;
    const memory = navigator.deviceMemory || 4;

    if (cores >= 8 && memory >= 8) return "fast";
    if (cores >= 4 && memory >= 4) return "medium";
    return "slow";
  }

  detectConcurrency() {
    return Math.min(navigator.hardwareConcurrency || 4, 4);
  }

  getRateMultiplier() {
    switch (this.tier) {
      case "fast":
        return 1.0;
      case "medium":
        return 0.7;
      case "slow":
        return 0.4;
      default:
        return 0.7;
    }
  }
}

// Image analysis for processing complexity
class ImageAnalyzer {
  static getPixelCount(image) {
    // Estimate dimensions if not available
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve(img.width * img.height);
      };
      img.onerror = () => {
        // Fallback estimation based on file size
        const estimatedPixels = Math.min(image.size * 0.3, 2073600); // Max 1920x1080
        resolve(estimatedPixels);
      };
      img.src = URL.createObjectURL(image);
    });
  }

  static getComplexityFactor(image) {
    // Higher resolution = more complexity
    const sizeMB = image.size / (1024 * 1024);

    if (sizeMB > 8) return 1.4; // Very high res
    if (sizeMB > 4) return 1.2; // High res
    if (sizeMB > 2) return 1.0; // Medium res
    if (sizeMB > 0.5) return 0.8; // Low res
    return 0.6; // Very low res
  }
}

// Main estimator class
export class ProcessingTimeEstimator {
  constructor() {
    this.device = new DevicePerformance();
    this.calibrationData = this.loadCalibrationData();
  }

  loadCalibrationData() {
    // Load any stored calibration data from previous runs
    try {
      const stored = localStorage.getItem("cloaking_calibration");
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  async estimateProcessingTime(image, settings) {
    try {
      const pixelCount = await ImageAnalyzer.getPixelCount(image);
      const complexityFactor = ImageAnalyzer.getComplexityFactor(image);
      const rateMultiplier = this.device.getRateMultiplier();

      let totalTime = PROCESSING_RATES.overhead.initialization;

      // Add worker setup if using worker
      if (settings.useWorker !== false) {
        totalTime += PROCESSING_RATES.overhead.workerSetup;
      }

      switch (settings.method) {
        case "fawkes":
          totalTime += this.estimateFawkesTime(
            pixelCount,
            settings.fawkesLevel,
            complexityFactor,
            rateMultiplier,
          );
          break;

        case "advcloak":
          totalTime += this.estimateAdvCloakTime(
            pixelCount,
            settings,
            complexityFactor,
            rateMultiplier,
          );
          break;

        case "both":
          // Sequential processing
          totalTime += this.estimateFawkesTime(
            pixelCount,
            settings.fawkesLevel,
            complexityFactor,
            rateMultiplier,
          );
          totalTime += this.estimateAdvCloakTime(
            pixelCount,
            settings,
            complexityFactor,
            rateMultiplier,
          );
          totalTime += 1.5; // Extra overhead for dual processing
          break;
      }

      totalTime += PROCESSING_RATES.overhead.finalization;

      // Apply calibration if available
      const calibratedTime = this.applyCalibration(
        totalTime,
        settings.method,
        pixelCount,
      );

      // Add safety margin (20-40% depending on complexity)
      const safetyMargin = 1.2 + (complexityFactor - 1) * 0.2;
      const finalTime = Math.ceil(calibratedTime * safetyMargin);

      // Cap at reasonable maximum (5 minutes)
      return Math.min(finalTime, 300);
    } catch (error) {
      logger.warn("Time estimation failed, using fallback:", error);
      return this.getFallbackEstimate(settings);
    }
  }

  estimateFawkesTime(pixelCount, level, complexityFactor, rateMultiplier) {
    // Face detection time
    const faceDetectionTime =
      pixelCount /
      (PROCESSING_RATES.faceDetection[this.device.tier] * rateMultiplier);

    // Face processing time (depends on protection level)
    const faceProcessingRate =
      PROCESSING_RATES.fawkesBase[level] || PROCESSING_RATES.fawkesBase.mid;
    const faceProcessingTime =
      pixelCount / (faceProcessingRate * rateMultiplier * complexityFactor);

    return (
      faceDetectionTime +
      faceProcessingTime +
      PROCESSING_RATES.overhead.faceProcessing
    );
  }

  estimateAdvCloakTime(pixelCount, settings, complexityFactor, rateMultiplier) {
    const iterations = Math.min(settings.advCloakIterations || 15, 25); // Cap at reasonable max
    const iterationRate =
      PROCESSING_RATES.advCloakIteration[this.device.tier] * rateMultiplier;

    // Each iteration processes all pixels
    const timePerIteration = pixelCount / iterationRate;

    // Iterations get slightly faster as they converge
    const iterationEfficiency = 1 - (iterations - 1) * 0.02; // 2% faster per iteration
    const totalIterationTime =
      timePerIteration * iterations * Math.max(iterationEfficiency, 0.7);

    // Epsilon affects complexity (lower epsilon = more iterations needed effectively)
    const epsilonFactor = Math.max(
      0.8,
      Math.min(1.3, 0.05 / (settings.advCloakEpsilon || 0.05)),
    );

    return totalIterationTime * complexityFactor * epsilonFactor;
  }

  applyCalibration(estimatedTime, method, pixelCount) {
    const key = `${method}_${Math.floor(pixelCount / 100000)}`; // Group by 100k pixels
    const calibration = this.calibrationData[key];

    if (calibration && calibration.samples > 2) {
      // Use rolling average with bias toward recent data
      const adjustmentFactor = calibration.actualAvg / calibration.estimatedAvg;
      return estimatedTime * Math.max(0.5, Math.min(2.0, adjustmentFactor));
    }

    return estimatedTime;
  }

  getFallbackEstimate(settings) {
    // Realistic fallback estimates for web processing
    switch (settings.method) {
      case "fawkes":
        return 60; // 1 minute
      case "advcloak":
        return 90; // 1.5 minutes
      case "both":
        return 180; // 3 minutes
      default:
        return 90;
    }
  }

  recordActualTime(method, estimatedTime, actualTime, pixelCount) {
    // Store calibration data for future estimates
    try {
      const key = `${method}_${Math.floor(pixelCount / 100000)}`;

      if (!this.calibrationData[key]) {
        this.calibrationData[key] = {
          estimatedAvg: estimatedTime,
          actualAvg: actualTime,
          samples: 1,
        };
      } else {
        const cal = this.calibrationData[key];
        const newSamples = Math.min(cal.samples + 1, 10); // Keep rolling window

        cal.estimatedAvg =
          (cal.estimatedAvg * (newSamples - 1) + estimatedTime) / newSamples;
        cal.actualAvg =
          (cal.actualAvg * (newSamples - 1) + actualTime) / newSamples;
        cal.samples = newSamples;
      }

      localStorage.setItem(
        "cloaking_calibration",
        JSON.stringify(this.calibrationData),
      );
    } catch (error) {
      logger.warn("Failed to store calibration data:", error);
    }
  }

  formatEstimate(seconds) {
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 300) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    } else {
      const mins = Math.ceil(seconds / 60);
      return `${mins}m`;
    }
  }
}

// Export singleton instance
export const processingEstimator = new ProcessingTimeEstimator();

// Helper function for components
export async function getProcessingTimeEstimate(image, settings) {
  const estimatedSeconds = await processingEstimator.estimateProcessingTime(
    image,
    settings,
  );
  return {
    seconds: estimatedSeconds,
    formatted: processingEstimator.formatEstimate(estimatedSeconds),
    isEstimate: true,
  };
}
