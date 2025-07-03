# Image Privacy Web App

A browser-based photo protection tool that applies research-based techniques to make photos harder for some AI systems to analyze. Built with **React**, **TensorFlow.js**, and **MediaPipe**.

## 🚀 Quick Start

```bash
npm install && npm run dev
```

Visit **http://localhost:3000** - no server required, everything runs in your browser!

## 🛡️ How It Works

The app applies imperceptible changes to your photos that may confuse AI recognition systems while keeping them perfectly clear to humans. Think of it as "photo camouflage" for AI.

### Protection Methods

#### 1. **Face Shield** 
- **Best for**: Photos with people, selfies, profile pictures
- **Protects against**: Facial recognition systems  
- **Requirement**: Faces must be detected in the image
- **Speed**: Fast (1-2 minutes)

#### 2. **Universal Shield**
- **Best for**: Any image - documents, artwork, screenshots
- **Protects against**: General AI vision models (including ChatGPT, Claude)
- **Requirement**: Works on any image type
- **Speed**: Medium (2-3 minutes)

#### 3. **Maximum Protection**
- **Best for**: Important photos needing strongest protection
- **Protects against**: Multiple AI system types
- **Requirement**: Must have detectable faces
- **Speed**: Slower (3-5 minutes)

## 📱 Features

- **🔒 100% Private**: Your photos never leave your device
- **🌐 Works Anywhere**: Any modern web browser, any device
- **📊 Quality Metrics**: See exactly how your photo changed
- **⚙️ Custom Settings**: Adjust protection strength vs. image quality
- **📥 Easy Download**: Get your protected photos instantly

## 🎯 Who Should Use This?

**⚠️ Important**: This is **experimental research technology**. It may not work against many modern AI systems, and effectiveness varies greatly. Use only for research and experimentation.

**Good candidates:**
- Content creators protecting artwork
- Privacy-conscious individuals
- Researchers studying adversarial AI
- Anyone wanting to experiment with AI privacy techniques

**Not suitable for:**
- Critical security applications
- Guaranteed protection needs
- Commercial privacy solutions

## 🔧 Technical Implementation

### Architecture Overview

```
Upload Image → Face Detection → Apply Protection → Quality Check → Download
     ↓              ↓                   ↓              ↓           ↓
  Drag & Drop   MediaPipe         TensorFlow.js    Metrics    Protected Image
```

### Core Technologies

- **React 18**: Modern UI with hooks-based state management
- **TensorFlow.js**: Client-side machine learning for protection algorithms
- **MediaPipe**: Face detection using Google's BlazeFace model
- **Web Workers**: Non-blocking processing for smooth user experience
- **Vite**: Fast development and optimized production builds

### Protection Algorithms

#### Face Shield (Fawkes-style)
- **Algorithm**: Iterative Fast Gradient Sign Method (I-FGSM)
- **Target**: Facial recognition neural networks
- **Parameters**: 
  - Low: ε=0.02, 5 iterations
  - Medium: ε=0.03, 10 iterations  
  - High: ε=0.05, 15 iterations

#### Universal Shield (AdvCloak-style)
- **Algorithm**: Fast Gradient Sign Method (FGSM)
- **Target**: General vision transformers and CNNs
- **Parameters**: Configurable epsilon (0.02-0.08) and iterations (1-50)

### Performance & Compatibility

#### Browser Support
- **Chrome 80+** ✅ (Recommended)
- **Firefox 78+** ✅
- **Safari 14+** ✅ 
- **Edge 80+** ✅

#### Requirements
- **WebGL Support**: For fast processing (falls back to CPU)
- **Web Workers**: For non-blocking UI (falls back to main thread)
- **File API**: For image upload and download
- **Modern JavaScript**: ES2020+ features

#### Processing Times
| Image Size | Face Shield | Universal Shield | Maximum Protection |
|-----------|-------------|------------------|-------------------|
| Small (1MP) | 15-30s | 10-25s | 30-60s |
| Medium (4MP) | 30-60s | 25-50s | 60-120s |
| Large (8MP) | 60-120s | 50-100s | 120-240s |

*Times vary based on device performance*

## 🛠️ Development

