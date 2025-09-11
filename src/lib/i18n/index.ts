'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  SupportedLocale, 
  TranslationNamespace, 
  TranslationFunction,
  LocaleConfig 
} from './types';
import { 
  SUPPORTED_LOCALES, 
  DEFAULT_LOCALE, 
  FALLBACK_LOCALES,
  LOCALE_DETECTION_CONFIG,
  getLocaleConfig,
  isRTLLocale 
} from './config';

// Translation context
interface I18nContextType {
  locale: SupportedLocale;
  localeConfig: LocaleConfig;
  setLocale: (locale: SupportedLocale) => void;
  t: TranslationFunction;
  isLoading: boolean;
  isRTL: boolean;
  formatDate: (date: Date, options?: Intl.DateTimeFormatOptions) => string;
  formatTime: (date: Date, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (number: number, options?: Intl.NumberFormatOptions) => string;
  formatCurrency: (amount: number, currency?: string) => string;
  formatRelativeTime: (date: Date) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

// Translation cache
const translationCache = new Map<string, any>();
const loadingPromises = new Map<string, Promise<any>>();

// Get browser locale
function getBrowserLocale(): SupportedLocale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  
  const browserLang = navigator.language.split('-')[0] as SupportedLocale;
  return Object.keys(SUPPORTED_LOCALES).includes(browserLang) 
    ? browserLang 
    : DEFAULT_LOCALE;
}

// Get stored locale
function getStoredLocale(): SupportedLocale | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(LOCALE_DETECTION_CONFIG.storageKey);
    return stored && Object.keys(SUPPORTED_LOCALES).includes(stored) 
      ? stored as SupportedLocale 
      : null;
  } catch {
    return null;
  }
}

// Store locale preference
function storeLocale(locale: SupportedLocale): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(LOCALE_DETECTION_CONFIG.storageKey, locale);
  } catch (error) {
    console.warn('Failed to store locale preference:', error);
  }
}

