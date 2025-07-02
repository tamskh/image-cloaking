# Image Cloaking Web Interface

A browser-based adversarial image protection system that applies imperceptible perturbations to protect privacy against AI recognition systems. Built with **TensorFlow.js**, **MediaPipe**, and **React**.

## 🚀 Quick Start

```bash
npm install && npm run dev
```

The application runs entirely in the browser - no server required for processing.

## 🏗️ Architecture Overview

### Core Processing Pipeline

```
Image Upload → Face Detection → Adversarial Generation → Perturbation Application → Result
     ↓              ↓                   ↓                      ↓              ↓
   Validation   MediaPipe         TensorFlow.js         Tensor Clipping    Quality Metrics
```

### Protection Methods

#### 1. **Fawkes Protection** 
- **Algorithm**: Iterative Fast Gradient Sign Method (I-FGSM)
- **Target**: Facial recognition systems
- **Requirement**: Face detection required
- **Parameters**: 
  - Low: ε=0.02, 5 iterations
  - Medium: ε=0.03, 10 iterations  
  - High: ε=0.05, 15 iterations
- **Best for**: Social media photos, profile pictures

#### 2. **AdvCloak Protection**
- **Algorithm**: Single-step Fast Gradient Sign Method (FGSM)
- **Target**: General vision AI models (including LLMs)
- **Requirement**: No face detection needed
- **Parameters**: Configurable epsilon (0.02-0.08) and iterations (1-50)
- **Best for**: Documents, screenshots, general images

#### 3. **Combined Protection**
- **Process**: Sequential application (Fawkes → AdvCloak)
- **Protection**: Maximum coverage against multiple AI systems
- **Trade-off**: Longer processing time, requires faces

## 🔧 Technical Implementation

### Face Detection System
- **Engine**: MediaPipe BlazeFace (short-range model)
- **Model**: Google's optimized face detection for selfies/close-ups
- **Output**: Bounding boxes, confidence scores, 6 facial keypoints
- **Threshold**: 0.5 detection confidence, 0.3 NMS suppression

### Adversarial Attack Implementation
- **Framework**: TensorFlow.js with WebGL/CPU backends
- **Surrogate Model**: CNN architecture (Conv2D + GlobalAvgPool + Dense)
- **Gradient Computation**: Automatic differentiation for loss gradients
- **Perturbation Bounds**: Epsilon-ball constraint with pixel value clipping

### Processing Architectures

#### Web Worker Processing (Default)
```
Main Thread                    Web Worker
     │                            │
     ├─ Face Detection             │
     ├─ Send Image + Faces ────────┤
     │                             ├─ TensorFlow.js Init
     │                             ├─ Adversarial Generation  
     │                             ├─ Tensor Processing
     ├─ Receive Result ────────────┤
     ├─ Quality Metrics            │
     └─ Display Result             │
```

#### Main Thread Fallback
- Automatic fallback on worker initialization failure
- UI yield points to prevent blocking
- Same processing quality with responsive interface

### Memory Management
- **Tensor Lifecycle**: Automatic disposal after operations
- **Cleanup Strategy**: Explicit memory management with `tf.tidy()`
- **Resource Limits**: Image resizing for WebGL texture constraints
- **Garbage Collection**: Forced cleanup after processing completion

## 📊 Quality & Performance

### Image Quality Metrics
- **PSNR**: Peak Signal-to-Noise Ratio (>30dB typical)
- **SSIM**: Structural Similarity Index (>0.95 typical)  
- **MSE**: Mean Squared Error (pixel-level differences)
- **Perceptual Distance**: RGB distance approximation

### Performance Optimization
- **Device Detection**: Hardware capability assessment
- **Processing Estimation**: Smart time prediction based on image complexity
- **Adaptive Compression**: Quality-based JPEG output (70-95% quality)
- **Memory Limits**: Conservative texture size limits (4096px max dimension)

### Processing Time Estimates
| Method | Small Image (1MP) | Medium Image (4MP) | Large Image (8MP) |
|--------|-------------------|-------------------|-------------------|
| Fawkes | 15-30s | 30-60s | 60-120s |
| AdvCloak | 10-25s | 25-50s | 50-100s |
| Combined | 30-60s | 60-120s | 120-240s |

*Times vary based on device performance and selected parameters*

## 🛠️ Development Guide

### Project Structure
```
src/
├── components/          # React UI components
│   ├── ImageUploader.jsx      # Drag & drop upload
│   ├── ProcessingPanel.jsx    # Settings & controls
│   ├── ResultsDisplay.jsx     # Output visualization
│   └── SettingsPanel.jsx      # Method configuration
├── hooks/
│   └── useImageCloaking.js    # Main processing hook
├── utils/
│   ├── cloakingEngine.js      # TensorFlow.js processing
│   ├── cloakingWorker.js      # Web Worker implementation
│   ├── imageUtils.js          # Image manipulation utilities
│   ├── processingEstimator.js # Performance prediction
│   └── logger.js              # Debug logging system
└── main.jsx                   # Application entry point
```

### Key Components

