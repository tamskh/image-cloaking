#!/usr/bin/env python3
"""
Simple test script to validate the image cloaking setup
"""
import sys
import importlib
from pathlib import Path

def test_imports():
    """Test if all required modules can be imported"""
    print("🔍 Testing imports...")
    
    required_modules = [
        'torch', 'torchvision', 'tensorflow', 'PIL', 'cv2', 
        'numpy', 'matplotlib', 'skimage', 'click', 'tqdm', 'requests'
    ]
    
    failed_imports = []
    
    for module in required_modules:
        try:
            importlib.import_module(module)
            print(f"  ✅ {module}")
        except ImportError as e:
            print(f"  ❌ {module}: {e}")
            failed_imports.append(module)
    
    if failed_imports:
        print(f"\n❌ Failed to import: {', '.join(failed_imports)}")
        return False
    else:
        print("\n✅ All imports successful!")
        return True

def test_gpu_availability():
    """Test GPU availability (informational only)"""
    print("\n🔧 Testing GPU availability...")
    
    try:
        import torch
        if torch.cuda.is_available():
            print(f"  ✅ CUDA available - {torch.cuda.get_device_name(0)}")
            print(f"  📊 GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f}GB")
        else:
            print("  ⚠️  CUDA not available - will use CPU")
        return True  # GPU availability is not a requirement
    except Exception as e:
        print(f"  ❌ Error checking GPU: {e}")
        return True  # Still not a hard failure

def test_project_structure():
    """Test if project structure is correct"""
    print("\n📁 Testing project structure...")
    
    required_files = [
        'src/__init__.py',
        'src/fawkes_wrapper.py',
        'src/advcloak_wrapper.py', 
        'src/comparator.py',
        'cloak_cli.py',
        'environment.yml'
    ]
    
    missing_files = []
    
    for file_path in required_files:
        if Path(file_path).exists():
            print(f"  ✅ {file_path}")
        else:
            print(f"  ❌ {file_path}")
            missing_files.append(file_path)
    
    if missing_files:
        print(f"\n❌ Missing files: {', '.join(missing_files)}")
        return False
    else:
        print("\n✅ Project structure is correct!")
        return True

def test_cli_help():
    """Test if CLI help works"""
    print("\n🖥️  Testing CLI help...")
    
    try:
        import subprocess
        result = subprocess.run([sys.executable, 'cloak_cli.py', '--help'], 
                              capture_output=True, text=True, timeout=10)
        
        if result.returncode == 0 and 'Image Cloaking CLI' in result.stdout:
            print("  ✅ CLI help works")
            return True
        else:
            print(f"  ❌ CLI help failed: {result.stderr}")
            return False
    except Exception as e:
        print(f"  ❌ Error testing CLI: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 Image Cloaking Setup Test\n")
    
    tests = [
        test_project_structure,
        test_imports,
        test_gpu_availability,
        test_cli_help
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
    
    print(f"\n📊 Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 Setup validation complete! Ready to start Phase 0.")
        print("\nNext steps:")
        print("  1. Run: python cloak_cli.py setup")
        print("  2. Test with an image: python cloak_cli.py cloak <your_image.jpg> --compare")
    else:
        print("\n⚠️  Some tests failed. Please check the issues above.")
        sys.exit(1)

if __name__ == '__main__':
    main() 