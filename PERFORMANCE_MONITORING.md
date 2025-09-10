# Performance Monitoring System - Astral Core v7

## Overview

The Astral Core v7 Performance Monitoring System provides comprehensive real-time performance tracking and analysis for your mental health platform. It monitors Core Web Vitals, API performance, database queries, errors, and system resources to ensure optimal user experience and application reliability.

## 🚀 Features

### Core Web Vitals Monitoring

- **First Contentful Paint (FCP)** - Time when first content appears
- **Largest Contentful Paint (LCP)** - Time when largest content loads
- **First Input Delay (FID)** - Time to first interaction
- **Cumulative Layout Shift (CLS)** - Visual stability score
- **Time to First Byte (TTFB)** - Server response time
- **Interaction to Next Paint (INP)** - Interaction responsiveness

### API Performance Tracking

- Response time monitoring
- Error rate tracking
- Endpoint-specific metrics
- Cache hit/miss analysis
- Payload size monitoring

### Database Query Performance

- Query execution time tracking
- Slow query detection (configurable threshold)
- N+1 query pattern detection
- Table-level performance analysis
- Query operation distribution

### Error Monitoring & Alerting

- JavaScript error tracking
- Unhandled promise rejection monitoring
- Resource loading error detection
- Custom error categorization
- Real-time alert system
- Error pattern recognition

### Memory & Resource Monitoring

- JavaScript heap size tracking
- Bundle size analysis
- Resource loading performance
- Memory leak detection
- Performance trend analysis

## 📦 Installation & Setup

### 1. Database Schema

Run the Prisma migration to add performance monitoring tables:

```bash
npm run db:generate
npm run db:push
```

### 2. Initialize Performance Provider

Wrap your app with the PerformanceProvider:

```tsx
// app/layout.tsx
import { PerformanceProvider } from '@/providers/PerformanceProvider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en'>
      <body>
        <PerformanceProvider
          enableAnalytics={true}
          enableNotifications={true}
          analyticsEndpoint='/api/analytics/performance'
          debugMode={process.env.NODE_ENV === 'development'}
        >
          {children}
        </PerformanceProvider>
      </body>
    </html>
  );
}
```

### 3. Configure Prisma Middleware

Add the performance middleware to your Prisma client:

```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client';
import { createPerformanceMiddleware } from '@/lib/performance';

const prisma = new PrismaClient();

// Add performance monitoring middleware
prisma.$use(createPerformanceMiddleware());

export default prisma;
```

### 4. Initialize Monitoring (Optional)

For advanced configuration:

```typescript
// app/page.tsx or _app.tsx
import { initializePerformanceMonitoring } from '@/lib/performance';

// Initialize with custom configuration
useEffect(() => {
  initializePerformanceMonitoring({
    enableMetrics: true,
    enableWebVitals: true,
    enableErrorMonitoring: true,
    enableDatabaseMonitoring: true,
    enableAnalytics: true,
    enableNotifications: false,
    analyticsEndpoint: '/api/analytics/performance',
    debugMode: false,
    thresholds: {
      slowQueryMs: 1000,
      slowComponentMs: 100,
      errorRateThreshold: 0.05,
      memoryUsageThreshold: 0.8
    }
  });
}, []);
```

## 🎛️ Usage

### Performance Dashboard

Display comprehensive performance metrics:

```tsx
import { PerformanceDashboard } from '@/lib/performance';

export default function AdminPage() {
  return (
    <div>
      <h1>Performance Dashboard</h1>
      <PerformanceDashboard refreshInterval={30000} showAdvanced={true} compact={false} />
    </div>
  );
}
```

### Web Vitals Monitor

Monitor Core Web Vitals specifically:

```tsx
import { WebVitalsMonitor } from '@/lib/performance';

export default function WebVitalsPage() {
  return <WebVitalsMonitor showInsights={true} showThresholds={true} compact={false} />;
}
```

### Error Monitor

Track and analyze errors:

```tsx
import { ErrorMonitor } from '@/lib/performance';

export default function ErrorsPage() {
  return <ErrorMonitor showPatterns={true} maxErrors={100} refreshInterval={30000} />;
}
```

### Database Monitor

Monitor database performance:

```tsx
import { DatabaseMonitor } from '@/lib/performance';

export default function DatabasePage() {
  return <DatabaseMonitor showInsights={true} maxQueries={100} showSlowQueriesOnly={false} />;
}
```

### Custom Performance Tracking

Track custom events and operations:

```tsx
import { usePerformanceTracking } from '@/lib/performance';

export default function MyComponent() {
  const { trackCustomEvent, trackAsyncOperation } = usePerformanceTracking();

  const handleExpensiveOperation = async () => {
    await trackAsyncOperation(async () => {
      // Your expensive operation here
      await someAsyncWork();
    }, 'expensive-operation');
  };

  const handleCustomEvent = () => {
    const startTime = performance.now();

    // Do some work
    doSomeWork();

    const duration = performance.now() - startTime;
    trackCustomEvent('custom-work', duration, {
      category: 'user-interaction'
    });
  };

  return (
    <div>
      <button onClick={handleExpensiveOperation}>Expensive Operation</button>
      <button onClick={handleCustomEvent}>Track Custom Event</button>
    </div>
  );
}
```

### Component Performance Monitoring

Monitor individual component performance:

```tsx
import { withPerformanceMonitoring, useComponentPerformance } from '@/lib/performance';

// HOC approach
const MyComponent = withPerformanceMonitoring(({ data }) => {
  return <div>{data}</div>;
}, 'MyComponent');

// Hook approach
function MyOtherComponent() {
  const { trackRerender } = useComponentPerformance('MyOtherComponent');

  useEffect(() => {
    trackRerender();
  });

  return <div>Component content</div>;
}
```

## 📊 API Endpoints

### Performance Analytics Endpoint

**POST** `/api/analytics/performance`

Store performance metrics from the client:

```typescript
// Request body
{
  vitals: {
    fcp: { value: 1200, rating: "good" },
    lcp: { value: 2100, rating: "good" },
    fid: { value: 95, rating: "good" },
    cls: { value: 0.08, rating: "good" }
  },
  url: "/dashboard",
  timestamp: 1640995200000,
  userAgent: "Mozilla/5.0...",
  sessionId: "session_123",
  userId: "user_456"
}
```

**GET** `/api/analytics/performance`

Retrieve performance metrics:

```typescript
// Query parameters
?limit=50&offset=0&url=/dashboard&since=2023-01-01

// Response
{
  records: [
    {
      id: "perf_123",
      url: "/dashboard",
      timestamp: "2023-01-01T12:00:00Z",
      vitals: { fcp: { value: 1200, rating: "good" } },
      metadata: { vitalsCount: 4 }
    }
  ],
  stats: {
    totalRecords: 1000,
    vitalsRecords: 850,
    averages: {
      fcp: 1150,
      lcp: 2050,
      fid: 88,
      cls: 0.09
    },
    ratings: {
      fcp: { good: 800, "needs-improvement": 40, poor: 10 }
    }
  },
  pagination: {
    limit: 50,
    offset: 0,
    hasMore: true
  }
}
```

## 🔧 Hooks & Utilities

### usePerformanceMetrics

Access performance metrics data:

```tsx
import { usePerformanceMetrics } from '@/lib/performance';

function MetricsComponent() {
  const {
    webVitals,
    apiMetrics,
    memoryMetrics,
    generateReport,
    trackApiCall,
    getWebVitalsScore,
    getApiPerformanceSummary,
    getLatestMemoryUsage
  } = usePerformanceMetrics();

  return (
    <div>
      <p>Web Vitals Score: {getWebVitalsScore().score}/100</p>
      <p>API Calls: {apiMetrics.length}</p>
      <p>Memory Usage: {getLatestMemoryUsage()?.usedJSHeapSize}</p>
    </div>
  );
}
```

### useWebVitals

Monitor Web Vitals:

```tsx
import { useWebVitals } from '@/lib/performance';

function WebVitalsComponent() {
  const { vitals, score, insights, subscribe, exportData } = useWebVitals();

  useEffect(() => {
    const unsubscribe = subscribe(newVitals => {
      console.log('Web Vitals updated:', newVitals);
    });

    return unsubscribe;
  }, [subscribe]);

  return (
    <div>
      <p>
        Overall Score: {score.overall}/100 (Grade: {score.grade})
      </p>
      <p>FCP: {vitals.fcp?.value}ms</p>
      <p>LCP: {vitals.lcp?.value}ms</p>
      <p>Insights: {insights.length}</p>
    </div>
  );
}
```

### useErrorMonitoring

Track and analyze errors:

