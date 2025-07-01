#!/usr/bin/env python3
"""
Image Cloaking CLI - Phase 0 Prototype
Wraps Fawkes + AdvCloak for image protection and comparison
"""
import click
import os
from pathlib import Path
import json
from typing import Optional

from src.fawkes_wrapper import FawkesWrapper
from src.advcloak_wrapper import AdvCloakWrapper
from src.comparator import CloakingComparator

@click.group()
@click.version_option(version="0.1.0")
def cli():
    """Image Cloaking CLI - Protect your images from AI recognition"""
    pass

@cli.command()
@click.argument('input_image', type=click.Path(exists=True))
@click.option('--output-dir', '-o', default='output', help='Output directory')
@click.option('--fawkes-level', default='mid', type=click.Choice(['low', 'mid', 'high']), 
              help='Fawkes protection level')
@click.option('--advcloak-epsilon', default=0.03, type=float, help='AdvCloak perturbation strength (0.01-0.05 for strong AI protection)')
@click.option('--advcloak-iter', default=20, type=int, help='AdvCloak optimization iterations (10-30 for stronger attacks)')
@click.option('--skip-fawkes', is_flag=True, help='Skip Fawkes processing')
@click.option('--skip-advcloak', is_flag=True, help='Skip AdvCloak processing')
@click.option('--compare', is_flag=True, help='Generate comparison report')
def cloak(input_image, output_dir, fawkes_level, advcloak_epsilon, advcloak_iter, 
          skip_fawkes, skip_advcloak, compare):
    """Cloak an image using Fawkes and/or AdvCloak"""
    
    input_path = Path(input_image)
    output_path = Path(output_dir)
    output_path.mkdir(exist_ok=True)
    
    # Output file paths
    fawkes_output = output_path / f"{input_path.stem}_fawkes.png"
    advcloak_output = output_path / f"{input_path.stem}_advcloak.png"
    
    click.echo(f"Processing: {input_image}")
    click.echo(f"Output directory: {output_dir}")
    
    # Initialize wrappers
    results = {
        'input': str(input_path),
        'fawkes': {'success': False, 'output': None},
        'advcloak': {'success': False, 'output': None}
    }
    
    # Run Fawkes
    if not skip_fawkes:
        click.echo("\n🎭 Running Fawkes facial cloaking...")
        fawkes = FawkesWrapper()
        
        with click.progressbar(length=100, label='Fawkes processing') as bar:
            success = fawkes.cloak_image(str(input_path), str(fawkes_output), fawkes_level)
            bar.update(100)
            
        if success:
            click.echo(f"✅ Fawkes completed: {fawkes_output}")
            results['fawkes'] = {'success': True, 'output': str(fawkes_output)}
        else:
            click.echo("❌ Fawkes failed")
    
    # Run AdvCloak  
    if not skip_advcloak:
        click.echo("\n🛡️  Running AdvCloak adversarial cloaking...")
        advcloak = AdvCloakWrapper()
        
        with click.progressbar(length=100, label='AdvCloak processing') as bar:
            success = advcloak.cloak_image(str(input_path), str(advcloak_output), 
                                         advcloak_epsilon, advcloak_iter)
            bar.update(100)
            
        if success:
            click.echo(f"✅ AdvCloak completed: {advcloak_output}")
            results['advcloak'] = {'success': True, 'output': str(advcloak_output)}
        else:
            click.echo("❌ AdvCloak failed")
    
    # Generate comparison
    if compare and (results['fawkes']['success'] or results['advcloak']['success']):
        click.echo("\n📊 Generating comparison report...")
        comparator = CloakingComparator()
        
        report_path = output_path / f"{input_path.stem}_comparison.png"
        metrics = comparator.generate_comparison_report(
            str(input_path),
            results['fawkes']['output'] if results['fawkes']['success'] else None,
            results['advcloak']['output'] if results['advcloak']['success'] else None,
            str(report_path)
        )
        
        click.echo(f"📊 Comparison report saved: {report_path}")
        
        # Print metrics
        for method, metric_dict in metrics.items():
            click.echo(f"\n{method.upper()} Metrics:")
            for metric, value in metric_dict.items():
                click.echo(f"  {metric}: {value:.4f}")
    
    # Save results JSON
    results_path = output_path / f"{input_path.stem}_results.json"
    with open(results_path, 'w') as f:
        json.dump(results, f, indent=2)
    
    click.echo(f"\n✅ Results saved to: {results_path}")

@cli.command()
@click.argument('original', type=click.Path(exists=True))
@click.argument('cloaked', type=click.Path(exists=True))
def compare(original, cloaked):
    """Compare original and cloaked images"""
    
    click.echo(f"Comparing images...")
    click.echo(f"Original: {original}")  
    click.echo(f"Cloaked: {cloaked}")
    
    comparator = CloakingComparator()
    metrics = comparator.compare_images(original, cloaked)
    
    click.echo("\nComparison Metrics:")
    for metric, value in metrics.items():
        click.echo(f"  {metric}: {value:.4f}")