#### `useImageCloaking` Hook
Central state management for the entire processing pipeline:
- **State**: Processing status, progress, results, error handling
- **Methods**: `processImage()`, `cancelProcessing()`, `resetResults()`
- **Features**: Worker/main thread coordination, automatic fallback, progress tracking

#### `cloakingEngine.js`
Core TensorFlow.js implementation:
- **Initialization**: Backend selection (WebGL → CPU fallback)
- **Face Detection**: MediaPipe integration
- **Attack Classes**: `FGSMAttack`, `IterativeFGSMAttack` with surrogate models
- **Image Conversion**: DataURL ↔ Tensor with proper normalization

#### `cloakingWorker.js`
Background processing implementation:
- **Isolation**: Complete TensorFlow.js instance in worker context
- **Communication**: Message-based task distribution
- **Memory Management**: Aggressive cleanup and monitoring
- **Error Handling**: Graceful fallback to main thread

### Configuration Options

#### Fawkes Settings
```javascript
{
  method: 'fawkes',
  fawkesLevel: 'mid',     // 'low' | 'mid' | 'high'
}
```

#### AdvCloak Settings  
```javascript
{
  method: 'advcloak',
  advCloakEpsilon: 0.05,      // Perturbation strength (0.02-0.08)
  advCloakIterations: 15      // Processing iterations (1-50)
}
```

#### Combined Settings
```javascript
{
  method: 'both',
  fawkesLevel: 'mid',
  advCloakEpsilon: 0.05,
  advCloakIterations: 15
}
```

### Error Handling Strategy

#### Graceful Degradation
1. **WebGL Backend Failure** → CPU Backend
2. **Web Worker Failure** → Main Thread Processing
3. **Face Detection Failure** → Method restriction (AdvCloak only)
4. **Memory Issues** → Image resizing + retry

#### User-Friendly Errors
- Clear error messages for common issues
- Automatic retry mechanisms where appropriate
- Fallback processing modes
- Progress feedback during long operations

## 🔬 Research Foundation

### Academic References
- **FGSM**: [Explaining and Harnessing Adversarial Examples](https://arxiv.org/abs/1412.6572) (Goodfellow et al.)
- **Fawkes**: [Protecting Privacy against Unauthorized Deep Learning Models](https://www.usenix.org/conference/usenixsecurity20/presentation/shan) (Shan et al.)
- **AdvCloak**: Advanced perturbation techniques for vision transformer protection

### Implementation Notes
- **Surrogate Models**: CNN architectures to approximate target model gradients
- **Transferability**: Adversarial examples transfer across different model architectures
- **Epsilon Constraints**: Bounded perturbations to maintain image quality
- **Iterative Refinement**: Multi-step attacks for stronger perturbations

## 🚀 Production Deployment

### Build Configuration
```bash
npm run build          # Production build
npm run preview        # Preview build locally
```

### Performance Considerations
- **CDN Delivery**: TensorFlow.js and MediaPipe models loaded from CDN
- **Caching Strategy**: Browser caching for models and static assets
- **Memory Monitoring**: Built-in memory usage tracking and warnings
- **Device Adaptation**: Automatic quality/speed adjustments based on hardware

### Browser Compatibility
- **Modern Browsers**: Chrome 80+, Firefox 78+, Safari 14+, Edge 80+
- **WebGL Support**: Required for optimal performance
- **Web Workers**: Required for non-blocking processing
- **File API**: Required for image upload and processing

## 🐛 Debugging

### Debug Mode
Enable detailed logging by setting localStorage:
```javascript
localStorage.setItem('debug', 'true')
```

### Common Issues
1. **"WebGL backend failed"** → Browser WebGL disabled/unsupported
2. **"Worker not available"** → HTTPS required or worker blocked
3. **"No faces detected"** → Image lacks detectable faces (use AdvCloak)
4. **"Out of memory"** → Image too large (resize to <4MP)

### Development Tools
- **Browser DevTools**: Monitor tensor memory usage
- **Performance Tab**: Profile TensorFlow.js operations
- **Network Tab**: Track model loading progress
- **Console Logs**: Detailed processing pipeline information

## 📈 Future Enhancements

### Planned Features
- **Additional Attack Methods**: PGD, C&W attacks for stronger protection
- **Batch Processing**: Multiple image processing pipeline
- **Custom Models**: User-uploadable surrogate models
- **API Integration**: Optional cloud processing for heavy computations

### Research Integrations
- **LowKey Attack**: Implementation based on recent research
- **Robust Training**: Adversarial training aware processing
- **Adaptive Attacks**: Dynamic perturbation adjustment
- **Quality Optimization**: Perceptual loss minimization

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. **Code Style**: Follow existing patterns and ESLint configuration
2. **Testing**: Ensure cross-browser compatibility
3. **Documentation**: Update README for API changes
4. **Performance**: Profile changes for memory/speed impact

### Development Commands
```bash
npm run dev          # Development server
npm run build        # Production build  
npm run preview      # Preview production build
npm run lint         # ESLint checking
```

---

**Built with modern web technologies for privacy protection through adversarial machine learning** 🛡️ 