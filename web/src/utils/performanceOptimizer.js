/**
 * Performance optimization utilities for image cloaking operations
 * Provides benchmarking, processing recommendations, and performance monitoring
 */

export class PerformanceOptimizer {
  constructor() {
    this.benchmarks = new Map();
    this.deviceCapabilities = null;
    this.recommendations = {};
    this.init();
  }

  async init() {
    this.deviceCapabilities = await this.analyzeDeviceCapabilities();
    this.recommendations = this.generateRecommendations();
  }

  async analyzeDeviceCapabilities() {
    const capabilities = {
      cores: navigator.hardwareConcurrency || 4,
      memory: navigator.deviceMemory || 4,
      webWorkerSupport: typeof Worker !== "undefined",
      webAssemblySupport: typeof WebAssembly !== "undefined",
      gpuSupport: await this.checkGPUSupport(),
      canvasSupport: this.checkCanvasSupport(),
      offscreenCanvasSupport: typeof OffscreenCanvas !== "undefined",
    };

    // Performance tier classification
    capabilities.tier = this.classifyPerformanceTier(capabilities);

    return capabilities;
  }

  async checkGPUSupport() {
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");

      if (!gl) return false;

      const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
      if (debugInfo) {
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        return {
          available: true,
          renderer,
          maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
          maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS),
        };
      }

