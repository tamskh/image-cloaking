# Image Cloaking Web Interface - Phase 1

A modern, responsive web application for protecting images from AI recognition using client-side processing.

## 🚀 Quick Start

### Prerequisites
- **Node.js 18.x** (recommended) or 16.x-20.x
- npm or yarn
- Modern web browser with Canvas API support

### Installation & Development

```bash
# Navigate to web directory
cd web

# Optional: Use the recommended Node version (if you have nvm)
nvm use

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:3000`

### Troubleshooting

#### Node.js Version Issues
If you encounter installation errors:

1. **Use Node.js 18.x** (recommended):
   ```bash
   nvm install 18.20.0
   nvm use 18.20.0
   ```

2. **Clear npm cache** if switching Node versions:
   ```bash
   npm cache clean --force
   rm -rf node_modules package-lock.json
   npm install
   ```

#### Alternative Package Managers
If npm fails, try yarn:
```bash
yarn install
yarn dev
```

### Production Build

```bash
npm run build
npm run preview
```

## 🎯 Phase 1 Features

### ✅ Implemented
- **Client-side Processing**: 100% browser-based - images never leave your device
- **Dual Protection Methods**:
  - **Fawkes**: Facial recognition protection with adjustable intensity
  - **AdvCloak**: Adversarial perturbations targeting LLM vision models
- **Modern UI/UX**:
  - Drag & drop image upload with validation
  - Real-time processing progress
  - Responsive design for desktop and mobile
  - Minimalist, accessible interface
- **Advanced Settings**:
  - Protection method selection (Fawkes, AdvCloak, or both)
  - Configurable perturbation strength and iterations
  - Quality vs. protection trade-offs
- **Results & Analysis**:
  - Side-by-side comparison views
  - Quality metrics (PSNR, SSIM, MSE, Perceptual Distance)
  - Individual image downloads
  - Batch download functionality

### 🔧 Technical Stack
- **Frontend**: React 18 + Vite
- **Styling**: TailwindCSS with custom design system  
- **Image Processing**: Browser Canvas API + custom JavaScript algorithms
- **File Handling**: HTML5 File API with react-dropzone
- **State Management**: React hooks (useState, useCallback)
- **Icons**: Lucide React (lightweight icon library)
- **Build**: Vite with optimized chunking and tree-shaking
- **Dependencies**: Minimal, browser-only (no native modules)

## 🏗️ Architecture

### Component Structure
```
src/
├── components/
│   ├── Header.jsx              # Navigation and branding
│   ├── ImageUploader.jsx       # Drag-drop upload interface
│   ├── SettingsPanel.jsx       # Advanced configuration
│   ├── ProcessingPanel.jsx     # Progress and controls
│   └── ResultsDisplay.jsx      # Results and comparisons
├── hooks/
│   └── useImageCloaking.js     # Core processing state management
├── utils/
│   ├── imageUtils.js           # Image metrics and utilities
│   └── cloakingEngine.js       # Client-side algorithms
├── App.jsx                     # Main application component
└── main.jsx                    # React entry point
```

### Processing Pipeline

1. **Image Upload**: File validation and preview generation
2. **Settings Configuration**: Method selection and parameter tuning
3. **Client-side Processing**: 
   - Fawkes: Face detection + targeted perturbations
   - AdvCloak: Iterative adversarial optimization
4. **Quality Analysis**: Real-time metrics calculation
5. **Results Display**: Comparison views and download options

## 🛡️ Security & Privacy

### Privacy-First Design
- **No Server Processing**: All image processing happens in your browser
- **No Data Collection**: Images and results are never transmitted or stored
- **Local Storage Only**: Temporary processing data stays on your device
- **GDPR Compliant**: No tracking or personal data handling

### Browser Compatibility
- **Chrome 88+** (recommended)
- **Firefox 85+**
- **Safari 14+**
- **Edge 88+**

**Required Browser Features:**
- Canvas API
- File API
- ES2020 support
- WebGL (for optimal performance)

## ⚙️ Configuration Options

### Fawkes Settings
- **Protection Level**: `low`, `mid`, `high`
- **Target**: Facial recognition systems
- **Approach**: Targeted perturbations in face regions

### AdvCloak Settings
- **Epsilon**: 0.01-0.08 (perturbation strength)
- **Iterations**: 10-50 (optimization steps)
- **Target**: LLM vision models (GPT-4V, Claude Vision, etc.)
- **Approach**: Iterative adversarial optimization

### Output Options
- **Quality Metrics**: Toggle comparison analysis
- **Download Formats**: PNG with preserved quality
- **Batch Processing**: Multiple image downloads

## 📊 Quality Metrics

### PSNR (Peak Signal-to-Noise Ratio)
- **Range**: 20-50+ dB
- **Interpretation**: Higher = better image quality
- **Excellent**: >30 dB

### SSIM (Structural Similarity Index)
- **Range**: 0-1
- **Interpretation**: Higher = more similar to original
- **Excellent**: >0.9

### MSE (Mean Squared Error)
- **Range**: 0+
- **Interpretation**: Lower = less visual difference
- **Good**: <100

### Perceptual Distance
- **Range**: 0+
- **Interpretation**: Lower = less perceivable change
- **Custom metric**: RGB-based approximation

## 🔄 Integration with Phase 0

The web interface leverages algorithms adapted from the CLI implementation:

### From Python CLI → Browser JavaScript
- **Fawkes wrapper** → Client-side face detection + perturbations
- **AdvCloak wrapper** → Browser-based adversarial optimization
- **Comparator utility** → Real-time metrics calculation
- **Batch processing** → Multi-image upload and download

### Performance Optimizations
- **Progressive Enhancement**: Graceful degradation for older browsers
- **Async Processing**: Non-blocking image operations
- **Memory Management**: Efficient canvas operations
- **Chunked Operations**: Prevent UI freezing during processing

## 🚧 Limitations & Future Improvements

### Current Limitations
- **Algorithm Simplification**: Browser implementations are simplified but effective versions
- **Processing Speed**: Slower than native Python implementations (but still real-time)
- **File Size**: Recommended maximum 10MB per image for optimal performance
- **Mobile Performance**: Limited by device computational power (works on modern devices)

### Advantages of Browser-Based Approach
- **Zero Installation**: No Python environment or dependencies required
- **Universal Access**: Works on any device with a modern browser
- **Complete Privacy**: Images never leave your device
- **Cross-Platform**: Works on Windows, macOS, Linux, iOS, Android
- **No Compilation**: Pure JavaScript - no native modules to build

### Phase 2+ Roadmap
- **WebAssembly Integration**: Near-native performance
- **Worker Threads**: Background processing
- **Advanced Models**: More sophisticated detection algorithms
- **Batch Processing**: Multi-image simultaneous processing
- **Cloud Options**: Optional server-side processing
- **Mobile App**: Native iOS/Android versions

## 🤝 Contributing

### Development Setup
```bash
# Install dependencies
npm install

# Run development server with hot reload
npm run dev

# Run linting
npm run lint

# Build for production
npm run build
```

### Code Style
- ESLint configuration for React
- Prettier for code formatting
- TailwindCSS for consistent styling
- Component-based architecture

### Testing
```bash
# Run tests (when available)
npm test

# Run build verification
npm run build && npm run preview
```

## 📄 License

This project is part of the larger Image Cloaking project. See the main repository for license information.

---

**Note**: This is Phase 1 of the web interface. For the full CLI implementation, see the main project directory. 