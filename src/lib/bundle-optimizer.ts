/**
 * Bundle Optimizer Utilities
 * Helper functions for analyzing and optimizing bundle size
 */

// Analyze import statements in code to identify heavy libraries
export function analyzeImports(sourceCode: string): {
  heavyLibraries: string[];
  suggestions: string[];
} {
  const heavyLibraries: string[] = [];
  const suggestions: string[] = [];
  
  // Known heavy libraries that should be dynamically imported
  const heavyLibraryPatterns = [
    { pattern: /@stripe/, suggestion: 'Consider using dynamic imports for Stripe components' },
    { pattern: /socket\.io/, suggestion: 'Load Socket.IO only when real-time features are needed' },
    { pattern: /prisma/, suggestion: 'Prisma client should only be used server-side' },
    { pattern: /sharp/, suggestion: 'Sharp should only be imported server-side for image processing' },
    { pattern: /qrcode/, suggestion: 'QR code generation should be dynamically imported' },
    { pattern: /speakeasy/, suggestion: 'MFA libraries should be lazy-loaded' }
  ];
  
  // Analyze import statements
  const importRegex = /import.*from\s+['"]([^'"]+)['"]/g;
  let match;
  
  while ((match = importRegex.exec(sourceCode)) !== null) {
    const importPath = match[1];
    
    if (!importPath) continue;
    
    for (const { pattern, suggestion } of heavyLibraryPatterns) {
      if (pattern.test(importPath)) {
        heavyLibraries.push(importPath);
        suggestions.push(suggestion);
      }
    }
  }
  
  return { heavyLibraries, suggestions };
}

// Create dynamic import wrapper
export function createDynamicImport(modulePath: string, exportName?: string): string {
  if (exportName) {
    return `const ${exportName} = React.lazy(() => import('${modulePath}').then(module => ({ default: module.${exportName} })));`;
  }
  return `const Component = React.lazy(() => import('${modulePath}'));`;
}

// Generate optimization report
export function generateOptimizationReport(codebase: Map<string, string>): {
  totalFiles: number;
  filesWithHeavyImports: number;
  optimizationOpportunities: Array<{
    file: string;
    issues: string[];
    suggestions: string[];
  }>;
} {
  const optimizationOpportunities: Array<{
    file: string;
    issues: string[];
    suggestions: string[];
  }> = [];
  
  let filesWithHeavyImports = 0;
  
  for (const [filePath, sourceCode] of codebase) {
    const { heavyLibraries, suggestions } = analyzeImports(sourceCode);
    
    if (heavyLibraries.length > 0) {
      filesWithHeavyImports++;
      optimizationOpportunities.push({
        file: filePath,
        issues: heavyLibraries,
        suggestions
      });
    }
  }
  
  return {
    totalFiles: codebase.size,
    filesWithHeavyImports,
    optimizationOpportunities
  };
}

// Performance monitoring utilities
export const performanceUtils = {
  // Measure bundle impact
  measureBundleImpact: () => {
    if (typeof window !== 'undefined' && 'performance' in window) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paintEntries = performance.getEntriesByType('paint');
      
      return {
        loadTime: navigation.loadEventEnd - navigation.fetchStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
        firstPaint: paintEntries.find(entry => entry.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0
      };
    }
    return null;
  },

  // Monitor resource loading
  getResourceSizes: () => {
    if (typeof window !== 'undefined' && 'performance' in window) {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      
      return resources.map(resource => ({
        name: resource.name,
        size: resource.transferSize || 0,
        duration: resource.responseEnd - resource.requestStart,
        type: resource.initiatorType
      })).sort((a, b) => b.size - a.size);
    }
    return [];
  }
};