```tsx
import { useErrorMonitoring } from '@/lib/performance';

function ErrorComponent() {
  const { captureError, errors, patterns, stats, subscribe, exportData } = useErrorMonitoring();

  const handleError = () => {
    captureError({
      message: 'User action failed',
      type: 'custom',
      severity: 'medium',
      context: { userId: 'user_123', action: 'submit_form' }
    });
  };

  return (
    <div>
      <p>Total Errors: {stats.total}</p>
      <p>Critical Errors: {stats.bySeverity.critical || 0}</p>
      <p>Error Patterns: {patterns.length}</p>
      <button onClick={handleError}>Trigger Test Error</button>
    </div>
  );
}
```

### useDatabaseMonitoring

Monitor database performance:

```tsx
import { useDatabaseMonitoring } from '@/lib/performance';

function DatabaseComponent() {
  const { queries, slowQueries, patterns, stats, insights, subscribe, exportData } =
    useDatabaseMonitoring();

  return (
    <div>
      <p>Total Queries: {stats.totalQueries}</p>
      <p>Average Duration: {stats.averageDuration.toFixed(2)}ms</p>
      <p>Slow Queries: {slowQueries.length}</p>
      <p>Cache Hit Rate: {(stats.cacheHitRate * 100).toFixed(1)}%</p>
      <p>Performance Insights: {insights.length}</p>
    </div>
  );
}
```

## ⚙️ Configuration

### Performance Thresholds

Configure performance thresholds:

```typescript
const config = {
  thresholds: {
    // Database
    slowQueryMs: 1000, // Queries slower than 1s
    frequentQueryCount: 100, // Queries executed 100+ times
    cacheHitRateThreshold: 0.8, // Cache hit rate below 80%

    // Components
    slowComponentMs: 100, // Component renders slower than 100ms

    // Errors
    errorRateThreshold: 0.05, // Error rate above 5%

    // Memory
    memoryUsageThreshold: 0.8 // Memory usage above 80%
  }
};
```

### Web Vitals Thresholds

Default Web Vitals thresholds (configurable):

```typescript
const webVitalsThresholds = {
  fcp: { good: 1800, needsImprovement: 3000 }, // ms
  lcp: { good: 2500, needsImprovement: 4000 }, // ms
  fid: { good: 100, needsImprovement: 300 }, // ms
  cls: { good: 0.1, needsImprovement: 0.25 }, // score
  ttfb: { good: 800, needsImprovement: 1800 }, // ms
  inp: { good: 200, needsImprovement: 500 } // ms
};
```

## 🔔 Alerts & Notifications

### Error Alert Rules

Configure custom alert rules:

```typescript
import { useErrorMonitoring } from '@/lib/performance';

function setupAlerts() {
  const { addAlertRule } = useErrorMonitoring();

  addAlertRule({
    id: 'high-error-rate',
    name: 'High Error Rate Detected',
    condition: errors => {
      const recentErrors = errors.filter(e => Date.now() - e.timestamp < 5 * 60 * 1000);
      return recentErrors.length >= 10;
    },
    severity: 'critical',
    cooldown: 15, // minutes
    actions: [
      { type: 'console', config: { level: 'error' } },
      { type: 'notification', config: { title: 'High Error Rate Alert' } },
      { type: 'webhook', config: { url: 'https://your-webhook.com/alert' } }
    ]
  });
}
```

### Notification Permissions

Request browser notification permissions:

```typescript
import { requestNotificationPermission } from '@/lib/performance';

// Request permission for browser notifications
requestNotificationPermission();
```

## 📈 Performance Insights

### Automatic Insights

The system automatically generates insights for:

- **Slow Queries**: Queries exceeding configured thresholds
- **Frequent Queries**: Often-executed queries that could benefit from caching
- **N+1 Patterns**: Detected N+1 query patterns
- **Memory Issues**: High memory usage or potential leaks
- **Web Vitals Issues**: Poor Core Web Vitals scores
- **API Performance**: Slow or failing API endpoints

### Custom Insights

Generate custom performance insights:

```typescript
import { PerformanceUtils } from '@/lib/performance';

// Calculate custom percentiles
const p95ResponseTime = PerformanceUtils.calculatePercentile(apiResponseTimes, 95);

// Get performance grade
const grade = PerformanceUtils.getPerformanceGrade(performanceScore);

// Format performance data
const formattedDuration = PerformanceUtils.formatDuration(1500); // "1.50s"
const formattedSize = PerformanceUtils.formatBytes(2048000); // "2 MB"
```

## 🧪 Testing

Run the performance monitoring test suite:

```bash
# Run all performance tests
npm test tests/performance/

# Run specific test file
npm test tests/performance/performance-monitoring.test.ts

# Run with coverage
npm run test:coverage tests/performance/
```

