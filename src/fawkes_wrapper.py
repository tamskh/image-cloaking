"""
Fawkes wrapper for facial recognition cloaking
"""
import os
import subprocess
import tempfile
from pathlib import Path
from typing import Optional, List
import requests
import zipfile
import shutil

class FawkesWrapper:
    def __init__(self, model_dir: str = "models"):
        self.model_dir = Path(model_dir)
        self.model_dir.mkdir(exist_ok=True)
        self.fawkes_dir = self.model_dir / "fawkes"
        
    def setup_fawkes(self) -> bool:
        """Download and setup Fawkes if not already available"""
        print(f"Checking Fawkes in: {self.fawkes_dir}")
        protection_file = self.fawkes_dir / "fawkes" / "protection.py"
        print(f"Looking for protection.py at: {protection_file}")
        
        if protection_file.exists():
            print("Fawkes protection.py found, checking dependencies...")
            # Check if dependencies are available
            if self._check_fawkes_dependencies():
                print("✅ Dependencies OK")
                return True
            else:
                print("Fawkes found but dependencies missing. Installing...")
                return self._install_fawkes_dependencies()
            
        print("Setting up Fawkes...")
        try:
            # Clone Fawkes repository
            cmd = f"git clone https://github.com/Shawn-Shan/fawkes.git {self.fawkes_dir}"
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
            
            if result.returncode != 0:
                print(f"Failed to clone Fawkes: {result.stderr}")
                return False
                
            return self._install_fawkes_dependencies()
                
        except Exception as e:
            print(f"Error setting up Fawkes: {e}")
            return False
    
    def _check_fawkes_dependencies(self) -> bool:
        """Check if Fawkes dependencies are available"""
        try:
            print("Checking MTCNN...")
            import mtcnn
            print("✅ MTCNN OK")
            
            print("Checking TensorFlow...")
            import tensorflow as tf
            print(f"✅ TensorFlow {tf.__version__} OK")
            
            print("Checking Keras...")
            # Check both standalone keras and tf.keras
            try:
                import keras
                print(f"✅ Standalone Keras {keras.__version__} OK")
            except ImportError:
                print("No standalone Keras, checking tf.keras...")
                if hasattr(tf, 'keras'):
                    print("✅ tf.keras available")
                else:
                    raise ImportError("Neither standalone keras nor tf.keras available")
            
            return True
        except ImportError as e:
            print(f"❌ Import error: {e}")
            return False
    
    def _install_fawkes_dependencies(self) -> bool:
        """Install Fawkes and its dependencies"""
        try:
            # Install required packages
            packages = [
                "mtcnn>=0.1.1",
                "opencv-python>=4.5.0",
                "Pillow>=8.0.0",
                "numpy>=1.19.0"
            ]
            
            for package in packages:
                print(f"Installing {package}...")
                cmd = f"pip install {package}"
                result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
                if result.returncode != 0:
                    print(f"Warning: Failed to install {package}: {result.stderr}")
            
            # Install Fawkes requirements if they exist
            req_file = self.fawkes_dir / "requirements.txt"
            if req_file.exists():
                print("Installing Fawkes requirements...")
                cmd = f"pip install -r {req_file}"
                subprocess.run(cmd, shell=True, capture_output=True, text=True)
            
            # Install Fawkes as a package
            print("Installing Fawkes package...")
            cmd = f"pip install -e {self.fawkes_dir}"
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
            
            # Patch Fawkes for TensorFlow compatibility
            self._patch_fawkes_for_tf_compatibility()
            
            # Patch Fawkes for M1/M2 Mac optimizer compatibility
            self._patch_fawkes_for_m1_mac_compatibility()
            
            return self._check_fawkes_dependencies()
            
        except Exception as e:
            print(f"Error installing Fawkes dependencies: {e}")
            return False
    
    def _patch_fawkes_for_tf_compatibility(self):
        """Patch Fawkes utils to handle TensorFlow version compatibility"""
        utils_file = self.fawkes_dir / "fawkes" / "utils.py"
        if not utils_file.exists():
            return
            
        # Read the current utils.py content
        with open(utils_file, 'r') as f:
            content = f.read()
        
        # Add compatibility patch at the beginning
        patch = '''
# TensorFlow/Keras compatibility patch
import tensorflow as tf
from tensorflow import keras
import warnings
warnings.filterwarnings("ignore", category=UserWarning, module="pkg_resources")

# Custom model loader for compatibility
def load_model_with_compatibility(filepath):
    """Load model with compatibility fixes for newer TensorFlow versions"""
    try:
        # First try normal loading
        return keras.models.load_model(filepath)
    except (ValueError, TypeError) as e:
        if "groups" in str(e) and "DepthwiseConv2D" in str(e):
            print(f"Applying compatibility fix for model: {filepath}")
            # Load model and fix the config
            import h5py
            from tensorflow.keras.utils import CustomObjectScope
            
            # Custom DepthwiseConv2D that ignores groups parameter
            class CompatibleDepthwiseConv2D(keras.layers.DepthwiseConv2D):
                def __init__(self, *args, **kwargs):
                    # Remove incompatible 'groups' parameter
                    kwargs.pop('groups', None)
                    super().__init__(*args, **kwargs)
            
            # Try loading with custom object scope
            with CustomObjectScope({'DepthwiseConv2D': CompatibleDepthwiseConv2D}):
                return keras.models.load_model(filepath)
        else:
            raise e

# Monkey patch the original load_extractor function
original_load_extractor = None

'''
        
        # Add the patch if not already present
        if "load_model_with_compatibility" not in content:
            # Find the load_extractor function and patch it
            if "def load_extractor(" in content:
                # Replace keras.models.load_model calls with our compatible version
                content = content.replace(
                    "model = keras.models.load_model(model_file)",
                    "model = load_model_with_compatibility(model_file)"
                )
                
                # Insert the patch at the top after imports
                import_end = content.find('\n\n')
                if import_end > 0:
                    content = content[:import_end] + patch + content[import_end:]
                
                # Write back the patched content
                with open(utils_file, 'w') as f:
                    f.write(content)
                
                print("Applied TensorFlow compatibility patch to Fawkes utils.py")
    
    def _patch_fawkes_for_m1_mac_compatibility(self):
        """Patch Fawkes differentiator to use legacy optimizer for M1/M2 Mac compatibility"""
        diff_file = self.fawkes_dir / "fawkes" / "differentiator.py"
        if not diff_file.exists():
            return
            
        # Read the current differentiator.py content
        with open(diff_file, 'r') as f:
            content = f.read()
        
        # Check if already patched
        if "tf.keras.optimizers.legacy.Adadelta" in content:
            print("M1/M2 Mac compatibility patch already applied")
            return
        
        # Replace the optimizer line
        old_optimizer = "optimizer = tf.keras.optimizers.Adadelta(float(self.learning_rate))"
        new_optimizer = "optimizer = tf.keras.optimizers.legacy.Adadelta(float(self.learning_rate))"
        
        if old_optimizer in content:
            content = content.replace(old_optimizer, new_optimizer)
            
            # Write back the patched content
            with open(diff_file, 'w') as f:
                f.write(content)
            
            print("Applied M1/M2 Mac optimizer compatibility patch to Fawkes differentiator.py")
        else:
            print("Warning: Could not find optimizer line to patch in differentiator.py")
    
    def cloak_image(self, input_path: str, output_path: str, 
                   protection_level: str = "mid") -> bool:
        """
        Apply Fawkes cloaking to an image
        
        Args:
            input_path: Path to input image
            output_path: Path to save cloaked image
            protection_level: low, mid, high
        """
        if not self.setup_fawkes():
            return False
            
        try:
            # Create a temporary directory for processing
            input_file = Path(input_path)
            temp_dir = Path(tempfile.mkdtemp())
            
            # Copy input file to temp directory
            temp_input = temp_dir / input_file.name
            shutil.copy2(input_path, temp_input)
            
            # Use the correct Fawkes script path
            fawkes_script = self.fawkes_dir / "fawkes" / "protection.py"
            
            cmd = [
                "python", str(fawkes_script),
                "--directory", str(temp_dir),
                "--gpu", "0" if self._has_gpu() else "-1",
                "--mode", protection_level
            ]
            
            # Set proper Python path to include Fawkes
            env = os.environ.copy()
            env['PYTHONPATH'] = str(self.fawkes_dir) + ':' + env.get('PYTHONPATH', '')
            
            print(f"Running Fawkes command: {' '.join(cmd)}")
            result = subprocess.run(cmd, capture_output=True, text=True, env=env)
            
            print(f"Fawkes return code: {result.returncode}")
            if result.stdout.strip():
                print(f"Fawkes stdout: {result.stdout}")
            if result.stderr.strip():
                print(f"Fawkes stderr: {result.stderr}")
            
            if result.returncode == 0:
                # Find the cloaked output (Fawkes adds _cloaked suffix)
                input_stem = input_file.stem
                cloaked_patterns = [
                    temp_dir / f"{input_stem}_cloaked.png",
                    temp_dir / f"{input_stem}_cloaked.jpg",
                    temp_dir / f"{input_stem}_cloaked{input_file.suffix}"
                ]
                
                for cloaked_file in cloaked_patterns:
                    if cloaked_file.exists():
                        shutil.copy2(cloaked_file, output_path)
                        # Cleanup temp directory
                        shutil.rmtree(temp_dir)
                        return True
                
                # If no cloaked file found, list what was created
                created_files = list(temp_dir.glob("*"))
                print(f"Fawkes completed but no cloaked file found. Created: {created_files}")
                
            else:
                print(f"Fawkes error (return code {result.returncode}): {result.stderr}")
                print(f"Fawkes stdout: {result.stdout}")
                
            # Cleanup temp directory
            shutil.rmtree(temp_dir)
            return False
            
        except Exception as e:
            print(f"Error running Fawkes: {e}")
            return False
    
    def _has_gpu(self) -> bool:
        """Check if GPU is available"""
        try:
            import torch
            return torch.cuda.is_available()
        except:
            return False 