// Load translation file
async function loadTranslation(locale: SupportedLocale, namespace: string): Promise<any> {
  const cacheKey = `${locale}-${namespace}`;
  
  // Return cached translation
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }
  
  // Return existing loading promise
  if (loadingPromises.has(cacheKey)) {
    return loadingPromises.get(cacheKey);
  }
  
  // Create loading promise
  const loadingPromise = fetch(`/locales/${locale}/${namespace}.json`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to load translation: ${locale}/${namespace}`);
      }
      return response.json();
    })
    .then(translations => {
      translationCache.set(cacheKey, translations);
      loadingPromises.delete(cacheKey);
      return translations;
    })
    .catch(error => {
      loadingPromises.delete(cacheKey);
      console.error('Translation loading error:', error);
      
      // Try fallback locale
      const fallbacks = FALLBACK_LOCALES[locale] || [];
      if (fallbacks.length > 0) {
        return loadTranslation(fallbacks[0], namespace);
      }
      
      return {};
    });
  
  loadingPromises.set(cacheKey, loadingPromise);
  return loadingPromise;
}

// Interpolate translation string with parameters
function interpolate(template: string, params: Record<string, string | number> = {}): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = params[key];
    return value !== undefined ? String(value) : match;
  });
}

// Get nested property from object
function getNestedProperty(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

// I18n Provider Component
interface I18nProviderProps {
  children: ReactNode;
  initialLocale?: SupportedLocale;
}

export function I18nProvider({ children, initialLocale }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<SupportedLocale>(() => {
    return initialLocale || getStoredLocale() || getBrowserLocale();
  });
  
  const [translations, setTranslations] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  
  const localeConfig = getLocaleConfig(locale);
  const isRTL = isRTLLocale(locale);
  
  // Load translations for current locale
  useEffect(() => {
    let isCancelled = false;
    
    async function loadTranslations() {
      setIsLoading(true);
      
      try {
        // Load critical namespaces first
        const criticalNamespaces = ['common', 'auth', 'emergency'];
        const criticalPromises = criticalNamespaces.map(ns => 
          loadTranslation(locale, ns)
        );
        
        const criticalTranslations = await Promise.all(criticalPromises);
        
        if (!isCancelled) {
          const translationsMap: Record<string, any> = {};
          criticalNamespaces.forEach((ns, index) => {
            translationsMap[ns] = criticalTranslations[index];
          });
          
          setTranslations(translationsMap);
          setIsLoading(false);
          
          // Load remaining namespaces in background
          const remainingNamespaces = [
            'dashboard', 'wellness', 'journal', 'therapy', 
            'billing', 'settings', 'accessibility'
          ];
          
          remainingNamespaces.forEach(async (ns) => {
            try {
              const translation = await loadTranslation(locale, ns);
              if (!isCancelled) {
                setTranslations(prev => ({ ...prev, [ns]: translation }));
              }
            } catch (error) {
              console.warn(`Failed to load namespace ${ns}:`, error);
            }
          });
        }
      } catch (error) {
        console.error('Failed to load critical translations:', error);
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }
    
    loadTranslations();
    
    return () => {
      isCancelled = true;
    };
  }, [locale]);
  
  // Update document language and direction
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
      document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    }
  }, [locale, isRTL]);
  
  const setLocale = (newLocale: SupportedLocale) => {
    setLocaleState(newLocale);
    storeLocale(newLocale);
  };
  
  // Translation function
  const t: TranslationFunction = (key: string, params?: Record<string, string | number>) => {
    const [namespace, ...pathParts] = key.split('.');
    const path = pathParts.join('.');
    
    const namespaceTranslations = translations[namespace];
    if (!namespaceTranslations) {
      return key; // Return key if namespace not loaded
    }
    
    const translation = getNestedProperty(namespaceTranslations, path);
    if (typeof translation !== 'string') {
      return key; // Return key if translation not found
    }
    
    return interpolate(translation, params);
  };
  
  // Formatting functions
  const formatDate = (date: Date, options?: Intl.DateTimeFormatOptions) => {
    return new Intl.DateTimeFormat(locale, {
      ...options,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }).format(date);
  };
  
  const formatTime = (date: Date, options?: Intl.DateTimeFormatOptions) => {
    return new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      ...options
    }).format(date);
  };
  
  const formatNumber = (number: number, options?: Intl.NumberFormatOptions) => {
    return localeConfig.numberFormat.format(number);
  };
  
  const formatCurrency = (amount: number, currency?: string) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency || localeConfig.currencyCode
    }).format(amount);
  };
  
  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    
    if (Math.abs(diffInSeconds) < 60) {
      return rtf.format(-diffInSeconds, 'second');
    } else if (Math.abs(diffInSeconds) < 3600) {
      return rtf.format(-Math.floor(diffInSeconds / 60), 'minute');
    } else if (Math.abs(diffInSeconds) < 86400) {
      return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour');
    } else {
      return rtf.format(-Math.floor(diffInSeconds / 86400), 'day');
    }
  };
  
  const contextValue: I18nContextType = {
    locale,
    localeConfig,
    setLocale,
    t,
    isLoading,
    isRTL,
    formatDate,
    formatTime,
    formatNumber,
    formatCurrency,
    formatRelativeTime
  };
  
  return (
    <I18nContext.Provider value={contextValue}>
      {children}
    </I18nContext.Provider>
  );
}

// Hook to use I18n
export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

// Hook for translation only (optimized)
export function useTranslation() {
  const { t, locale, isLoading } = useI18n();
  return { t, locale, isLoading };
}

// HOC for components that need translation
export function withTranslation<P extends object>(Component: React.ComponentType<P>) {
  return function TranslatedComponent(props: P) {
    const i18n = useI18n();
    return <Component {...props} i18n={i18n} />;
  };
}

// Utility functions
export { 
  SUPPORTED_LOCALES, 
  DEFAULT_LOCALE, 
  getLocaleConfig, 
  isRTLLocale 
} from './config';

export type { 
  SupportedLocale, 
  LocaleConfig, 
  TranslationFunction 
} from './types';