@cli.command()
def setup():
    """Setup dependencies and models"""
    click.echo("Setting up image cloaking environment...")
    
    # Create directories
    Path("models").mkdir(exist_ok=True)
    Path("output").mkdir(exist_ok=True)
    
    # Setup Fawkes
    click.echo("Setting up Fawkes...")
    fawkes = FawkesWrapper()
    if fawkes.setup_fawkes():
        click.echo("✅ Fawkes setup complete")
    else:
        click.echo("❌ Fawkes setup failed")
    
    click.echo("✅ Setup complete!")

@cli.command()
@click.argument('input_dir', type=click.Path(exists=True))
@click.option('--output-dir', '-o', default='batch_output', help='Output directory')
@click.option('--method', type=click.Choice(['fawkes', 'advcloak', 'both']), default='both')
def batch(input_dir, output_dir, method):
    """Process multiple images in batch"""
    
    input_path = Path(input_dir)
    output_path = Path(output_dir)
    output_path.mkdir(exist_ok=True)
    
    # Find image files
    image_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff'}
    image_files = [f for f in input_path.iterdir() 
                   if f.suffix.lower() in image_extensions]
    
    if not image_files:
        click.echo("No image files found in input directory")
        return
    
    click.echo(f"Found {len(image_files)} images to process")
    
    with click.progressbar(image_files, label='Processing images') as bar:
        for img_file in bar:
            try:
                # Use the cloak command for each file
                from click.testing import CliRunner
                runner = CliRunner()
                
                args = [str(img_file), '--output-dir', str(output_path)]
                if method == 'fawkes':
                    args.append('--skip-advcloak')
                elif method == 'advcloak':
                    args.append('--skip-fawkes')
                
                runner.invoke(cloak, args)
                
            except Exception as e:
                click.echo(f"Error processing {img_file}: {e}")

@cli.command()
@click.argument('input_image', type=click.Path(exists=True))
@click.option('--output-dir', '-o', default='output', help='Output directory')
@click.option('--strength', type=click.Choice(['medium', 'strong', 'maximum']), default='strong',
              help='Protection strength against LLMs')
@click.option('--compare', is_flag=True, help='Generate comparison report')
def llm_proof(input_image, output_dir, strength, compare):
    """
    Specialized mode for protecting against LLM vision models (ChatGPT, Claude, etc.)
    
    NOTE: Complete invisibility to LLMs is extremely difficult. This mode aims to:
    - Reduce LLM confidence and accuracy
    - Cause misclassification or degraded analysis  
    - Make the image "harder" for LLMs to understand
    
    Strength levels:
    - medium: Balanced protection with good image quality
    - strong: Higher protection, some visible artifacts  
    - maximum: Maximum protection, noticeable image degradation
    """
    
    input_path = Path(input_image)
    output_path = Path(output_dir)
    output_path.mkdir(exist_ok=True)
    
    # Configure parameters based on strength
    if strength == 'medium':
        epsilon, iterations = 0.05, 50
    elif strength == 'strong':
        epsilon, iterations = 0.08, 75
    else:  # maximum
        epsilon, iterations = 0.12, 100
    
    click.echo(f"🤖 LLM-Proof Mode: {strength.upper()} protection")
    click.echo(f"Processing: {input_image}")
    click.echo(f"Parameters: epsilon={epsilon}, iterations={iterations}")
    click.echo(f"⚠️  Note: Complete LLM invisibility is extremely difficult with current technology")
    
    # Output file paths
    advcloak_output = output_path / f"{input_path.stem}_llmproof_{strength}.png"
    
    # Run enhanced AdvCloak
    click.echo("\n🛡️  Running LLM-targeted adversarial cloaking...")
    advcloak = AdvCloakWrapper()
    
    with click.progressbar(length=100, label=f'LLM protection ({strength})') as bar:
        success = advcloak.cloak_image(str(input_path), str(advcloak_output), 
                                     epsilon, iterations)
        bar.update(100)
        
    if success:
        click.echo(f"✅ LLM-proof image completed: {advcloak_output}")
        
        # Generate comparison if requested
        if compare:
            click.echo("\n📊 Generating comparison report...")
            comparator = CloakingComparator()
            
            report_path = output_path / f"{input_path.stem}_llmproof_{strength}_comparison.png"
            metrics = comparator.generate_comparison_report(
                str(input_path), None, str(advcloak_output), str(report_path)
            )
            
            click.echo(f"📊 Comparison report saved: {report_path}")
            click.echo(f"\nLLM-PROOF Metrics:")
            for metric, value in metrics['advcloak'].items():
                click.echo(f"  {metric}: {value:.4f}")
                
        click.echo(f"\n🎯 Test this image with ChatGPT/Claude to see protection effectiveness!")
        click.echo(f"📝 Expected results: Reduced accuracy, wrong descriptions, or 'cannot analyze' responses")
            
    else:
        click.echo("❌ LLM-proof processing failed")

if __name__ == '__main__':
    cli() 