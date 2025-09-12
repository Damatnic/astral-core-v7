#!/usr/bin/env node

/**
 * Bundle Size Checker
 * Validates bundle sizes against predefined limits for production deployment
 */

const fs = require('fs');
const path = require('path');

// Bundle size limits (in bytes)
const BUNDLE_SIZE_LIMITS = {
  'pages/_app.js': 250 * 1024, // 250KB
  'pages/index.js': 100 * 1024, // 100KB
  'chunks/framework.js': 130 * 1024, // 130KB
  'chunks/main.js': 50 * 1024, // 50KB
  'chunks/commons.js': 200 * 1024, // 200KB
  total: 2 * 1024 * 1024 // 2MB total
};

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  firstLoadJS: 300 * 1024, // 300KB for First Load JS
  allChunksSize: 2 * 1024 * 1024 // 2MB for all chunks
};

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function checkBundleSizes() {
  const buildDir = path.join(process.cwd(), '.next');
  const manifestPath = path.join(buildDir, '.next-static-chunks-manifest.json');
  
  if (!fs.existsSync(manifestPath)) {
    console.log('❌ Build manifest not found. Run npm run build first.');
    process.exit(1);
  }

  let hasViolations = false;
  let totalSize = 0;
  const violations = [];
  const report = [];

  try {
    // Read build manifest
    const buildManifest = JSON.parse(
      fs.readFileSync(path.join(buildDir, 'build-manifest.json'), 'utf8')
    );

    // Check individual bundle sizes
    const staticDir = path.join(buildDir, 'static');
    const chunksDir = path.join(staticDir, 'chunks');
    
    if (fs.existsSync(chunksDir)) {
      const chunkFiles = fs.readdirSync(chunksDir);
      
      chunkFiles.forEach(file => {
        if (file.endsWith('.js')) {
          const filePath = path.join(chunksDir, file);
          const stats = fs.statSync(filePath);
          const size = stats.size;
          totalSize += size;

          // Check against known limits
          const limitKey = Object.keys(BUNDLE_SIZE_LIMITS).find(key => 
            file.includes(key.replace('.js', ''))
          );

          if (limitKey && BUNDLE_SIZE_LIMITS[limitKey]) {
            const limit = BUNDLE_SIZE_LIMITS[limitKey];
            const ratio = size / limit;
            
            if (size > limit) {
              hasViolations = true;
              violations.push({
                file,
                size,
                limit,
                excess: size - limit,
                ratio
              });
            }

            report.push({
              file,
              size,
              limit,
              ratio,
              status: size > limit ? 'EXCEED' : 'OK'
            });
          }
        }
      });
    }

    // Check total bundle size
    if (totalSize > BUNDLE_SIZE_LIMITS.total) {
      hasViolations = true;
      violations.push({
        file: 'TOTAL BUNDLE',
        size: totalSize,
        limit: BUNDLE_SIZE_LIMITS.total,
        excess: totalSize - BUNDLE_SIZE_LIMITS.total,
        ratio: totalSize / BUNDLE_SIZE_LIMITS.total
      });
    }

    // Generate report
    console.log('\n📊 Bundle Size Analysis Report\n');
    console.log('=====================================');

    if (report.length > 0) {
      console.log('\n📦 Individual Bundle Analysis:');
      report.forEach(({ file, size, limit, ratio, status }) => {
        const statusIcon = status === 'OK' ? '✅' : '❌';
        const percentage = ((ratio - 1) * 100).toFixed(1);
        console.log(
          `${statusIcon} ${file}: ${formatBytes(size)} / ${formatBytes(limit)} ` +
          `(${percentage > 0 ? '+' : ''}${percentage}%)`
        );
      });
    }

    console.log(`\n📏 Total Bundle Size: ${formatBytes(totalSize)}`);
    console.log(`📋 Total Size Limit: ${formatBytes(BUNDLE_SIZE_LIMITS.total)}`);

    // Performance recommendations
    console.log('\n🚀 Performance Analysis:');
    if (totalSize > PERFORMANCE_THRESHOLDS.firstLoadJS) {
      console.log('⚠️  First Load JS exceeds recommended 300KB');
      console.log('   Consider code splitting or lazy loading');
    } else {
      console.log('✅ First Load JS is within recommended limits');
    }

    // Violations summary
    if (hasViolations) {
      console.log('\n❌ Bundle Size Violations Detected:');
      console.log('=====================================');
      
      violations.forEach(({ file, size, limit, excess, ratio }) => {
        console.log(`\n🚫 ${file}:`);
        console.log(`   Current: ${formatBytes(size)}`);
        console.log(`   Limit: ${formatBytes(limit)}`);
        console.log(`   Excess: ${formatBytes(excess)} (${((ratio - 1) * 100).toFixed(1)}% over)`);
      });

      console.log('\n💡 Optimization Recommendations:');
      console.log('• Analyze bundle composition with npm run analyze');
      console.log('• Implement dynamic imports for large components');
      console.log('• Remove unused dependencies');
      console.log('• Consider code splitting strategies');
      console.log('• Optimize third-party libraries');
      
      process.exit(1);
    } else {
      console.log('\n✅ All bundle sizes are within acceptable limits!');
      console.log('\n🎉 Bundle optimization targets achieved:');
      console.log('• Fast initial page loads');
      console.log('• Efficient code splitting');
      console.log('• Optimal user experience');
    }

  } catch (error) {
    console.error('❌ Error analyzing bundle sizes:', error.message);
    process.exit(1);
  }
}

// Run the check
checkBundleSizes();