"""
AdvCloak wrapper for broader AI model adversarial cloaking
"""
import torch
import torch.nn as nn
import torchvision.transforms as transforms
from PIL import Image
import numpy as np
from typing import Optional, Tuple
import cv2

class AdvCloakWrapper:
    def __init__(self, device: str = "auto"):
        self.device = self._get_device(device)
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], 
                               std=[0.229, 0.224, 0.225])
        ])
        self.inv_transform = transforms.Compose([
            transforms.Normalize(mean=[-0.485/0.229, -0.456/0.224, -0.406/0.225],
                               std=[1/0.229, 1/0.224, 1/0.225]),
            transforms.ToPILImage()
        ])
        
    def _get_device(self, device: str) -> torch.device:
        if device == "auto":
            return torch.device("cuda" if torch.cuda.is_available() else "cpu")
        return torch.device(device)
    
    def generate_adversarial_noise(self, image: Image.Image, 
                                 epsilon: float = 0.05,  # Stronger for LLMs
                                 iterations: int = 50) -> np.ndarray:  # More iterations for LLMs
        """
        Generate stronger adversarial noise specifically targeting LLM vision encoders
        
        Args:
            image: PIL Image
            epsilon: Perturbation magnitude (higher values for LLM protection)
            iterations: Number of optimization steps (more for stronger attacks)
        """
        # Convert to tensor and normalize
        img_array = np.array(image) / 255.0  # Normalize to 0-1
        img_tensor = torch.FloatTensor(img_array).permute(2, 0, 1).unsqueeze(0).to(self.device)
        
        # Get ensemble of models for stronger attack
        models = self._get_ensemble_models()
        
        # Create model input preparation function
        def prepare_for_model(x):
            """Prepare image tensor for model input"""
            # Resize to model input size
            resized = torch.nn.functional.interpolate(x, size=(224, 224), mode='bilinear', align_corners=False)
            # Apply ImageNet normalization
            normalize = transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
            return normalize(resized.squeeze(0)).unsqueeze(0)
        
        # Get original predictions for ensemble attack
        original_preds = []
        original_features = []
        with torch.no_grad():
            original_input = prepare_for_model(img_tensor)
            for model in models:
                try:
                    if hasattr(model, 'encode_image'):  # CLIP model
                        features = model.encode_image(original_input)
                        original_features.append(features)
                    else:
                        pred = model(original_input)
                        if pred.dim() > 1:
                            pred = pred.argmax(1)
                        original_preds.append(pred)
                except Exception as e:
                    print(f"Warning: Model prediction failed: {e}")
                    continue
        
        # Initialize perturbation
        delta = torch.zeros_like(img_tensor, requires_grad=True, device=self.device)
        alpha = epsilon / iterations
        
        # Enhanced PGD iterations with ensemble attack targeting LLMs
        for i in range(iterations):
            # Apply current perturbation
            perturbed = img_tensor + delta
            perturbed = torch.clamp(perturbed, 0, 1)
            
            # Prepare for model
            model_input = prepare_for_model(perturbed)
            
            # Enhanced ensemble attack - compute loss across all models
            total_loss = 0
            loss_count = 0
            
            for j, model in enumerate(models):
                try:
                    if hasattr(model, 'encode_image'):  # CLIP model
                        # For CLIP, maximize feature distance
                        perturbed_features = model.encode_image(model_input)
                        if j < len(original_features):
                            # Cosine similarity loss - minimize similarity
                            cos_sim = torch.nn.functional.cosine_similarity(
                                perturbed_features, original_features[j], dim=-1
                            )
                            feature_loss = cos_sim.mean()  # Minimize similarity
                            total_loss += feature_loss
                            loss_count += 1
                    else:
                        # For classification models
                        outputs = model(model_input)
                        if j < len(original_preds):
                            # Use multiple loss types for stronger attack
                            ce_loss = nn.CrossEntropyLoss()(outputs, original_preds[j])
                            # Add confidence reduction loss
                            conf_loss = torch.mean(torch.max(torch.softmax(outputs, dim=1), dim=1)[0])
                            total_loss += ce_loss + 0.5 * conf_loss
                            loss_count += 1
                except Exception as e:
                    continue
            
            if loss_count == 0:
                print(f"Warning: No valid models for iteration {i}")
                break
                
            # Backward pass
            total_loss.backward(retain_graph=True)
            
            # Update perturbation
            with torch.no_grad():
                if delta.grad is not None:
                    # Apply gradient ascent to maximize loss (reduce confidence/similarity)
                    grad_sign = delta.grad.sign()
                    delta.data = delta.data + alpha * grad_sign
                    
                    # Project perturbation to l_infinity ball
                    delta.data = torch.clamp(delta.data, -epsilon, epsilon)
                    
                    # Clear gradients for next iteration
                    delta.grad.zero_()
        
        # Return final perturbation
        final_perturbation = delta.detach().cpu().numpy().squeeze().transpose(1, 2, 0)
        return final_perturbation
    
    def cloak_image(self, input_path: str, output_path: str,
                   epsilon: float = 0.03, iterations: int = 20) -> bool:
        """
        Apply AdvCloak-style cloaking to an image with minimal visual changes
        
        Args:
            input_path: Path to input image
            output_path: Path to save cloaked image  
            epsilon: Perturbation strength (small values for imperceptible changes)
            iterations: Optimization iterations
        """
        try:
            # Load image
            image = Image.open(input_path).convert('RGB')
            
            # Generate subtle adversarial noise
            noise = self.generate_adversarial_noise(image, epsilon, iterations)
            
            # Apply noise to original image (no resizing!)
            img_array = np.array(image) / 255.0
            cloaked_array = np.clip(img_array + noise, 0, 1)
            
            # Convert back to PIL (preserving original dimensions)
            cloaked_image = Image.fromarray((cloaked_array * 255).astype(np.uint8))
            
            # Save
            cloaked_image.save(output_path)
            return True
            
        except Exception as e:
            print(f"Error in AdvCloak processing: {e}")
            return False
    
    def _get_ensemble_models(self):
        """Get ensemble of models for stronger adversarial generation targeting LLMs"""
        models = []
        
        try:
            import torchvision.models as torchmodels
            
            # Load multiple architectures for ensemble attack, focusing on LLM vision encoders
            model_configs = [
                ('resnet50', torchmodels.resnet50, 'IMAGENET1K_V1'),
                ('efficientnet_b0', torchmodels.efficientnet_b0, 'IMAGENET1K_V1'),
                ('vit_b_16', torchmodels.vit_b_16, 'IMAGENET1K_V1'),  # Similar to CLIP ViT
                ('vit_l_16', torchmodels.vit_l_16, 'IMAGENET1K_V1'),  # Larger ViT for LLMs
                ('swin_t', torchmodels.swin_t, 'IMAGENET1K_V1'),      # Swin Transformer
            ]
            
            # Try to load CLIP if available for direct LLM targeting
            try:
                import clip
                print("Loading CLIP model for direct LLM vision targeting...")
                clip_model, clip_preprocess = clip.load("ViT-B/32", device=self.device)
                clip_model.eval()
                for param in clip_model.parameters():
                    param.requires_grad = False
                models.append(clip_model.visual)  # Use visual encoder
                print("✅ CLIP ViT-B/32 loaded for LLM targeting")
            except ImportError:
                print("⚠️  CLIP not available, using ViT proxies")
            
            for name, model_fn, weights in model_configs:
                try:
                    print(f"Loading {name} for ensemble attack...")
                    model = model_fn(weights=weights)
                    model.eval()
                    model.to(self.device)
                    
                    # Disable gradients for model parameters
                    for param in model.parameters():
                        param.requires_grad = False
                        
                    models.append(model)
                    print(f"✅ {name} loaded successfully")
                    
                except Exception as e:
                    print(f"❌ Failed to load {name}: {e}")
                    continue
                    
        except Exception as e:
            print(f"Warning: Could not load torchvision models: {e}")
        
        # If no models loaded, use fallback
        if not models:
            print("Using fallback simple model...")
            model = nn.Sequential(
                nn.Conv2d(3, 64, 3, padding=1),
                nn.ReLU(),
                nn.AdaptiveAvgPool2d((1, 1)),
                nn.Flatten(),
                nn.Linear(64, 1000)
            ).to(self.device)
            
            for param in model.parameters():
                param.requires_grad = False
                
            models.append(model)
            
        print(f"Ensemble attack using {len(models)} models")
        return models 