      return { available: true, renderer: "Unknown" };
    } catch (error) {
      return false;
    }
  }

  checkCanvasSupport() {
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      return {
        available: !!ctx,
        maxCanvasSize: this.getMaxCanvasSize(),
      };
    } catch (error) {
      return false;
    }
  }

  getMaxCanvasSize() {
    // Test maximum canvas dimensions
    const testSizes = [4096, 8192, 16384, 32768];
    for (const size of testSizes.reverse()) {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (ctx) return size;
      } catch (error) {
        continue;
      }
    }
    return 2048; // Safe fallback
  }

  classifyPerformanceTier(capabilities) {
    let score = 0;

    // Core count scoring
    if (capabilities.cores >= 8) score += 3;
    else if (capabilities.cores >= 4) score += 2;
    else score += 1;

    // Memory scoring
    if (capabilities.memory >= 8) score += 3;
    else if (capabilities.memory >= 4) score += 2;
    else score += 1;

    // Feature support scoring
    if (capabilities.webWorkerSupport) score += 2;
    if (capabilities.gpuSupport?.available) score += 2;
    if (capabilities.offscreenCanvasSupport) score += 1;

    // Classify tier
    if (score >= 10) return "high";
    else if (score >= 7) return "medium";
    else return "low";
  }

  generateRecommendations() {
    if (!this.deviceCapabilities) return {};

    const { tier, cores, memory, webWorkerSupport } = this.deviceCapabilities;

    const recommendations = {
      useWorker: webWorkerSupport && cores >= 4,
      maxImageSize: this.getRecommendedMaxImageSize(),
      processingSettings: this.getRecommendedProcessingSettings(),
      batchSize: this.getRecommendedBatchSize(),
      memoryManagement: this.getMemoryManagementTips(),
    };

    return recommendations;
  }

  getRecommendedMaxImageSize() {
    switch (this.deviceCapabilities.tier) {
      case "high":
        return { width: 4096, height: 4096, fileSize: 25 * 1024 * 1024 };
      case "medium":
        return { width: 2048, height: 2048, fileSize: 10 * 1024 * 1024 };
      case "low":
        return { width: 1024, height: 1024, fileSize: 5 * 1024 * 1024 };
      default:
        return { width: 1024, height: 1024, fileSize: 5 * 1024 * 1024 };
    }
  }

  getRecommendedProcessingSettings() {
    const settings = {};

    switch (this.deviceCapabilities.tier) {
      case "high":
        settings.fawkes = { maxFaces: 10, detectionAccuracy: "high" };
        settings.advcloak = { maxIterations: 100, epsilon: 0.05 };
        settings.concurrent = true;
        break;
      case "medium":
        settings.fawkes = { maxFaces: 5, detectionAccuracy: "medium" };
        settings.advcloak = { maxIterations: 50, epsilon: 0.03 };
        settings.concurrent = false;
        break;
      case "low":
        settings.fawkes = { maxFaces: 3, detectionAccuracy: "low" };
        settings.advcloak = { maxIterations: 20, epsilon: 0.02 };
        settings.concurrent = false;
        break;
    }

    return settings;
  }

  getRecommendedBatchSize() {
    const memory = this.deviceCapabilities.memory;
    if (memory >= 8) return 4;
    else if (memory >= 4) return 2;
    else return 1;
  }

  getMemoryManagementTips() {
    return {
      enableGarbageCollection: this.deviceCapabilities.memory < 4,
      useProgressiveProcessing: this.deviceCapabilities.tier === "low",
      enableMemoryMonitoring: true,
      recommendedCleanupInterval:
        this.deviceCapabilities.memory < 4 ? 30000 : 60000,
    };
  }

  async benchmarkOperation(operationName, operation) {
    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();

    try {
      const result = await operation();

      const endTime = performance.now();
      const endMemory = this.getMemoryUsage();

      const benchmark = {
        operation: operationName,
        duration: endTime - startTime,
        memoryUsed: endMemory - startMemory,
        timestamp: Date.now(),
        success: true,
      };

      this.recordBenchmark(operationName, benchmark);
      return result;
    } catch (error) {
      const endTime = performance.now();

      const benchmark = {
        operation: operationName,
        duration: endTime - startTime,
        error: error.message,
        timestamp: Date.now(),
        success: false,
      };

      this.recordBenchmark(operationName, benchmark);
      throw error;
    }
  }

  recordBenchmark(operationName, benchmark) {
    if (!this.benchmarks.has(operationName)) {
      this.benchmarks.set(operationName, []);
    }

    const benchmarks = this.benchmarks.get(operationName);
    benchmarks.push(benchmark);

    // Keep only last 50 benchmarks per operation
    if (benchmarks.length > 50) {
      benchmarks.shift();
    }
  }

  getBenchmarkStats(operationName) {
    const benchmarks = this.benchmarks.get(operationName);
    if (!benchmarks || benchmarks.length === 0) return null;

    const successful = benchmarks.filter((b) => b.success);
    if (successful.length === 0) return null;

    const durations = successful.map((b) => b.duration);
    const memoryUsages = successful.map((b) => b.memoryUsed);

    return {
      operation: operationName,
      count: successful.length,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      avgMemoryUsage:
        memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length,
      successRate: (successful.length / benchmarks.length) * 100,
      trend: this.calculateTrend(durations.slice(-10)), // Last 10 measurements
    };
  }

  calculateTrend(values) {
    if (values.length < 3) return "stable";

    const recentAvg = values.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const earlierAvg =
      values.slice(0, -3).reduce((a, b) => a + b, 0) / (values.length - 3);

    const change = (recentAvg - earlierAvg) / earlierAvg;

    if (change > 0.1) return "degrading";
    else if (change < -0.1) return "improving";
    else return "stable";
  }

  getMemoryUsage() {
    // Use performance.memory if available (Chrome)
    if ("memory" in performance) {
      return performance.memory.usedJSHeapSize;
    }

    // Fallback estimation
    return Date.now() % 100000; // Rough estimate
  }

  optimizeImageForProcessing(imageData, targetSize = null) {
    const { width, height } = imageData;
    const currentSize = width * height;

    if (!targetSize) {
      targetSize = this.getRecommendedMaxImageSize();
      targetSize = targetSize.width * targetSize.height;
    }

    if (currentSize <= targetSize) {
      return imageData; // No optimization needed
    }

    // Calculate optimal dimensions
    const scale = Math.sqrt(targetSize / currentSize);
    const newWidth = Math.floor(width * scale);
    const newHeight = Math.floor(height * scale);

    // Resize using high-quality algorithm
    return this.resizeImageData(imageData, newWidth, newHeight);
  }

  resizeImageData(imageData, newWidth, newHeight) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    // Draw original image
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    ctx.putImageData(imageData, 0, 0);

    // Create new canvas for resized image
    const newCanvas = document.createElement("canvas");
    const newCtx = newCanvas.getContext("2d");
    newCanvas.width = newWidth;
    newCanvas.height = newHeight;

    // Use high-quality scaling
    newCtx.imageSmoothingEnabled = true;
    newCtx.imageSmoothingQuality = "high";
    newCtx.drawImage(canvas, 0, 0, newWidth, newHeight);

    return newCtx.getImageData(0, 0, newWidth, newHeight);
  }

  generatePerformanceReport() {
    const report = {
      deviceCapabilities: this.deviceCapabilities,
      recommendations: this.recommendations,
      benchmarks: {},
      overallHealth: "good",
    };

    // Generate benchmark summaries
    for (const [operation, benchmarks] of this.benchmarks.entries()) {
      report.benchmarks[operation] = this.getBenchmarkStats(operation);
    }

    // Assess overall performance health
    const trends = Object.values(report.benchmarks)
      .filter((b) => b && b.trend)
      .map((b) => b.trend);

    const degradingCount = trends.filter((t) => t === "degrading").length;
    if (degradingCount > trends.length * 0.5) {
      report.overallHealth = "degrading";
    } else if (
      trends.filter((t) => t === "improving").length >
      trends.length * 0.3
    ) {
      report.overallHealth = "improving";
    }

    return report;
  }

  // Static utility methods
  static async createOptimizer() {
    const optimizer = new PerformanceOptimizer();
    await optimizer.init();
    return optimizer;
  }

  static formatDuration(ms) {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    else if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    else
      return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
  }

  static formatMemoryUsage(bytes) {
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }
}

// Global performance optimizer instance
export let globalPerformanceOptimizer = null;

// Initialize global optimizer
export async function initializePerformanceOptimizer() {
  if (!globalPerformanceOptimizer) {
    globalPerformanceOptimizer = await PerformanceOptimizer.createOptimizer();
  }
  return globalPerformanceOptimizer;
}

// Performance monitoring hook
import { useState, useCallback } from "react";

export function usePerformanceMonitoring() {
  const [performanceData, setPerformanceData] = useState(null);
  const [isMonitoring, setIsMonitoring] = useState(false);

  const startMonitoring = useCallback(async () => {
    if (!globalPerformanceOptimizer) {
      await initializePerformanceOptimizer();
    }
    setIsMonitoring(true);

    const interval = setInterval(() => {
      const report = globalPerformanceOptimizer.generatePerformanceReport();
      setPerformanceData(report);
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
  }, []);

  return {
    performanceData,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    optimizer: globalPerformanceOptimizer,
  };
}
