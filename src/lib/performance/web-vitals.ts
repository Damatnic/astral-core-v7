/**
 * Core Web Vitals Monitoring
 * Advanced monitoring for Web Vitals with detailed insights and recommendations
 */

'use client';

export interface WebVital {
  name: string;
  value: number;
  delta: number;
  id: string;
  entries: PerformanceEntry[];
}

export interface WebVitalsData {
  fcp?: WebVital;
  lcp?: WebVital;
  fid?: WebVital;
  cls?: WebVital;
  ttfb?: WebVital;
  inp?: WebVital;
}

export interface WebVitalsThresholds {
  fcp: { good: number; needsImprovement: number };
  lcp: { good: number; needsImprovement: number };
  fid: { good: number; needsImprovement: number };
  cls: { good: number; needsImprovement: number };
  ttfb: { good: number; needsImprovement: number };
  inp: { good: number; needsImprovement: number };
}

export interface WebVitalsInsight {
  metric: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  recommendation: string;
  impact: 'high' | 'medium' | 'low';
}

const WEB_VITALS_THRESHOLDS: WebVitalsThresholds = {
  fcp: { good: 1800, needsImprovement: 3000 },
  lcp: { good: 2500, needsImprovement: 4000 },
  fid: { good: 100, needsImprovement: 300 },
  cls: { good: 0.1, needsImprovement: 0.25 },
  ttfb: { good: 800, needsImprovement: 1800 },
  inp: { good: 200, needsImprovement: 500 }
};

class WebVitalsMonitor {
  private vitals: WebVitalsData = {};
  private observers: Map<string, PerformanceObserver> = new Map();
  private callbacks: ((data: WebVitalsData) => void)[] = [];
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (typeof window === 'undefined' || this.isInitialized) return;
    
