/**
 * Lazy Loading Integration Example
 * Demonstrates how to use the advanced code splitting features
 */

'use client';

import React, { useState } from 'react';
import { 
  LazyAnalyticsDashboard,
  LazyMfaSetup,
  LazyFileUpload,
  IntersectionLazy,
  preloadAnalyticsComponents
} from '../lazy';
import { usePerformanceTracking } from '../../hooks/usePerformanceTracking';
import Button from '../ui/Button';
import Card, { CardContent } from '../ui/Card';

const LazyLoadingExample: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'mfa' | 'upload'>('analytics');
  const [showIntersection, setShowIntersection] = useState(false);

  // Track performance of this example component
  const { startTracking } = usePerformanceTracking({
    componentName: 'LazyLoadingExample',
    trackBundleSize: true,
    onMetrics: (metrics) => {
      console.log('LazyLoadingExample Performance:', metrics);
    }
  });

  React.useEffect(() => {
    startTracking();
  }, [startTracking]);

  // Preload components when user hovers over tabs
  const handleTabHover = (tab: string) => {
    switch (tab) {
      case 'analytics':
        preloadAnalyticsComponents();
        break;
      case 'mfa':
        import('../MfaSetup');
        break;
      case 'upload':
        import('../FileUpload');
        break;
    }
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardContent className="p-6">
          <h1 className="text-2xl font-bold mb-4">Advanced Code Splitting Demo</h1>
          <p className="text-gray-600 mb-6">
            This example demonstrates various lazy loading techniques implemented in the application.
          </p>

          {/* Tab Navigation with Preloading */}
          <div className="flex space-x-4 mb-6">
            <Button
              variant={activeTab === 'analytics' ? 'primary' : 'secondary'}
              onMouseEnter={() => handleTabHover('analytics')}
              onClick={() => setActiveTab('analytics')}
            >
              Analytics Dashboard
            </Button>
            <Button
              variant={activeTab === 'mfa' ? 'primary' : 'secondary'}
              onMouseEnter={() => handleTabHover('mfa')}
              onClick={() => setActiveTab('mfa')}
            >
              MFA Setup
            </Button>
            <Button
              variant={activeTab === 'upload' ? 'primary' : 'secondary'}
              onMouseEnter={() => handleTabHover('upload')}
              onClick={() => setActiveTab('upload')}
            >
              File Upload
            </Button>
          </div>

          {/* Lazy-loaded Content */}
          <div className="border rounded-lg p-4 min-h-[400px]">
            {activeTab === 'analytics' && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Lazy Analytics Dashboard</h3>
                <p className="text-sm text-gray-600 mb-4">
                  This component (480+ lines) is loaded only when needed. Watch the loading skeleton.
                </p>
                <LazyAnalyticsDashboard />
              </div>
            )}

            {activeTab === 'mfa' && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Lazy MFA Setup</h3>
                <p className="text-sm text-gray-600 mb-4">
                  This component (419 lines) loads dynamically with error boundaries.
                </p>
                <LazyMfaSetup />
              </div>
            )}

            {activeTab === 'upload' && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Lazy File Upload</h3>
                <p className="text-sm text-gray-600 mb-4">
                  This component (390 lines) demonstrates feature-level code splitting.
                </p>
                <LazyFileUpload category="OTHER" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Intersection Observer Example */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-4">Intersection Observer Lazy Loading</h2>
          <p className="text-gray-600 mb-4">
            Components below only load when they come into view. Scroll down to see the effect.
          </p>
          
          <Button 
            onClick={() => setShowIntersection(!showIntersection)}
            className="mb-4"
          >
            {showIntersection ? 'Hide' : 'Show'} Intersection Example
          </Button>

          {showIntersection && (
            <div className="space-y-4">
              {/* Spacer to demonstrate viewport loading */}
              <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">Scroll down to see intersection-based loading</p>
              </div>

              {/* This component only loads when it enters the viewport */}
              <IntersectionLazy
                rootMargin="100px"
                threshold={0.1}
                loadingMessage="Loading when visible..."
                minHeight="min-h-[300px]"
              >
                <div className="bg-blue-50 p-6 rounded-lg">
                  <h4 className="text-lg font-semibold text-blue-900 mb-2">
                    🎉 This loaded when it became visible!
                  </h4>
                  <p className="text-blue-700">
                    This demonstrates intersection observer-based lazy loading. 
                    The component was only loaded when it scrolled into view.
                  </p>
                  <div className="mt-4 p-4 bg-white rounded border-l-4 border-blue-500">
                    <p className="text-sm text-gray-600">
                      Check the browser&apos;s Network tab to see when this component&apos;s 
                      JavaScript chunk was actually loaded.
                    </p>
                  </div>
                </div>
              </IntersectionLazy>

              {/* Another intersection example */}
              <IntersectionLazy
                rootMargin="50px"
                threshold={0.2}
                loadingMessage="Loading second component..."
              >
                <div className="bg-green-50 p-6 rounded-lg">
                  <h4 className="text-lg font-semibold text-green-900 mb-2">
                    🚀 Another intersection-loaded component!
                  </h4>
                  <p className="text-green-700">
                    This demonstrates how multiple components can use intersection-based 
                    loading with different thresholds and margins.
                  </p>
                </div>
              </IntersectionLazy>

              {/* Dynamic component selection */}
              <div className="bg-purple-50 p-6 rounded-lg">
                <h4 className="text-lg font-semibold text-purple-900 mb-4">
                  Dynamic Component Selection
                </h4>
                <p className="text-purple-700 mb-4">
                  Components can be dynamically selected and loaded based on user role or other criteria.
                </p>
                <div className="space-x-2">
                  {(['Analytics', 'Performance', 'WebVitals'] as const).map((type) => {
                    return (
                      <div key={type} className="inline-block">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            // This would render the component
                            console.log(`Loading ${type} component dynamically`);
                          }}
                        >
                          Load {type}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Info */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-4">Performance Benefits</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-2">Bundle Size Reduction</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Analytics Dashboard: ~480 lines → Lazy-loaded</li>
                <li>• MFA Setup: ~419 lines → Lazy-loaded</li>
                <li>• File Upload: ~390 lines → Lazy-loaded</li>
                <li>• Performance Dashboard: ~511 lines → Lazy-loaded</li>
              </ul>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Loading Optimizations</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Intersection-based loading</li>
                <li>• Smart preloading on hover</li>
                <li>• Role-based component strategies</li>
                <li>• Error boundaries with fallbacks</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Development Note:</strong> Open browser DevTools → Network tab to observe 
              chunk loading behavior. Performance metrics are logged to console in development mode.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LazyLoadingExample;