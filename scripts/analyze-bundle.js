/**
 * Bundle Analysis Script
 * Analyzes the current bundle without requiring a full build
 */

const fs = require('fs');
const path = require('path');

// Analyze package.json dependencies
function analyzeDependencies() {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const deps = packageJson.dependencies;
  
  const heavyPackages = {
    '@stripe/stripe-js': 'Large payment processing library',
    '@stripe/react-stripe-js': 'React components for Stripe',
    'socket.io': 'Real-time communication library',
    'socket.io-client': 'Client-side Socket.IO',
    'sharp': 'Image processing library (server-side)',
    'prisma': 'Database ORM',
    '@prisma/client': 'Prisma database client',
    'next-auth': 'Authentication library',
    'lucide-react': 'Large icon library',
    'react-dropzone': 'File upload component',
    'qrcode': 'QR code generation',
    'speakeasy': 'MFA/2FA library'
  };
  
  console.log('🔍 Bundle Analysis Report\n');
  console.log('Heavy Dependencies Found:');
  console.log('========================');
  
  Object.keys(deps).forEach(dep => {
    if (heavyPackages[dep]) {
      console.log(`📦 ${dep}: ${heavyPackages[dep]}`);
    }
  });
  
  return Object.keys(deps).filter(dep => heavyPackages[dep]);
}

// Analyze import usage in source files
function analyzeImports(dir, results = new Map()) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      analyzeImports(fullPath, results);
    } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.tsx'))) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const imports = content.match(/import.*from\s+['"][^'"]+['"]/g) || [];
        results.set(fullPath, imports);
      } catch (error) {
        console.warn(`⚠️  Could not read ${fullPath}: ${error.message}`);
      }
    }
  }
  
  return results;
}

// Generate optimization suggestions
function generateSuggestions(heavyDeps, importUsage) {
  console.log('\n💡 Optimization Suggestions:');
  console.log('============================');
  
  const suggestions = [];
  
  // Check for heavy dependencies
  if (heavyDeps.includes('@stripe/stripe-js')) {
    suggestions.push('✅ Use dynamic imports for Stripe components - load only when payment is needed');
  }
  
  if (heavyDeps.includes('socket.io-client')) {
    suggestions.push('✅ Load Socket.IO client only when real-time features are accessed');
  }
  
  if (heavyDeps.includes('lucide-react')) {
    suggestions.push('✅ Import specific Lucide icons instead of the entire library');
  }
  
  if (heavyDeps.includes('qrcode')) {
    suggestions.push('✅ Dynamically import QR code generation when needed');
  }
  
  // Check for common optimization opportunities
  let stripeUsageCount = 0;
  let socketUsageCount = 0;
  
  for (const [file, imports] of importUsage) {
    imports.forEach(imp => {
      if (imp.includes('@stripe')) stripeUsageCount++;
      if (imp.includes('socket.io')) socketUsageCount++;
    });
  }
  
  if (stripeUsageCount > 3) {
    suggestions.push('⚡ Consider creating a Stripe wrapper component to centralize imports');
  }
  
  if (socketUsageCount > 2) {
    suggestions.push('⚡ WebSocket usage found in multiple files - consider a WebSocket context provider');
  }
  
  suggestions.push('🚀 Enable Next.js experimental.optimizePackageImports for automatic tree shaking');
  suggestions.push('📦 Use Next.js dynamic imports with loading states for better UX');
  suggestions.push('🎯 Implement route-based code splitting for different user roles');
  
  suggestions.forEach(suggestion => console.log(suggestion));
  
  return suggestions;
}

// Calculate estimated bundle impact
function estimateBundleImpact(heavyDeps) {
  const packageSizes = {
    '@stripe/stripe-js': '50KB',
    '@stripe/react-stripe-js': '30KB', 
    'socket.io-client': '200KB',
    'lucide-react': '600KB+',
    'react-dropzone': '40KB',
    'qrcode': '45KB',
    'speakeasy': '25KB'
  };
  
  console.log('\n📊 Estimated Bundle Impact:');
  console.log('===========================');
  
  let totalEstimatedSize = 0;
  heavyDeps.forEach(dep => {
    if (packageSizes[dep]) {
      console.log(`${dep}: ~${packageSizes[dep]}`);
      totalEstimatedSize += parseInt(packageSizes[dep].replace(/[^\d]/g, '')) || 0;
    }
  });
  
  console.log(`\nTotal heavy dependencies: ~${totalEstimatedSize}KB`);
  console.log('💡 These could be reduced by 60-80% with proper code splitting!');
}

// Main analysis function
function runAnalysis() {
  console.log('🚀 Starting Bundle Analysis...\n');
  
  const heavyDeps = analyzeDependencies();
  const importUsage = analyzeImports('./src');
  
  console.log(`\n📁 Analyzed ${importUsage.size} source files`);
  
  estimateBundleImpact(heavyDeps);
  generateSuggestions(heavyDeps, importUsage);
  
  console.log('\n✅ Analysis Complete!');
  console.log('\n🔧 Next Steps:');
  console.log('- Implement dynamic imports for heavy components');
  console.log('- Use Next.js built-in optimizations');
  console.log('- Test with npm run build to see actual bundle sizes');
}

// Run the analysis
runAnalysis();