/**
 * Central Lazy Loading Configuration
 * Manages code splitting and dynamic imports across the application
 */

// Component loading strategies
export enum LoadingStrategy {
  IMMEDIATE = 'immediate',
  ON_HOVER = 'on_hover',
  ON_INTERACTION = 'on_interaction',
  ON_VIEWPORT = 'on_viewport'
}

// Component priority levels
export enum LoadingPriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

// Lazy loading configuration for components
export const LAZY_LOADING_CONFIG = {
  // Dashboard components (loaded based on user role)
  dashboards: {
    priority: LoadingPriority.HIGH,
    strategy: LoadingStrategy.IMMEDIATE,
    components: {
      admin: () => import('@/components/dashboards/AdminDashboard'),
      therapist: () => import('@/components/dashboards/TherapistDashboard'),
      client: () => import('@/components/dashboards/ClientDashboard')
    }
  },


  // Analytics components (heavy, load when needed)
  analytics: {
    priority: LoadingPriority.MEDIUM,
    strategy: LoadingStrategy.ON_INTERACTION,
    components: {
      dashboard: () => import('@/components/AnalyticsDashboard')
    }
  },

  // Large utility components
  utilities: {
    priority: LoadingPriority.LOW,
    strategy: LoadingStrategy.ON_INTERACTION,
    components: {
      mfaSetup: () => import('@/components/MfaSetup'),
      fileUpload: () => import('@/components/FileUpload'),
      notificationBell: () => import('@/components/NotificationBell')
    }
  },

  // Page components
  pages: {
    priority: LoadingPriority.HIGH,
    strategy: LoadingStrategy.IMMEDIATE,
    components: {
      journal: () => import('@/app/journal/page'),
      wellness: () => import('@/app/wellness/page')
    }
  }
} as const;

// Preload functions by category
export const preloadComponents = {
  dashboard: (role: string) => {
    const roleKey = role.toLowerCase() as keyof typeof LAZY_LOADING_CONFIG.dashboards.components;
    if (LAZY_LOADING_CONFIG.dashboards.components[roleKey]) {
      LAZY_LOADING_CONFIG.dashboards.components[roleKey]();
    }
  },


  analytics: {
    dashboard: () => LAZY_LOADING_CONFIG.analytics.components.dashboard()
  },

  utilities: {
    mfaSetup: () => LAZY_LOADING_CONFIG.utilities.components.mfaSetup(),
    fileUpload: () => LAZY_LOADING_CONFIG.utilities.components.fileUpload(),
    notificationBell: () => LAZY_LOADING_CONFIG.utilities.components.notificationBell()
  },

  pages: {
    journal: () => LAZY_LOADING_CONFIG.pages.components.journal(),
    wellness: () => LAZY_LOADING_CONFIG.pages.components.wellness()
  }
};

// Bundle size tracking (for development)
export const COMPONENT_SIZES = {
  // Estimated sizes in KB (for monitoring)
  AnalyticsDashboard: 26,
  MfaSetup: 21,
  FileUpload: 18,
  NotificationBell: 16,
  ClientDashboard: 15,
  JournalPage: 18,
  WellnessPage: 16
};

// Preload based on user behavior patterns
export const preloadByUserRole = (role: string) => {
  // Preload dashboard
  preloadComponents.dashboard(role);

  // Role-specific preloading
  switch (role.toUpperCase()) {
    case 'ADMIN':
      // Admin users often access analytics
      preloadComponents.analytics.dashboard();
      break;
    case 'THERAPIST':
      // Therapists focus on client care
      break;
    case 'CLIENT':
      // Clients often use journal and wellness tracking
      preloadComponents.pages.journal();
      preloadComponents.pages.wellness();
      break;
  }
};

// Progressive loading helper
export const progressivelyLoadComponents = () => {
  // Load high priority components first
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      // Load medium priority components when browser is idle
      preloadComponents.analytics.dashboard();
    });
  }
};