### Project Structure
```
src/
├── components/          # React UI components
│   ├── ImageUploader.jsx      # Drag & drop interface
│   ├── ProcessingPanel.jsx    # Settings & controls
│   ├── ResultsDisplay.jsx     # Output visualization
│   └── SettingsPanel.jsx      # Method configuration
├── hooks/
│   └── useImageCloaking.js    # Main processing logic
└── utils/
    ├── cloakingEngine.js      # TensorFlow.js algorithms
    ├── cloakingWorker.js      # Web Worker processing
    ├── imageUtils.js          # Image manipulation
    └── processingEstimator.js # Performance prediction
```

### Key Components

#### `useImageCloaking` Hook
Central state management for processing:
- Coordinates Web Worker vs. main thread processing
- Handles progress tracking and error recovery
- Manages memory cleanup and resource allocation

#### `cloakingEngine.js`
Core protection implementation:
- TensorFlow.js backend initialization (WebGL → CPU fallback)
- Face detection with MediaPipe BlazeFace
- Adversarial attack algorithms with surrogate models
- Quality metrics calculation (PSNR, SSIM, MSE)

### Configuration Options

```javascript
// Face Shield settings
{
  method: 'fawkes',
  fawkesLevel: 'mid'     // 'low' | 'mid' | 'high'
}

// Universal Shield settings  
{
  method: 'advcloak',
  advCloakEpsilon: 0.05,      // Strength (0.02-0.08)
  advCloakIterations: 15      // Quality (1-50)
}

// Maximum Protection settings
{
  method: 'both',
  fawkesLevel: 'mid',
  advCloakEpsilon: 0.05,
  advCloakIterations: 15
}
```

### Error Handling & Fallbacks

The app gracefully handles various failure scenarios:

1. **WebGL Issues** → Automatic CPU fallback
2. **Web Worker Problems** → Main thread processing
3. **Face Detection Failure** → Universal Shield only
4. **Memory Constraints** → Image resizing + retry
5. **Network Issues** → All processing is local

## 🐛 Debugging

### Enable Debug Mode
```javascript
localStorage.setItem('debug', 'true')
// Reload page to see detailed logs
```

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "WebGL backend failed" | Browser WebGL disabled | Enable WebGL or use CPU fallback |
| "Worker not available" | HTTPS required | Use HTTPS or disable workers |
| "No faces detected" | Image lacks faces | Use Universal Shield instead |
| "Out of memory" | Image too large | Resize image to <4MP |

## 🔬 Research Foundation

### Academic Papers
- **FGSM**: [Explaining and Harnessing Adversarial Examples](https://arxiv.org/abs/1412.6572) (Goodfellow et al.)
- **Fawkes**: [Protecting Privacy against Unauthorized Deep Learning Models](https://www.usenix.org/conference/usenixsecurity20/presentation/shan) (Shan et al.)

### Implementation Notes
- **Surrogate Models**: CNN architectures approximate target model behavior
- **Transferability**: Adversarial examples often transfer between different AI models
- **Epsilon Constraints**: Perturbations bounded to maintain visual quality
- **Iterative Refinement**: Multiple attack steps for stronger protection

## 📦 Build & Deploy

### Development Commands
```bash
npm run dev          # Start development server
npm run build        # Production build  
npm run preview      # Preview production build
npm run lint         # Check code quality
```

### Production Build
```bash
npm run build
# Creates optimized build in dist/ folder
# Includes code splitting, minification, and asset optimization
```

### Deployment
The built app is completely static - deploy the `dist/` folder to any web host:
- **Netlify/Vercel**: Drag & drop the dist folder
- **GitHub Pages**: Upload dist contents
- **Any web server**: Serve static files from dist/

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature-name`
3. **Make your changes** following existing code patterns
4. **Test thoroughly** across different browsers
5. **Submit a pull request** with a clear description

### Code Style
- Follow existing React patterns and component structure
- Use meaningful variable names and comments
- Ensure cross-browser compatibility
- Profile performance changes

---

**Built for privacy protection through adversarial machine learning** 🛡️ 

*Remember: This is experimental research technology. While it may interfere with some AI systems, it cannot guarantee protection against all current or future AI models.*