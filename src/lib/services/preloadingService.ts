/**
 * Intelligent Preloading Service
 * Manages smart preloading of components based on user behavior and patterns
 */

type ComponentPreloader = () => Promise<any>;
type UserRole = 'ADMIN' | 'THERAPIST' | 'CLIENT' | 'CRISIS_RESPONDER' | 'SUPERVISOR';

interface PreloadingStrategy {
  immediate: ComponentPreloader[];
  onIdle: ComponentPreloader[];
  onVisible: ComponentPreloader[];
  onUserIntent: ComponentPreloader[];
}

interface UserBehaviorPattern {
  mostVisitedRoutes: string[];
  timeSpentOnPages: Record<string, number>;
  frequentFeatures: string[];
  lastVisited: string;
}

class PreloadingService {
  private preloadedComponents = new Set<string>();
  private isPreloading = false;
  private userBehavior: UserBehaviorPattern = {
    mostVisitedRoutes: [],
    timeSpentOnPages: {},
    frequentFeatures: [],
    lastVisited: ''
  };

  /**
   * Initialize the preloading service with user role and behavior data
   */
  initialize(userRole: UserRole, behaviorData?: Partial<UserBehaviorPattern>) {
    if (behaviorData) {
      this.userBehavior = { ...this.userBehavior, ...behaviorData };
    }

    // Get preloading strategy based on user role
    const strategy = this.getPreloadingStrategy(userRole);
    
    // Execute immediate preloads
    this.executePreloads(strategy.immediate);
    
    // Schedule idle preloads
    this.scheduleIdlePreloads(strategy.onIdle);
    
    // Setup visibility-based preloading
    this.setupVisibilityPreloading(strategy.onVisible);
    
    // Setup intent-based preloading
    this.setupIntentPreloading(strategy.onUserIntent);
  }

  /**
   * Get preloading strategy based on user role
   */
  private getPreloadingStrategy(userRole: UserRole): PreloadingStrategy {
    const baseStrategy: PreloadingStrategy = {
      immediate: [
        () => import('@/components/ui/LoadingFallback'),
        () => import('@/components/ui/Button'),
        () => import('@/components/ui/Card')
      ],
      onIdle: [],
      onVisible: [],
      onUserIntent: []
    };

    switch (userRole) {
      case 'ADMIN':
        return {
          ...baseStrategy,
          immediate: [
            ...baseStrategy.immediate,
            () => import('@/components/dashboards/AdminDashboard'),
            () => import('@/components/AnalyticsDashboard')
          ],
          onIdle: [
            () => import('@/components/billing/BillingDashboard'),
            () => import('@/components/performance/PerformanceDashboard'),
            () => import('@/components/performance/DatabaseMonitor')
          ],
          onVisible: [
            () => import('@/components/performance/ErrorMonitor'),
            () => import('@/components/performance/WebVitalsMonitor')
          ],
          onUserIntent: [
            () => import('@/components/billing/PaymentHistory'),
            () => import('@/components/billing/SubscriptionManager')
          ]
        };

      case 'THERAPIST':
        return {
          ...baseStrategy,
          immediate: [
            ...baseStrategy.immediate,
            () => import('@/components/dashboards/TherapistDashboard')
          ],
          onIdle: [
            () => import('@/components/billing/AppointmentPayment'),
            () => import('@/components/FileUpload')
          ],
          onVisible: [
            () => import('@/components/NotificationBell'),
            () => import('@/components/PresenceIndicator')
          ],
          onUserIntent: [
            () => import('@/components/billing/PaymentMethods')
          ]
        };

      case 'CLIENT':
        return {
          ...baseStrategy,
          immediate: [
            ...baseStrategy.immediate,
            () => import('@/components/dashboards/ClientDashboard')
          ],
          onIdle: [
            () => import('@/components/FileUpload'),
            () => import('@/components/NotificationBell')
          ],
          onVisible: [
            () => import('@/components/PresenceIndicator')
          ],
          onUserIntent: [
            () => import('@/components/billing/PaymentForm'),
            () => import('@/components/billing/PaymentMethods')
          ]
        };

      default:
        return baseStrategy;
    }
  }

  /**
   * Execute immediate preloads
   */
  private async executePreloads(preloaders: ComponentPreloader[]) {
    for (const preloader of preloaders) {
      try {
        await preloader();
        this.markAsPreloaded(preloader.toString());
      } catch (error) {
        console.warn('Failed to preload component:', error);
      }
    }
  }

