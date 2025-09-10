# Lazy Loading Best Practices Guide

## Quick Start

### Using Pre-built Lazy Components

```tsx
// Import lazy billing components
import { LazyPaymentHistory, LazySubscriptionManager } from '@/components/billing/lazy';

// Import lazy dashboard components
import { LazyClientDashboard, getDashboardComponent } from '@/components/dashboards/lazy';

// Import lazy utilities
import { LazyMfaSetup, LazyFileUpload } from '@/components/lazy/LargeComponents';

function MyPage() {
  return (
    <div>
      {/* These components automatically include Suspense and ErrorBoundary */}
      <LazyPaymentHistory />
      <LazySubscriptionManager />
    </div>
  );
}
```

### Creating Custom Lazy Components

```tsx
import React, { Suspense } from 'react';
import LoadingFallback from '@/components/ui/LoadingFallback';
import ErrorBoundary from '@/components/ErrorBoundary';

// 1. Create the lazy component
const LazyMyHeavyComponent = React.lazy(() => import('./MyHeavyComponent'));

// 2. Wrap with Suspense and ErrorBoundary
function MyLazyWrapper(props) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback message='Loading component...' />}>
        <LazyMyHeavyComponent {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}
```

## Loading Strategies

### 1. Immediate Loading (High Priority)

Use for critical components that users need right away.

```tsx
import { useLazyLoading, LoadingStrategy } from '@/hooks/useLazyLoading';

const { shouldLoad } = useLazyLoading(() => import('./CriticalComponent'), {
  strategy: LoadingStrategy.IMMEDIATE
});
```

### 2. On Interaction Loading

Best for heavy components that aren't immediately needed.

```tsx
function InteractiveButton() {
  const [showComponent, setShowComponent] = useState(false);

  return (
    <div>
      <button onClick={() => setShowComponent(true)}>Load Heavy Component</button>
      {showComponent && <LazyHeavyComponent />}
    </div>
  );
}
```

### 3. Hover Preloading

Preload components when user hovers over triggers.

```tsx
import { preloadComponents } from '@/lib/lazy-loading';

function NavigationItem({ route }) {
  const handleMouseEnter = () => {
    // Preload the component for this route
    if (route === '/billing') {
      preloadComponents.billing.all();
    }
  };

  return (
    <a href={route} onMouseEnter={handleMouseEnter}>
      {route}
    </a>
  );
}
```

### 4. Viewport Loading

Load components when they become visible.

```tsx
import { useComponentVisibility } from '@/hooks/useLazyLoading';

function ViewportLazyComponent() {
  const { ref, isVisible } = useComponentVisibility(0.2); // 20% visible

  return <div ref={ref}>{isVisible ? <LazyHeavyComponent /> : <LoadingFallback />}</div>;
}
```

## Advanced Patterns

### Conditional Lazy Loading Based on User Role

```tsx
import { getDashboardComponent, preloadDashboardComponent } from '@/components/dashboards/lazy';

function DashboardPage({ user }) {
  // Preload based on user role
  useEffect(() => {
    preloadDashboardComponent(user.role);
  }, [user.role]);

  const DashboardComponent = getDashboardComponent(user.role);

  return <DashboardComponent user={user} />;
}
```

### Progressive Enhancement with Fallbacks

```tsx
function ProgressiveComponent() {
  const [canUseAdvanced, setCanUseAdvanced] = useState(false);

  useEffect(() => {
    // Check if user has good connection/fast device
    const isCapable =
      navigator.connection?.effectiveType === '4g' && navigator.hardwareConcurrency > 4;
    setCanUseAdvanced(isCapable);
  }, []);

  return canUseAdvanced ? <LazyAdvancedComponent /> : <BasicFallbackComponent />;
}
```

### Intelligent Preloading Based on User Behavior

```tsx
import { preloadByUserRole, progressivelyLoadComponents } from '@/lib/lazy-loading';

function App({ user }) {
  useEffect(() => {
    // Preload components based on user role
    preloadByUserRole(user.role);

    // Progressively load other components when browser is idle
    progressivelyLoadComponents();
  }, [user.role]);

  return <AppContent />;
}
```

## Error Handling Patterns

### Custom Error Boundaries for Lazy Components

```tsx
import { ErrorBoundary } from 'react-error-boundary';

function LazyComponentWithCustomError() {
  return (
    <ErrorBoundary
      fallback={<div>Oops! This component failed to load.</div>}
      onError={error => {
        console.error('Lazy component failed:', error);
        // Report to error tracking service
      }}
    >
      <Suspense fallback={<LoadingFallback />}>
        <LazyComponent />
      </Suspense>
    </ErrorBoundary>
  );
}
```

### Retry Mechanism for Failed Loads

```tsx
function RetryableLazyComponent() {
  const [retryCount, setRetryCount] = useState(0);
  const [error, setError] = useState(null);

  const handleRetry = () => {
    setError(null);
    setRetryCount(prev => prev + 1);
  };

  if (error && retryCount < 3) {
    return (
      <div>
        <p>Component failed to load.</p>
        <button onClick={handleRetry}>Retry</button>
      </div>
    );
  }

  return (
    <ErrorBoundary onError={setError}>
      <Suspense fallback={<LoadingFallback />}>
        <LazyComponent key={retryCount} />
      </Suspense>
    </ErrorBoundary>
  );
}
```

