## **🎯 Product Vision & Market Positioning**

### **⚠️ IMPORTANT DISCLAIMER**

**This is experimental research technology with significant limitations:**
- No guarantees of effectiveness against real AI systems
- Many modern AI systems may not be affected at all  
- Web implementation uses simplified algorithms compared to research versions
- Results vary greatly and cannot be predicted or tested
- **This is NOT a reliable security or privacy tool**
- Use only for research, experimentation, and educational purposes

* **Elevator pitch**

   "An experimental image privacy research tool – applies research-based techniques that may interfere with some AI vision systems, with varying and unpredictable results."

* **Target users**

  * Everyday individuals concerned about AI surveillance

  * Creators wanting to guard their visual content

  * Companies that care about user privacy and data compliance

* **Core value props**

  * **No-code UI & instant results**: Upload → Cloak → Download

  * **Multi-model protection**: Not just face recognition (Fawkes), but broader image encoders (e.g., CLIP, BLIP, GPT-4V)

  * **Privacy by design**: Client-side processing means no user data is stored—and it aligns with GDPR/C2PA

---

## **🚀 Quick Start**

### **🌐 Web Interface (Recommended)**
```bash
cd web
npm install
npm run dev
# Visit http://localhost:3000
```

### **🖥️ CLI Tool**
```bash
# Setup environment
python -m pip install -r requirements.txt
python cloak_cli.py setup

# Cloak an image
python cloak_cli.py cloak photo.jpg --output-dir output
```

---

## **🔧 Current Implementation**

### **Web Application Features**
- **🔒 100% Client-side Processing**: Images never leave your browser
- **🎯 Three Protection Methods**: 
  - **Fawkes**: Facial recognition protection (requires faces)
  - **AdvCloak**: General AI model protection (works on any image)
  - **Combined**: Maximum protection using both methods
- **📊 Real-time Quality Metrics**: PSNR, SSIM, MSE analysis
- **📱 Works Everywhere**: Any device with a modern web browser
- **⚙️ Advanced Settings**: Customize protection strength and iterations

### **CLI Tool Features**
- **Single Image Processing**: Process individual photos with custom settings
- **Batch Processing**: Process entire folders of images
- **LLM-Proof Mode**: Specialized protection against language model vision systems
- **Comparison Reports**: Visual analysis of protection effectiveness
- **Flexible Settings**: Control protection levels, epsilon values, and iterations

---

## **📖 Usage Guide**

### **Web Interface Usage**

1. **Navigate to the web directory**
   ```bash
   cd web
   npm install && npm run dev
   ```

2. **Open http://localhost:3000 in your browser**

3. **Upload your image** by dragging & dropping or clicking to select

4. **Choose protection method:**
   - **Face Shield**: For photos with people (fastest)
   - **Universal Shield**: For any type of image
   - **Maximum Protection**: Combines both methods (strongest)

5. **Adjust settings** (optional):
   - Protection strength
   - Processing iterations
   - Quality vs. speed trade-offs

6. **Click "Start Protection"** and wait for processing

7. **Download your protected image** when complete

### **CLI Usage**

#### **Basic Commands**
```bash
# Single image with default settings
python cloak_cli.py cloak photo.jpg

# Custom settings
python cloak_cli.py cloak photo.jpg \
  --fawkes-level high \
  --advcloak-epsilon 0.05 \
  --advcloak-iter 20 \
  --compare

# Batch process a folder
python cloak_cli.py batch input_folder --method both

# LLM-targeted protection
python cloak_cli.py llm-proof photo.jpg --strength strong --compare
```

#### **Protection Methods**
- **Fawkes only**: `--skip-advcloak`
- **AdvCloak only**: `--skip-fawkes`
- **Both methods**: Default behavior
- **LLM-proof**: Special command with optimized settings

#### **Settings Reference**
- **Fawkes levels**: `low`, `mid`, `high`
- **AdvCloak epsilon**: 0.01-0.08 (higher = stronger protection)
- **AdvCloak iterations**: 10-50 (more = better protection)

---

## **🔬 Technical Details**

### **Protection Algorithms**
- **Fawkes**: Iterative Fast Gradient Sign Method (I-FGSM) targeting facial recognition
- **AdvCloak**: Fast Gradient Sign Method (FGSM) targeting general vision models
- **Combined**: Sequential application for comprehensive protection

### **Web Implementation**
- **Frontend**: React + Vite + TailwindCSS
- **Processing**: TensorFlow.js + MediaPipe for browser-based AI
- **Face Detection**: MediaPipe BlazeFace model
- **Architecture**: Web Workers for non-blocking processing

### **CLI Implementation**
- **Python**: Click-based command interface
- **Dependencies**: PyTorch, OpenCV, NumPy
- **Models**: Downloads Fawkes repository and pre-trained models
- **Metrics**: PSNR, SSIM, MSE for quality assessment

---

## **📋 Requirements**

### **Web Application**
- Modern web browser (Chrome 80+, Firefox 78+, Safari 14+, Edge 80+)
- WebGL support (for optimal performance)
- JavaScript enabled
- No server or installation required

### **CLI Tool**
- Python 3.8+
- 4GB+ RAM recommended
- GPU optional (CUDA for faster processing)
- Git (for downloading Fawkes)

### **Installation**
```bash
# Clone repository
git clone <repository-url>
cd image-cloaking-tool

# Install CLI dependencies
pip install -r requirements.txt

# Setup CLI tool
python cloak_cli.py setup

# Install web dependencies
cd web
npm install
```

---

## **❓ FAQ**

**Q: Does this protect against all AI systems?**
A: No. This is experimental research technology with limited effectiveness. Many modern AI systems may not be affected. Results vary greatly and cannot be predicted.

**Q: Which method should I use?**
A: For photos with people, try Fawkes first. For general images or maximum protection, use AdvCloak or Combined mode.

**Q: How long does processing take?**
A: Web: 1-3 minutes depending on image size and device. CLI: 30 seconds to 5 minutes depending on settings and hardware.

**Q: Is my data safe?**
A: Yes. The web version processes everything in your browser - images never leave your device. The CLI processes locally on your machine.

**Q: Can I use this commercially?**
A: This is research software. Check the licenses of underlying components (Fawkes, research papers) before commercial use.

---

## **🏗️ Project Structure**

```
image-cloaking-tool/
├── README.md                    # This file
├── cloak_cli.py                # Main CLI interface
├── requirements.txt            # Python dependencies
├── environment.yml             # Conda environment
├── src/                        # CLI implementation
│   ├── fawkes_wrapper.py       # Fawkes integration
│   ├── advcloak_wrapper.py     # AdvCloak implementation
│   └── comparator.py           # Quality metrics
└── web/                        # Web application
    ├── README.md               # Web-specific documentation
    ├── package.json            # Node.js dependencies
    ├── src/                    # React application
    └── dist/                   # Built web app
```

---

**Ready to protect your images? Try the [web interface](web/) for instant results or use the [CLI tool](cloak_cli.py) for advanced features!**