    this.isInitialized = true;
    this.setupVitalsMonitoring();
  }

  private setupVitalsMonitoring() {
    // First Contentful Paint
    this.observeVital('paint', (entries) => {
      const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
      if (fcpEntry) {
        this.updateVital('fcp', fcpEntry.startTime, fcpEntry.startTime, 'fcp-' + Date.now(), [fcpEntry]);
      }
    });

    // Largest Contentful Paint
    this.observeVital('largest-contentful-paint', (entries) => {
      const lcpEntry = entries[entries.length - 1]; // Get the latest LCP
      if (lcpEntry) {
        this.updateVital('lcp', lcpEntry.startTime, lcpEntry.startTime, 'lcp-' + Date.now(), [lcpEntry]);
      }
    });

    // First Input Delay
    this.observeVital('first-input', (entries) => {
      const fidEntry = entries[0];
      if (fidEntry) {
        const delay = (fidEntry as PerformanceEventTiming).processingStart - fidEntry.startTime;
        this.updateVital('fid', delay, delay, 'fid-' + Date.now(), [fidEntry]);
      }
    });

    // Cumulative Layout Shift
    let clsValue = 0;
    const clsEntries: PerformanceEntry[] = [];
    
    this.observeVital('layout-shift', (entries) => {
      for (const entry of entries) {
        const layoutEntry = entry as PerformanceEntry & { hadRecentInput?: boolean; value: number };
        if (!layoutEntry.hadRecentInput) {
          clsValue += layoutEntry.value;
          clsEntries.push(entry);
        }
      }
      
      const lastEntry = entries[entries.length - 1] as PerformanceEntry & { value: number };
      this.updateVital('cls', clsValue, lastEntry.value, 'cls-' + Date.now(), clsEntries);
    });

    // Time to First Byte
    this.observeVital('navigation', (entries) => {
      const navigationEntry = entries[0] as PerformanceNavigationTiming;
      if (navigationEntry) {
        const ttfb = navigationEntry.responseStart - navigationEntry.requestStart;
        this.updateVital('ttfb', ttfb, ttfb, 'ttfb-' + Date.now(), [navigationEntry]);
      }
    });

    // Interaction to Next Paint (for browsers that support it)
    if ('PerformanceEventTiming' in window) {
      this.observeVital('event', (entries) => {
        let maxDelay = 0;
        let inpEntry: PerformanceEntry | null = null;
        
        for (const entry of entries) {
          const eventEntry = entry as PerformanceEntry & { interactionId?: number; duration: number };
          if (eventEntry.interactionId && eventEntry.duration) {
            if (eventEntry.duration > maxDelay) {
              maxDelay = eventEntry.duration;
              inpEntry = entry;
            }
          }
        }
        
        if (inpEntry) {
          this.updateVital('inp', maxDelay, maxDelay, 'inp-' + Date.now(), [inpEntry]);
        }
      });
    }
  }

  private observeVital(
    entryType: string,
    callback: (entries: PerformanceEntry[]) => void
  ) {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        callback(list.getEntries());
      });

      observer.observe({ 
        type: entryType, 
        buffered: true 
      });
      
      this.observers.set(entryType, observer);
    } catch (e) {
      console.warn(`Failed to observe ${entryType}:`, e);
    }
  }

  private updateVital(
    name: keyof WebVitalsData,
    value: number,
    delta: number,
    id: string,
    entries: PerformanceEntry[]
  ) {
    this.vitals[name] = {
      name: name.toUpperCase(),
      value,
      delta,
      id,
      entries: [...entries]
    };

    this.notifyCallbacks();
  }

  private notifyCallbacks() {
    this.callbacks.forEach(callback => {
      try {
        callback({ ...this.vitals });
      } catch (e) {
        console.error('Error in web vitals callback:', e);
      }
    });
  }

  public getVitals(): WebVitalsData {
    return { ...this.vitals };
  }

  public subscribe(callback: (data: WebVitalsData) => void): () => void {
    this.callbacks.push(callback);
    
    // Immediately call with current data
    if (Object.keys(this.vitals).length > 0) {
      callback({ ...this.vitals });
    }

    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  public getVitalsScore(): {
    overall: number;
    grade: string;
    details: Record<string, { score: number; rating: string }>;
  } {
    const details: Record<string, { score: number; rating: string }> = {};
    let totalScore = 0;
    let metricCount = 0;

    Object.entries(this.vitals).forEach(([key, vital]) => {
      if (!vital) return;
      
      const thresholds = WEB_VITALS_THRESHOLDS[key as keyof WebVitalsThresholds];
      if (!thresholds) return;

      let score = 100;
      let rating = 'good';

      if (vital.value > thresholds.needsImprovement) {
        score = 40;
        rating = 'poor';
      } else if (vital.value > thresholds.good) {
        score = 70;
        rating = 'needs-improvement';
      }

      details[key] = { score, rating };
      totalScore += score;
      metricCount++;
    });

    const overall = metricCount > 0 ? Math.round(totalScore / metricCount) : 0;
    let grade: string;
    
    if (overall >= 90) grade = 'A';
    else if (overall >= 80) grade = 'B';
    else if (overall >= 70) grade = 'C';
    else if (overall >= 60) grade = 'D';
    else grade = 'F';

    return { overall, grade, details };
  }

  public getInsights(): WebVitalsInsight[] {
    const insights: WebVitalsInsight[] = [];
    
    Object.entries(this.vitals).forEach(([key, vital]) => {
      if (!vital) return;
      
      const thresholds = WEB_VITALS_THRESHOLDS[key as keyof WebVitalsThresholds];
      if (!thresholds) return;

      let rating: 'good' | 'needs-improvement' | 'poor' = 'good';
      let recommendation = '';
      let impact: 'high' | 'medium' | 'low' = 'low';

      if (vital.value > thresholds.needsImprovement) {
        rating = 'poor';
        impact = 'high';
      } else if (vital.value > thresholds.good) {
        rating = 'needs-improvement';
        impact = 'medium';
      }

      // Generate specific recommendations
      switch (key) {
        case 'fcp':
          if (rating !== 'good') {
            recommendation = vital.value > 3000 
              ? 'Consider reducing server response time, eliminating render-blocking resources, and optimizing critical rendering path.'
              : 'Optimize critical resources loading and reduce initial payload size.';
          }
          break;
        
        case 'lcp':
          if (rating !== 'good') {
            recommendation = vital.value > 4000
              ? 'Optimize largest content element loading, use efficient image formats, and implement preloading for critical resources.'
              : 'Consider image optimization and resource prioritization.';
          }
          break;
        
        case 'fid':
          if (rating !== 'good') {
            recommendation = vital.value > 300
              ? 'Reduce JavaScript execution time, break up long tasks, and optimize event handlers.'
              : 'Consider code splitting and reducing main thread blocking.';
          }
          break;
        
        case 'cls':
          if (rating !== 'good') {
            recommendation = vital.value > 0.25
              ? 'Set explicit dimensions for images and ads, avoid inserting content above existing content, and use CSS transform for animations.'
              : 'Reserve space for dynamic content and avoid layout shifts.';
          }
          break;
        
        case 'ttfb':
          if (rating !== 'good') {
            recommendation = vital.value > 1800
              ? 'Optimize server performance, implement CDN, and reduce database query time.'
              : 'Consider server-side optimizations and caching strategies.';
          }
          break;
        
        case 'inp':
          if (rating !== 'good') {
            recommendation = vital.value > 500
              ? 'Optimize event handlers, reduce main thread blocking, and defer non-critical JavaScript.'
              : 'Improve interaction responsiveness with better task scheduling.';
          }
          break;
      }

      if (recommendation) {
        insights.push({
          metric: vital.name,
          value: vital.value,
          rating,
          recommendation,
          impact
        });
      }
    });

    return insights.sort((a, b) => {
      const impactOrder = { high: 3, medium: 2, low: 1 };
      return impactOrder[b.impact] - impactOrder[a.impact];
    });
  }

  public exportData(): {
    vitals: WebVitalsData;
    score: ReturnType<WebVitalsMonitor['getVitalsScore']>;
    insights: WebVitalsInsight[];
    timestamp: number;
  } {
    return {
      vitals: this.getVitals(),
      score: this.getVitalsScore(),
      insights: this.getInsights(),
      timestamp: Date.now()
    };
  }

  public cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    this.callbacks.length = 0;
  }
}

