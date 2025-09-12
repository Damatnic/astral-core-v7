/**
 * Performance Analysis and Reporting Script
 * Generates comprehensive performance reports and bundle analysis
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  outputDir: path.join(__dirname, '..', 'performance-reports'),
  bundleAnalyzerPort: 8888,
  lighthouse: {
    url: process.env.VERCEL_URL || 'http://localhost:3000',
    outputPath: path.join(__dirname, '..', 'performance-reports', 'lighthouse-report.html'),
    configPath: path.join(__dirname, 'lighthouse-config.js')
  },
  webVitals: {
    thresholds: {
      LCP: { good: 2500, poor: 4000 },
      FID: { good: 100, poor: 300 },
      CLS: { good: 0.1, poor: 0.25 },
      FCP: { good: 1800, poor: 3000 },
      TTFB: { good: 600, poor: 1500 }
    }
  }
};

// Ensure output directory exists
if (!fs.existsSync(CONFIG.outputDir)) {
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
}

/**
 * Analyze bundle size using webpack-bundle-analyzer
 */
async function analyzeBundleSize() {
  console.log('🔍 Analyzing bundle size...');
  
  try {
    // Generate build stats
    process.env.ANALYZE = 'true';
    execSync('npm run build', { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });

    const statsPath = path.join(__dirname, '..', '.next', 'analyze', 'client.json');
    
    if (fs.existsSync(statsPath)) {
      const stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
      
      const analysis = {
        totalSize: stats.assets.reduce((sum, asset) => sum + asset.size, 0),
        jsSize: stats.assets.filter(a => a.name.endsWith('.js')).reduce((sum, asset) => sum + asset.size, 0),
        cssSize: stats.assets.filter(a => a.name.endsWith('.css')).reduce((sum, asset) => sum + asset.size, 0),
        largestAssets: stats.assets
          .sort((a, b) => b.size - a.size)
          .slice(0, 10)
          .map(asset => ({
            name: asset.name,
            size: (asset.size / 1024).toFixed(2) + ' KB'
          })),
        chunks: stats.chunks?.length || 0,
        modules: stats.modules?.length || 0
      };

      // Save bundle analysis
      fs.writeFileSync(
        path.join(CONFIG.outputDir, 'bundle-analysis.json'),
        JSON.stringify(analysis, null, 2)
      );

      console.log('✅ Bundle analysis complete');
      console.log(`📊 Total size: ${(analysis.totalSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`📊 JavaScript: ${(analysis.jsSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`📊 CSS: ${(analysis.cssSize / 1024).toFixed(2)} KB`);
      
      return analysis;
    } else {
      console.warn('⚠️ Bundle stats not found, skipping analysis');
      return null;
    }
  } catch (error) {
    console.error('❌ Bundle analysis failed:', error.message);
    return null;
  }
}

/**
 * Run Lighthouse performance audit
 */
async function runLighthouseAudit() {
  console.log('🚀 Running Lighthouse audit...');
  
  try {
    const lighthouseCommand = [
      'npx lighthouse',
      CONFIG.lighthouse.url,
      '--output=html',
      `--output-path=${CONFIG.lighthouse.outputPath}`,
      '--chrome-flags="--headless --no-sandbox --disable-dev-shm-usage"',
      '--only-categories=performance,accessibility,best-practices',
      '--throttling-method=simulate',
      '--form-factor=desktop'
    ].join(' ');

    execSync(lighthouseCommand, { 
      stdio: 'inherit',
      timeout: 60000 // 1 minute timeout
    });

    console.log('✅ Lighthouse audit complete');
    console.log(`📄 Report saved to: ${CONFIG.lighthouse.outputPath}`);
    
    return true;
  } catch (error) {
    console.error('❌ Lighthouse audit failed:', error.message);
    return false;
  }
}

/**
 * Analyze performance metrics from monitoring API
 */
async function analyzePerformanceMetrics() {
  console.log('📈 Analyzing performance metrics...');
  
  try {
    // This would connect to your monitoring API
    // For now, we'll create a mock analysis
    const mockMetrics = {
      webVitals: {
        LCP: { average: 2800, p95: 4200, samples: 150 },
        FID: { average: 85, p95: 180, samples: 120 },
        CLS: { average: 0.08, p95: 0.15, samples: 140 },
        FCP: { average: 1900, p95: 2800, samples: 155 },
        TTFB: { average: 450, p95: 800, samples: 160 }
      },
      errors: {
        total: 12,
        critical: 0,
        warnings: 8,
        info: 4
      },
      uptime: 99.8,
      responseTime: {
        average: 380,
        p95: 750
      }
    };

    // Analyze Web Vitals performance
    const webVitalsAnalysis = {};
    for (const [metric, data] of Object.entries(mockMetrics.webVitals)) {
      const threshold = CONFIG.webVitals.thresholds[metric];
      if (threshold) {
        webVitalsAnalysis[metric] = {
          ...data,
          rating: data.average <= threshold.good ? 'good' : 
                 data.average <= threshold.poor ? 'needs-improvement' : 'poor',
          p95Rating: data.p95 <= threshold.good ? 'good' : 
                    data.p95 <= threshold.poor ? 'needs-improvement' : 'poor'
        };
      }
    }

    const analysis = {
      timestamp: new Date().toISOString(),
      webVitals: webVitalsAnalysis,
      errors: mockMetrics.errors,
      uptime: mockMetrics.uptime,
      responseTime: mockMetrics.responseTime,
      recommendations: generateRecommendations(webVitalsAnalysis, mockMetrics)
    };

    fs.writeFileSync(
      path.join(CONFIG.outputDir, 'performance-metrics.json'),
      JSON.stringify(analysis, null, 2)
    );

    console.log('✅ Performance metrics analysis complete');
    return analysis;
  } catch (error) {
    console.error('❌ Performance metrics analysis failed:', error.message);
    return null;
  }
}

/**
 * Generate performance recommendations
 */
function generateRecommendations(webVitals, metrics) {
  const recommendations = [];

  // Web Vitals recommendations
  for (const [metric, data] of Object.entries(webVitals)) {
    if (data.rating === 'poor' || data.p95Rating === 'poor') {
      switch (metric) {
        case 'LCP':
          recommendations.push({
            type: 'critical',
            metric: 'LCP',
            message: 'Largest Contentful Paint is poor. Optimize images, preload critical resources, and minimize render-blocking resources.',
            actions: [
              'Compress and optimize images',
              'Use next/image for automatic optimization',
              'Preload critical resources with <link rel="preload">',
              'Minimize CSS and JavaScript',
              'Use a CDN for static assets'
            ]
          });
          break;
        case 'FID':
          recommendations.push({
            type: 'critical',
            metric: 'FID',
            message: 'First Input Delay is poor. Reduce JavaScript execution time and optimize event handlers.',
            actions: [
              'Code split large JavaScript bundles',
              'Use React.lazy() for component splitting',
              'Defer non-critical JavaScript',
              'Optimize event handler performance',
              'Use web workers for heavy computations'
            ]
          });
          break;
        case 'CLS':
          recommendations.push({
            type: 'critical',
            metric: 'CLS',
            message: 'Cumulative Layout Shift is poor. Prevent layout shifts by reserving space for dynamic content.',
            actions: [
              'Add width and height attributes to images',
              'Reserve space for ads and embeds',
              'Avoid inserting content above existing content',
              'Use CSS aspect-ratio for responsive images',
              'Preload web fonts'
            ]
          });
          break;
        case 'FCP':
          recommendations.push({
            type: 'warning',
            metric: 'FCP',
            message: 'First Contentful Paint could be improved.',
            actions: [
              'Optimize critical rendering path',
              'Inline critical CSS',
              'Remove render-blocking resources',
              'Optimize server response time'
            ]
          });
          break;
        case 'TTFB':
          recommendations.push({
            type: 'warning',
            metric: 'TTFB',
            message: 'Time to First Byte is slow. Optimize server response time.',
            actions: [
              'Use database connection pooling',
              'Implement server-side caching',
              'Optimize database queries',
              'Use a CDN',
              'Upgrade server resources'
            ]
          });
          break;
      }
    }
  }

  // Error rate recommendations
  if (metrics.errors.total > 10) {
    recommendations.push({
      type: 'warning',
      metric: 'errors',
      message: 'Error rate is elevated. Monitor and fix recurring errors.',
      actions: [
        'Review error logs and fix critical errors',
        'Implement proper error boundaries',
        'Add more comprehensive error handling',
        'Set up error monitoring alerts'
      ]
    });
  }

  // Response time recommendations
  if (metrics.responseTime.average > 500) {
    recommendations.push({
      type: 'warning',
      metric: 'response-time',
      message: 'Average response time is slow.',
      actions: [
        'Optimize database queries',
        'Implement caching strategies',
        'Use database indexing',
        'Consider server upgrades'
      ]
    });
  }

  return recommendations;
}

/**
 * Generate comprehensive performance report
 */
async function generateReport() {
  console.log('📋 Generating comprehensive performance report...');
  
  const report = {
    metadata: {
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      url: CONFIG.lighthouse.url
    },
    bundle: null,
    performance: null,
    lighthouse: fs.existsSync(CONFIG.lighthouse.outputPath),
    summary: {
      overallScore: 0,
      criticalIssues: 0,
      warnings: 0,
      passed: 0
    }
  };

  // Run all analyses
  const [bundleAnalysis, performanceAnalysis] = await Promise.all([
    analyzeBundleSize(),
    analyzePerformanceMetrics()
  ]);

  report.bundle = bundleAnalysis;
  report.performance = performanceAnalysis;

  // Calculate summary
  if (performanceAnalysis) {
    const recommendations = performanceAnalysis.recommendations || [];
    report.summary.criticalIssues = recommendations.filter(r => r.type === 'critical').length;
    report.summary.warnings = recommendations.filter(r => r.type === 'warning').length;
    report.summary.passed = Object.values(performanceAnalysis.webVitals).filter(
      metric => metric.rating === 'good'
    ).length;
    
    // Calculate overall score (0-100)
    const goodMetrics = report.summary.passed;
    const totalMetrics = Object.keys(performanceAnalysis.webVitals).length;
    const baseScore = (goodMetrics / totalMetrics) * 100;
    const penaltyScore = (report.summary.criticalIssues * 20) + (report.summary.warnings * 5);
    report.summary.overallScore = Math.max(0, Math.round(baseScore - penaltyScore));
  }

  // Save comprehensive report
  fs.writeFileSync(
    path.join(CONFIG.outputDir, 'performance-report.json'),
    JSON.stringify(report, null, 2)
  );

  // Generate HTML report
  generateHTMLReport(report);

  console.log('✅ Performance report generated');
  console.log(`📊 Overall Score: ${report.summary.overallScore}/100`);
  console.log(`🚨 Critical Issues: ${report.summary.criticalIssues}`);
  console.log(`⚠️  Warnings: ${report.summary.warnings}`);
  console.log(`✅ Passed: ${report.summary.passed}`);
  
  return report;
}

/**
 * Generate HTML report
 */
function generateHTMLReport(report) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Astral Core Performance Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .score { font-size: 48px; font-weight: bold; color: ${report.summary.overallScore >= 80 ? '#22c55e' : report.summary.overallScore >= 60 ? '#f59e0b' : '#ef4444'}; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 30px 0; }
        .metric { background: #f8fafc; padding: 20px; border-radius: 8px; }
        .metric-name { font-weight: bold; margin-bottom: 10px; }
        .recommendations { background: #fef3c7; padding: 20px; border-radius: 8px; margin-top: 20px; }
        .critical { border-left: 4px solid #ef4444; }
        .warning { border-left: 4px solid #f59e0b; }
        .actions { margin-left: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Astral Core Performance Report</h1>
            <div class="score">${report.summary.overallScore}/100</div>
            <p>Generated on ${new Date(report.metadata.timestamp).toLocaleString()}</p>
        </div>
        
        <div class="metrics">
            ${report.performance ? Object.entries(report.performance.webVitals).map(([name, data]) => `
                <div class="metric">
                    <div class="metric-name">${name}</div>
                    <div>Average: ${data.average}${name === 'CLS' ? '' : 'ms'} (${data.rating})</div>
                    <div>95th percentile: ${data.p95}${name === 'CLS' ? '' : 'ms'} (${data.p95Rating})</div>
                    <div>Samples: ${data.samples}</div>
                </div>
            `).join('') : '<p>No performance data available</p>'}
        </div>
        
        ${report.performance && report.performance.recommendations ? `
            <div class="recommendations">
                <h3>Recommendations</h3>
                ${report.performance.recommendations.map(rec => `
                    <div class="recommendation ${rec.type}" style="margin-bottom: 20px; padding: 15px; border-radius: 4px;">
                        <strong>${rec.message}</strong>
                        <div class="actions">
                            <ul>
                                ${rec.actions.map(action => `<li>${action}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                `).join('')}
            </div>
        ` : ''}
        
        ${report.bundle ? `
            <div class="bundle-info" style="margin-top: 30px; background: #f1f5f9; padding: 20px; border-radius: 8px;">
                <h3>Bundle Analysis</h3>
                <p><strong>Total Size:</strong> ${(report.bundle.totalSize / 1024 / 1024).toFixed(2)} MB</p>
                <p><strong>JavaScript:</strong> ${(report.bundle.jsSize / 1024 / 1024).toFixed(2)} MB</p>
                <p><strong>CSS:</strong> ${(report.bundle.cssSize / 1024).toFixed(2)} KB</p>
                <p><strong>Chunks:</strong> ${report.bundle.chunks}</p>
            </div>
        ` : ''}
    </div>
</body>
</html>`;

  fs.writeFileSync(path.join(CONFIG.outputDir, 'performance-report.html'), html);
  console.log(`📄 HTML report saved to: ${path.join(CONFIG.outputDir, 'performance-report.html')}`);
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting performance analysis...');
  
  try {
    // Run Lighthouse audit in parallel with other analyses
    const lighthousePromise = runLighthouseAudit();
    
    // Generate comprehensive report
    const report = await generateReport();
    
    // Wait for Lighthouse to complete
    await lighthousePromise;
    
    console.log('\n✅ Performance analysis complete!');
    console.log(`📁 Reports saved to: ${CONFIG.outputDir}`);
    
    // Exit with appropriate code based on performance
    if (report.summary.criticalIssues > 0) {
      console.log('❌ Critical performance issues detected!');
      process.exit(1);
    } else if (report.summary.overallScore < 70) {
      console.log('⚠️  Performance score is below threshold');
      process.exit(1);
    } else {
      console.log('✅ Performance looks good!');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Performance analysis failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  analyzeBundleSize,
  runLighthouseAudit,
  analyzePerformanceMetrics,
  generateReport
};