## Performance Monitoring

### Track Component Loading Performance

```tsx
import { useBundleAnalyzer } from '@/lib/performance/bundle-analyzer';

function MonitoredLazyComponent() {
  const { trackComponentLoad } = useBundleAnalyzer();
  const startTime = useRef(performance.now());

  const LazyComponent = useMemo(
    () =>
      React.lazy(async () => {
        const component = await import('./HeavyComponent');
        trackComponentLoad('HeavyComponent', startTime.current);
        return component;
      }),
    []
  );

  return (
    <Suspense fallback={<LoadingFallback />}>
      <LazyComponent />
    </Suspense>
  );
}
```

### Monitor Bundle Size in Development

```tsx
// Add to your app root in development
if (process.env.NODE_ENV === 'development') {
  import('@/lib/performance/bundle-analyzer').then(({ logPerformanceReport }) => {
    setTimeout(logPerformanceReport, 5000); // Log after 5 seconds
  });
}
```

## Common Patterns by Component Type

### 1. Dashboard Components

```tsx
// Role-based loading with preloading
const DashboardWrapper = ({ user }) => {
  const DashboardComponent = getDashboardComponent(user.role);

  useEffect(() => {
    // Preload other dashboards user might switch to
    if (user.permissions?.canSwitchRoles) {
      preloadComponents.dashboard('admin');
      preloadComponents.dashboard('therapist');
    }
  }, [user]);

  return <DashboardComponent user={user} />;
};
```

### 2. Form Components

```tsx
// Load heavy forms on interaction
function FormTrigger({ formType }) {
  const [showForm, setShowForm] = useState(false);

  const preloadForm = () => {
    if (formType === 'payment') {
      preloadComponents.billing.paymentForm();
    }
  };

  return (
    <div>
      <button onMouseEnter={preloadForm} onClick={() => setShowForm(true)}>
        Open Form
      </button>
      {showForm && <LazyPaymentForm />}
    </div>
  );
}
```

### 3. Analytics Components

```tsx
// Load analytics on tab activation
function AnalyticsTab() {
  const [isActive, setIsActive] = useState(false);

  return (
    <Tab active={isActive} onActivate={() => setIsActive(true)}>
      {isActive && <LazyAnalyticsDashboard />}
    </Tab>
  );
}
```

## Testing Lazy Components

### Unit Testing with Suspense

```tsx
import { render, waitFor } from '@testing-library/react';

test('lazy component loads correctly', async () => {
  const { getByText, getByTestId } = render(<LazyComponent />);

  // Check loading state
  expect(getByText('Loading...')).toBeInTheDocument();

  // Wait for component to load
  await waitFor(() => {
    expect(getByTestId('loaded-component')).toBeInTheDocument();
  });
});
```

### E2E Testing for Performance

```javascript
// Cypress test example
cy.visit('/dashboard');
cy.get('[data-testid="dashboard"]').should('be.visible');

// Measure performance
cy.window().then(win => {
  const loadTime = win.performance.timing.loadEventEnd - win.performance.timing.navigationStart;
  expect(loadTime).to.be.lessThan(3000); // Under 3 seconds
});
```

## Best Practices Summary

### Do's ✅

- Use consistent loading patterns across the app
- Implement error boundaries for all lazy components
- Preload based on user behavior and role
- Monitor performance metrics
- Provide meaningful loading messages
- Test both loading and loaded states

### Don'ts ❌

- Don't lazy load tiny components (< 10KB)
- Don't create too many small chunks (aim for 20KB+ chunks)
- Don't forget error handling
- Don't lazy load critical above-the-fold content
- Don't ignore network conditions
- Don't lazy load components that are always needed

### Performance Tips 🚀

1. **Bundle Size**: Target components > 20KB for lazy loading
2. **User Experience**: Keep loading states under 200ms perceived time
3. **Preloading**: Use hover/focus events for instant loading feel
4. **Chunking**: Group related components into single chunks
5. **Monitoring**: Track real user metrics, not just synthetic tests

## Troubleshooting

### Common Issues and Solutions

1. **"Cannot read property of undefined"**
   - Ensure proper error boundaries around lazy components

2. **Infinite loading states**
   - Check for circular dependencies in imports

3. **Poor performance despite lazy loading**
   - Component might be too small, consider bundling with others

4. **Flash of loading content**
   - Implement proper preloading strategies

5. **SEO issues**
   - Use server-side rendering for critical content

## Migration Guide

### Converting Existing Components

1. **Identify heavy components** (> 20KB)
2. **Create lazy wrapper** with proper fallbacks
3. **Update imports** to use lazy versions
4. **Add preloading** where appropriate
5. **Test thoroughly** including error cases
6. **Monitor performance** improvements

This guide ensures optimal implementation of lazy loading throughout the Astral Core v7 application while maintaining excellent user experience and developer productivity.