// Singleton instance
let webVitalsMonitor: WebVitalsMonitor | null = null;

export function getWebVitalsMonitor(): WebVitalsMonitor {
  if (!webVitalsMonitor) {
    webVitalsMonitor = new WebVitalsMonitor();
  }
  return webVitalsMonitor;
}

// React hook
export function useWebVitals() {
  const monitor = getWebVitalsMonitor();
  
  return {
    vitals: monitor.getVitals(),
    score: monitor.getVitalsScore(),
    insights: monitor.getInsights(),
    subscribe: monitor.subscribe.bind(monitor),
    exportData: monitor.exportData.bind(monitor)
  };
}

// Utility to send vitals to analytics
export function sendVitalsToAnalytics(vitals: WebVitalsData, endpoint = '/api/analytics/vitals') {
  if (typeof window === 'undefined') return;

  const data = Object.entries(vitals).reduce((acc, [key, vital]) => {
    if (vital) {
      acc[key] = {
        value: vital.value,
        rating: vital.value <= WEB_VITALS_THRESHOLDS[key as keyof WebVitalsThresholds]?.good ? 'good' :
                vital.value <= WEB_VITALS_THRESHOLDS[key as keyof WebVitalsThresholds]?.needsImprovement ? 'needs-improvement' :
                'poor'
      };
    }
    return acc;
  }, {} as Record<string, { value: number; rating: string }>);

  fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      vitals: data,
      url: window.location.pathname,
      timestamp: Date.now(),
      userAgent: navigator.userAgent
    })
  }).catch(error => {
    console.warn('Failed to send vitals to analytics:', error);
  });
}

// Development helper
export function logWebVitals() {
  if (process.env.NODE_ENV === 'development') {
    const monitor = getWebVitalsMonitor();
    const data = monitor.exportData();
    
    console.group('Web Vitals Report');
    console.log('Overall Score:', `${data.score.overall}/100 (${data.score.grade})`);
    console.table(data.vitals);
    console.log('Insights:', data.insights);
    console.groupEnd();
  }
}