  /**
   * Schedule preloads to run when the browser is idle
   */
  private scheduleIdlePreloads(preloaders: ComponentPreloader[]) {
    if (typeof window === 'undefined') return;

    const executeWhenIdle = () => {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => {
          this.executePreloads(preloaders);
        });
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(() => {
          this.executePreloads(preloaders);
        }, 1000);
      }
    };

    executeWhenIdle();
  }

  /**
   * Setup visibility-based preloading using Intersection Observer
   */
  private setupVisibilityPreloading(preloaders: ComponentPreloader[]) {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;

    // Create a dummy element to observe
    const triggerElement = document.createElement('div');
    triggerElement.style.position = 'absolute';
    triggerElement.style.top = '50vh';
    triggerElement.style.height = '1px';
    triggerElement.style.width = '1px';
    triggerElement.style.opacity = '0';
    document.body.appendChild(triggerElement);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.executePreloads(preloaders);
            observer.disconnect();
            document.body.removeChild(triggerElement);
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(triggerElement);
  }

  /**
   * Setup intent-based preloading (hover, focus on navigation)
   */
  private setupIntentPreloading(preloaders: ComponentPreloader[]) {
    if (typeof window === 'undefined') return;

    const preloadOnIntent = () => {
      this.executePreloads(preloaders);
    };

    // Preload on navigation link hover/focus
    const setupNavigationListeners = () => {
      const navLinks = document.querySelectorAll('a[href*="/"]');
      
      navLinks.forEach((link) => {
        let timeoutId: NodeJS.Timeout;
        
        const startPreload = () => {
          timeoutId = setTimeout(preloadOnIntent, 100); // 100ms delay
        };
        
        const cancelPreload = () => {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
        };
        
        link.addEventListener('mouseenter', startPreload);
        link.addEventListener('focusin', startPreload);
        link.addEventListener('mouseleave', cancelPreload);
        link.addEventListener('focusout', cancelPreload);
      });
    };

    // Setup listeners after DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setupNavigationListeners);
    } else {
      setupNavigationListeners();
    }
  }

  /**
   * Preload specific component by route
   */
  preloadByRoute(route: string): void {
    const routePreloaders: Record<string, ComponentPreloader[]> = {
      '/dashboard': [
        () => import('@/components/dashboards/lazy')
      ],
      '/billing': [
        () => import('@/components/billing/lazy')
      ],
      '/analytics': [
        () => import('@/components/lazy/AnalyticsLazy')
      ],
      '/wellness': [
        () => import('@/app/wellness/page')
      ],
      '/journal': [
        () => import('@/app/journal/page')
      ]
    };

    const preloaders = routePreloaders[route];
    if (preloaders) {
      this.executePreloads(preloaders);
    }
  }

  /**
   * Smart preloading based on user behavior patterns
   */
  smartPreload(): void {
    const { mostVisitedRoutes, frequentFeatures } = this.userBehavior;
    
    // Preload components for most visited routes
    mostVisitedRoutes.slice(0, 3).forEach(route => {
      this.preloadByRoute(route);
    });
    
    // Preload components for frequent features
    frequentFeatures.forEach(feature => {
      switch (feature) {
        case 'billing':
          this.executePreloads([
            () => import('@/components/billing/lazy')
          ]);
          break;
        case 'analytics':
          this.executePreloads([
            () => import('@/components/lazy/AnalyticsLazy')
          ]);
          break;
        case 'file-upload':
          this.executePreloads([
            () => import('@/components/FileUpload')
          ]);
          break;
      }
    });
  }

  /**
   * Update user behavior data
   */
  updateUserBehavior(data: Partial<UserBehaviorPattern>): void {
    this.userBehavior = { ...this.userBehavior, ...data };
  }

  /**
   * Track page visit for behavior analysis
   */
  trackPageVisit(route: string, timeSpent: number): void {
    // Update most visited routes
    if (!this.userBehavior.mostVisitedRoutes.includes(route)) {
      this.userBehavior.mostVisitedRoutes.push(route);
    }
    
    // Update time spent
    this.userBehavior.timeSpentOnPages[route] = 
      (this.userBehavior.timeSpentOnPages[route] || 0) + timeSpent;
    
    // Update last visited
    this.userBehavior.lastVisited = route;
    
    // Sort routes by total time spent
    this.userBehavior.mostVisitedRoutes.sort((a, b) => 
      (this.userBehavior.timeSpentOnPages[b] || 0) - 
      (this.userBehavior.timeSpentOnPages[a] || 0)
    );
  }

  /**
   * Mark component as preloaded
   */
  private markAsPreloaded(identifier: string): void {
    this.preloadedComponents.add(identifier);
  }

  /**
   * Check if component is already preloaded
   */
  isPreloaded(identifier: string): boolean {
    return this.preloadedComponents.has(identifier);
  }

  /**
   * Clear all preloaded components cache
   */
  clearCache(): void {
    this.preloadedComponents.clear();
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    return {
      preloadedCount: this.preloadedComponents.size,
      userBehavior: this.userBehavior,
      isPreloading: this.isPreloading
    };
  }
}

// Export singleton instance
export const preloadingService = new PreloadingService();

// Export convenience functions
export const initializePreloading = (userRole: UserRole, behaviorData?: Partial<UserBehaviorPattern>) => {
  preloadingService.initialize(userRole, behaviorData);
};

export const trackPageVisit = (route: string, timeSpent: number) => {
  preloadingService.trackPageVisit(route, timeSpent);
};

export const preloadByRoute = (route: string) => {
  preloadingService.preloadByRoute(route);
};

export const smartPreload = () => {
  preloadingService.smartPreload();
};