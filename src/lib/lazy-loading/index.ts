/**
 * Central Lazy Loading Configuration
 * Manages code splitting and dynamic imports across the application
 */

import { ComponentType } from 'react';

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

  // Billing components (large, load on demand)
  billing: {
    priority: LoadingPriority.MEDIUM,
    strategy: LoadingStrategy.ON_INTERACTION,
    components: {
      paymentHistory: () => import('@/components/billing/PaymentHistory'),
      subscriptionManager: () => import('@/components/billing/SubscriptionManager'),
      billingDashboard: () => import('@/components/billing/BillingDashboard'),
      paymentMethods: () => import('@/components/billing/PaymentMethods'),
      paymentForm: () => import('@/components/billing/PaymentForm'),
      appointmentPayment: () => import('@/components/billing/AppointmentPayment')
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

  billing: {
    all: () => {
      Object.values(LAZY_LOADING_CONFIG.billing.components).forEach(loader => loader());
    },
    paymentHistory: () => LAZY_LOADING_CONFIG.billing.components.paymentHistory(),
    subscriptionManager: () => LAZY_LOADING_CONFIG.billing.components.subscriptionManager(),
    billingDashboard: () => LAZY_LOADING_CONFIG.billing.components.billingDashboard(),
    paymentMethods: () => LAZY_LOADING_CONFIG.billing.components.paymentMethods(),
    paymentForm: () => LAZY_LOADING_CONFIG.billing.components.paymentForm(),
    appointmentPayment: () => LAZY_LOADING_CONFIG.billing.components.appointmentPayment()
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
  PaymentHistory: 35,
  SubscriptionManager: 34,
  BillingDashboard: 22,
  PaymentMethods: 28,
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
      // Therapists might access client billing
      preloadComponents.billing.billingDashboard();
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
      preloadComponents.billing.all();
      preloadComponents.analytics.dashboard();
    });
  }
};