### Test Coverage

The test suite covers:

- ✅ Metrics collection and reporting
- ✅ Web Vitals monitoring
- ✅ Error tracking and pattern recognition
- ✅ Database query performance
- ✅ Utility functions
- ✅ Integration scenarios
- ✅ Error handling and edge cases

## 🚀 Performance Best Practices

### 1. Monitor Key Metrics

Focus on metrics that impact user experience:

- Core Web Vitals (FCP, LCP, FID, CLS)
- API response times
- Database query performance
- JavaScript errors

### 2. Set Appropriate Thresholds

Configure thresholds based on your application needs:

- Consider your user base and typical hardware
- Account for network conditions
- Set realistic but ambitious targets

### 3. Use Insights for Optimization

- Review insights regularly
- Prioritize high-impact issues
- Track improvements over time

### 4. Implement Caching

- Cache frequently accessed data
- Use appropriate cache strategies
- Monitor cache hit rates

### 5. Optimize Database Queries

- Add indexes for commonly filtered columns
- Avoid N+1 query patterns
- Use pagination for large datasets

### 6. Monitor Error Rates

- Set up alerting for error spikes
- Categorize errors by severity
- Track error resolution

## 📚 Advanced Usage

### Custom Metrics

Track custom business metrics:

```typescript
import { usePerformanceTracking } from '@/lib/performance';

function BusinessMetricsComponent() {
  const { trackCustomEvent } = usePerformanceTracking();

  const trackUserAction = (action: string, metadata?: any) => {
    const startTime = performance.now();

    // Perform action
    performAction(action);

    const duration = performance.now() - startTime;
    trackCustomEvent(`user-${action}`, duration, metadata);
  };

  return <button onClick={() => trackUserAction('form-submit')}>Submit</button>;
}
```

### Performance Budgets

Implement performance budgets:

```typescript
const performanceBudgets = {
  maxBundleSize: 500 * 1024, // 500KB
  maxApiResponseTime: 200, // 200ms
  maxDatabaseQueryTime: 100, // 100ms
  maxMemoryUsage: 0.7 // 70% of heap limit
};

// Check against budgets
function checkPerformanceBudgets(metrics: any) {
  const issues = [];

  if (metrics.bundleSize > performanceBudgets.maxBundleSize) {
    issues.push('Bundle size exceeds budget');
  }

  if (metrics.avgApiResponseTime > performanceBudgets.maxApiResponseTime) {
    issues.push('API response time exceeds budget');
  }

  return issues;
}
```

### Real-time Monitoring

Set up real-time performance monitoring:

```typescript
import { usePerformanceContext } from '@/lib/performance';

function RealTimeMonitor() {
  const { webVitalsMonitor, errorMonitor } = usePerformanceContext();
  const [liveMetrics, setLiveMetrics] = useState(null);

  useEffect(() => {
    const unsubscribeVitals = webVitalsMonitor.subscribe((vitals) => {
      setLiveMetrics(prev => ({ ...prev, vitals }));
    });

    const unsubscribeErrors = errorMonitor.subscribe((error) => {
      setLiveMetrics(prev => ({
        ...prev,
        lastError: error,
        errorCount: (prev?.errorCount || 0) + 1
      }));
    });

    return () => {
      unsubscribeVitals();
      unsubscribeErrors();
    };
  }, []);

  return (
    <div>
      {liveMetrics && (
        <div>
          <p>Live Performance Data</p>
          <p>Errors: {liveMetrics.errorCount}</p>
        </div>
      )}
    </div>
  );
}
```

## 🤝 Contributing

When contributing to the performance monitoring system:

1. **Add Tests**: Ensure new features have comprehensive tests
2. **Update Documentation**: Keep this documentation up to date
3. **Performance Impact**: Consider the performance impact of monitoring code itself
4. **Privacy**: Ensure no sensitive data is collected in performance metrics
5. **Backwards Compatibility**: Maintain API compatibility when possible

## 📞 Support

For issues or questions about the performance monitoring system:

1. Check the test suite for usage examples
2. Review the component source code for implementation details
3. Create an issue with detailed reproduction steps
4. Include performance data and browser information in bug reports

---

**Built with ❤️ for Astral Core v7 - Comprehensive Mental Health Platform**

The performance monitoring system is designed to scale with your application and provide actionable insights for continuous improvement. Regular monitoring and optimization ensure the best possible experience for your users seeking mental health support.
