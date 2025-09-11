#!/usr/bin/env node

/**
 * Image Optimization Script
 * Compresses and optimizes images in the public directory
 * Generates WebP and AVIF versions for better performance
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const config = {
  inputDir: path.join(__dirname, '../public'),
  supportedFormats: ['.jpg', '.jpeg', '.png'],
  webpQuality: 85,
  avifQuality: 80,
  jpegQuality: 85,
  pngQuality: 85,
  maxWidth: 2048,
  maxHeight: 2048
};

console.log('🖼️  Image Optimization Script');
console.log('==============================');

/**
 * Check if a command exists
 */
function commandExists(command) {
  try {
    execSync(`which ${command}`, { stdio: 'ignore' });
    return true;
  } catch {
    try {
      execSync(`where ${command}`, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Get file size in human readable format
 */
function getFileSize(filePath) {
  const stats = fs.statSync(filePath);
  const bytes = stats.size;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Find all images in directory
 */
function findImages(dir) {
  const images = [];
  
  function scanDir(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDir(fullPath);
      } else if (config.supportedFormats.includes(path.extname(item).toLowerCase())) {
        images.push(fullPath);
      }
    }
  }
  
  scanDir(dir);
  return images;
}

/**
 * Optimize image using sharp (if available) or imagemagick
 */
async function optimizeImage(inputPath) {
  const ext = path.extname(inputPath).toLowerCase();
  const basename = path.basename(inputPath, ext);
  const dirname = path.dirname(inputPath);
  
  console.log(`📸 Processing: ${path.relative(config.inputDir, inputPath)}`);
  console.log(`   Original size: ${getFileSize(inputPath)}`);
  
  // Check if sharp is available (Node.js image processing)
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.log('   Sharp not available, using ImageMagick fallback');
    return optimizeWithImageMagick(inputPath);
  }
  
  try {
    // Load image
    const image = sharp(inputPath);
    const metadata = await image.metadata();
    
    // Calculate new dimensions if image is too large
    let { width, height } = metadata;
    if (width > config.maxWidth || height > config.maxHeight) {
      const ratio = Math.min(config.maxWidth / width, config.maxHeight / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
      console.log(`   Resizing to: ${width}x${height}`);
    }
    
    // Optimize original format
    if (ext === '.jpg' || ext === '.jpeg') {
      await image
        .resize(width, height)
        .jpeg({ quality: config.jpegQuality, progressive: true })
        .toFile(inputPath + '.tmp');
    } else if (ext === '.png') {
      await image
        .resize(width, height)
        .png({ quality: config.pngQuality, progressive: true })
        .toFile(inputPath + '.tmp');
    }
    
    // Replace original if optimized version is smaller
    const originalSize = fs.statSync(inputPath).size;
    const optimizedSize = fs.statSync(inputPath + '.tmp').size;
    
    if (optimizedSize < originalSize) {
      fs.renameSync(inputPath + '.tmp', inputPath);
      console.log(`   Optimized size: ${getFileSize(inputPath)} (saved ${Math.round((1 - optimizedSize/originalSize) * 100)}%)`);
    } else {
      fs.unlinkSync(inputPath + '.tmp');
      console.log(`   Original was already optimal`);
    }
    
    // Generate WebP version
    const webpPath = path.join(dirname, basename + '.webp');
    if (!fs.existsSync(webpPath)) {
      await image
        .resize(width, height)
        .webp({ quality: config.webpQuality })
        .toFile(webpPath);
      console.log(`   Generated WebP: ${getFileSize(webpPath)}`);
    }
    
    // Generate AVIF version (if supported)
    try {
      const avifPath = path.join(dirname, basename + '.avif');
      if (!fs.existsSync(avifPath)) {
        await image
          .resize(width, height)
          .avif({ quality: config.avifQuality })
          .toFile(avifPath);
        console.log(`   Generated AVIF: ${getFileSize(avifPath)}`);
      }
    } catch (error) {
      console.log(`   AVIF generation failed: ${error.message}`);
    }
    
  } catch (error) {
    console.error(`   Error processing image: ${error.message}`);
  }
}

/**
 * Fallback optimization using ImageMagick
 */
function optimizeWithImageMagick(inputPath) {
  if (!commandExists('magick') && !commandExists('convert')) {
    console.log('   ImageMagick not available, skipping optimization');
    return;
  }
  
  const ext = path.extname(inputPath).toLowerCase();
  const basename = path.basename(inputPath, ext);
  const dirname = path.dirname(inputPath);
  
  try {
    const command = commandExists('magick') ? 'magick' : 'convert';
    
    // Optimize original
    const quality = ext === '.png' ? '95' : '85';
    execSync(`${command} "${inputPath}" -quality ${quality} -strip "${inputPath}.tmp"`);
    
    const originalSize = fs.statSync(inputPath).size;
    const optimizedSize = fs.statSync(inputPath + '.tmp').size;
    
    if (optimizedSize < originalSize) {
      fs.renameSync(inputPath + '.tmp', inputPath);
      console.log(`   Optimized size: ${getFileSize(inputPath)}`);
    } else {
      fs.unlinkSync(inputPath + '.tmp');
      console.log(`   Original was already optimal`);
    }
    
    // Generate WebP
    const webpPath = path.join(dirname, basename + '.webp');
    if (!fs.existsSync(webpPath)) {
      execSync(`${command} "${inputPath}" -quality 85 "${webpPath}"`);
      console.log(`   Generated WebP: ${getFileSize(webpPath)}`);
    }
    
  } catch (error) {
    console.error(`   Error: ${error.message}`);
  }
}

/**
 * Main execution
 */
async function main() {
  if (!fs.existsSync(config.inputDir)) {
    console.error(`❌ Input directory not found: ${config.inputDir}`);
    process.exit(1);
  }
  
  const images = findImages(config.inputDir);
  
  if (images.length === 0) {
    console.log('✅ No images found to optimize');
    return;
  }
  
  console.log(`📁 Found ${images.length} images to process\n`);
  
  for (const imagePath of images) {
    await optimizeImage(imagePath);
    console.log('');
  }
  
  console.log('✅ Image optimization complete!');
  console.log('\n📋 Next steps:');
  console.log('1. Update your components to use the OptimizedImage component');
  console.log('2. Configure your CDN to serve WebP/AVIF when supported');
  console.log('3. Test image loading performance in different browsers');
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { optimizeImage, findImages, getFileSize };