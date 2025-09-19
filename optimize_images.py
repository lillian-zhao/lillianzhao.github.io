#!/usr/bin/env python3
"""
Image optimization script for the website
Reduces image resolution and file size for better web loading performance
"""

import os
from PIL import Image
import glob

def optimize_image(input_path, output_path=None, max_width=800, max_height=600, quality=85):
    """
    Optimize a single image by resizing and compressing
    """
    if output_path is None:
        output_path = input_path
    
    try:
        # Open the image
        with Image.open(input_path) as img:
            # Convert to RGB if necessary (for JPEG)
            if img.mode in ('RGBA', 'P'):
                img = img.convert('RGB')
            
            # Calculate new dimensions while maintaining aspect ratio
            img.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
            
            # Save with optimization
            if output_path.lower().endswith('.jpg') or output_path.lower().endswith('.jpeg'):
                img.save(output_path, 'JPEG', quality=quality, optimize=True)
            elif output_path.lower().endswith('.png'):
                img.save(output_path, 'PNG', optimize=True)
            else:
                img.save(output_path, quality=quality, optimize=True)
            
            print(f"✓ Optimized: {input_path}")
            return True
            
    except Exception as e:
        print(f"✗ Error optimizing {input_path}: {str(e)}")
        return False

def optimize_folder(folder_path, max_width=800, max_height=600, quality=85):
    """
    Optimize all images in a folder
    """
    if not os.path.exists(folder_path):
        print(f"Folder not found: {folder_path}")
        return
    
    print(f"\nOptimizing images in: {folder_path}")
    
    # Get all image files
    image_extensions = ['*.jpg', '*.jpeg', '*.JPG', '*.JPEG', '*.png', '*.PNG']
    image_files = []
    
    for extension in image_extensions:
        image_files.extend(glob.glob(os.path.join(folder_path, extension)))
    
    if not image_files:
        print(f"No images found in {folder_path}")
        return
    
    optimized_count = 0
    for image_file in image_files:
        if optimize_image(image_file, max_width=max_width, max_height=max_height, quality=quality):
            optimized_count += 1
    
    print(f"Optimized {optimized_count}/{len(image_files)} images in {folder_path}")

def main():
    """
    Main function to optimize all images
    """
    print("Starting image optimization...")
    
    # Define the folders to optimize
    folders_to_optimize = [
        'img/toronto',
        'img/fourthJuly', 
        'img/ohiopyle',
        'img/apt',
        'img/dc',
        'img/cancun',
        'img'  # For the art images (img1.png, etc.)
    ]
    
    # Optimization settings
    max_width = 1296
    max_height = 1080
    quality = 92
    
    print(f"Settings: max_width={max_width}, max_height={max_height}, quality={quality}")
    
    total_optimized = 0
    
    for folder in folders_to_optimize:
        if os.path.exists(folder):
            optimize_folder(folder, max_width, max_height, quality)
        else:
            print(f"Folder not found: {folder}")
    
    print("\nImage optimization completed!")

if __name__ == "__main__":
    main()
