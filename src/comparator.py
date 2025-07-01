"""
Image comparison and evaluation utilities
"""
import numpy as np
from PIL import Image
import cv2
from skimage.metrics import structural_similarity as ssim
from typing import Dict, Tuple
import matplotlib.pyplot as plt

class CloakingComparator:
    def __init__(self):
        pass
    
    def compare_images(self, original_path: str, cloaked_path: str) -> Dict[str, float]:
        """
        Compare original and cloaked images using multiple metrics
        
        Returns:
            Dictionary with comparison metrics
        """
        # Load images
        original = Image.open(original_path).convert('RGB')
        cloaked = Image.open(cloaked_path).convert('RGB')
        
        # Ensure same size
        cloaked = cloaked.resize(original.size, Image.LANCZOS)
        
        # Convert to arrays
        orig_array = np.array(original)
        cloak_array = np.array(cloaked)
        
        metrics = {}
        
        # Peak Signal-to-Noise Ratio (higher = more similar)
        metrics['psnr'] = self._calculate_psnr(orig_array, cloak_array)
        
        # Structural Similarity Index (higher = more similar)
        metrics['ssim'] = ssim(orig_array, cloak_array, multichannel=True, channel_axis=-1, data_range=255)
        
        # Mean Squared Error (lower = more similar)
        metrics['mse'] = np.mean((orig_array - cloak_array) ** 2)
        
        # Normalized Root Mean Square Error
        metrics['nrmse'] = np.sqrt(metrics['mse']) / (np.max(orig_array) - np.min(orig_array))
        
        # Perceptual distance (simplified)
        metrics['perceptual_distance'] = self._perceptual_distance(orig_array, cloak_array)
        
        return metrics
    
    def _calculate_psnr(self, img1: np.ndarray, img2: np.ndarray) -> float:
        """Calculate Peak Signal-to-Noise Ratio"""
        mse = np.mean((img1 - img2) ** 2)
        if mse == 0:
            return float('inf')
        max_pixel = 255.0
        return 20 * np.log10(max_pixel / np.sqrt(mse))
    
    def _perceptual_distance(self, img1: np.ndarray, img2: np.ndarray) -> float:
        """Calculate a simplified perceptual distance"""
        # Convert to LAB color space for perceptual comparison
        img1_lab = cv2.cvtColor(img1, cv2.COLOR_RGB2LAB)
        img2_lab = cv2.cvtColor(img2, cv2.COLOR_RGB2LAB)
        
        # Calculate Euclidean distance in LAB space
        diff = img1_lab.astype(float) - img2_lab.astype(float)
        return np.mean(np.sqrt(np.sum(diff ** 2, axis=2)))
    
    def generate_comparison_report(self, original_path: str, 
                                 fawkes_path: str, advcloak_path: str,
                                 output_path: str = "comparison_report.png"):
        """Generate visual comparison report"""
        # Load images
        original = Image.open(original_path)
        fawkes = Image.open(fawkes_path) if fawkes_path else None
        advcloak = Image.open(advcloak_path) if advcloak_path else None
        
        # Calculate metrics
        metrics = {}
        if fawkes:
            metrics['fawkes'] = self.compare_images(original_path, fawkes_path)
        if advcloak:
            metrics['advcloak'] = self.compare_images(original_path, advcloak_path)
        
        # Create comparison plot
        fig, axes = plt.subplots(1, 3, figsize=(15, 5))
        
        axes[0].imshow(original)
        axes[0].set_title("Original")
        axes[0].axis('off')
        
        if fawkes:
            axes[1].imshow(fawkes)
            axes[1].set_title(f"Fawkes\nPSNR: {metrics['fawkes']['psnr']:.2f}\nSSIM: {metrics['fawkes']['ssim']:.3f}")
            axes[1].axis('off')
        else:
            axes[1].text(0.5, 0.5, "Fawkes\nNot Available", ha='center', va='center', transform=axes[1].transAxes)
            axes[1].axis('off')
        
        if advcloak:
            axes[2].imshow(advcloak)
            axes[2].set_title(f"AdvCloak\nPSNR: {metrics['advcloak']['psnr']:.2f}\nSSIM: {metrics['advcloak']['ssim']:.3f}")
            axes[2].axis('off')
        else:
            axes[2].text(0.5, 0.5, "AdvCloak\nNot Available", ha='center', va='center', transform=axes[2].transAxes)
            axes[2].axis('off')
        
        plt.tight_layout()
        plt.savefig(output_path, dpi=150, bbox_inches='tight')
        plt.close()
        
        return metrics 