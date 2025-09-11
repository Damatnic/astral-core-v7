'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// Theme types
export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  systemTheme: ResolvedTheme;
}

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
  attribute?: string;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
}

// Create theme context
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Storage key for theme preference
const STORAGE_KEY = 'astral-theme';

// Get system theme preference
const getSystemTheme = (): ResolvedTheme => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

// Get stored theme preference
const getStoredTheme = (storageKey: string): Theme | null => {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(storageKey) as Theme;
  } catch (e) {
    console.warn('Failed to read theme from localStorage:', e);
    return null;
  }
};

// Store theme preference
const setStoredTheme = (storageKey: string, theme: Theme): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKey, theme);
  } catch (e) {
    console.warn('Failed to save theme to localStorage:', e);
  }
};

// Apply theme to document
const applyTheme = (
  theme: ResolvedTheme,
  attribute: string = 'data-theme',
  disableTransitionOnChange: boolean = false
): void => {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  
  // Temporarily disable transitions to prevent flashing
  if (disableTransitionOnChange) {
    const css = document.createElement('style');
    css.appendChild(
      document.createTextNode(
        '*{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}'
      )
    );
    document.head.appendChild(css);

    // Force repaint
    (() => window.getComputedStyle(document.body))();

    // Re-enable transitions after a short delay
    setTimeout(() => {
      document.head.removeChild(css);
    }, 1);
  }

  // Set theme attribute
  root.setAttribute(attribute, theme);
  root.className = root.className.replace(/theme-\w+/, `theme-${theme}`);
  
  // Update meta theme-color for mobile browsers
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute(
      'content',
      theme === 'dark' ? '#1a1a1a' : '#ffffff'
    );
  }

  // Announce theme change to screen readers
  const announcement = document.getElementById('urgent-announcements');
  if (announcement) {
    announcement.textContent = `Theme changed to ${theme} mode`;
    setTimeout(() => {
      announcement.textContent = '';
    }, 1000);
  }
};

// Theme Provider Component
export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = STORAGE_KEY,
  attribute = 'data-theme',
  enableSystem = true,
  disableTransitionOnChange = false,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return defaultTheme;
    return getStoredTheme(storageKey) || defaultTheme;
  });

  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => getSystemTheme());
  const [mounted, setMounted] = useState(false);

  // Calculate resolved theme
  const resolvedTheme: ResolvedTheme = theme === 'system' ? systemTheme : theme;

  // Set theme function
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    setStoredTheme(storageKey, newTheme);
    
    const resolved = newTheme === 'system' ? systemTheme : newTheme;
    applyTheme(resolved, attribute, disableTransitionOnChange);
  };

  // Toggle between light and dark (skips system)
  const toggleTheme = () => {
    const currentResolved = theme === 'system' ? systemTheme : theme;
    const newTheme = currentResolved === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  // Listen for system theme changes
  useEffect(() => {
    if (!enableSystem) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      const newSystemTheme = e.matches ? 'dark' : 'light';
      setSystemTheme(newSystemTheme);
      
      // If current theme is system, apply the new system theme
      if (theme === 'system') {
        applyTheme(newSystemTheme, attribute, disableTransitionOnChange);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, attribute, disableTransitionOnChange, enableSystem]);

  // Apply theme on mount and when theme changes
  useEffect(() => {
    if (!mounted) {
      setMounted(true);
      // Apply initial theme
      applyTheme(resolvedTheme, attribute, disableTransitionOnChange);
      return;
    }

    applyTheme(resolvedTheme, attribute, disableTransitionOnChange);
  }, [resolvedTheme, attribute, disableTransitionOnChange, mounted]);

  // Don't render until mounted to prevent hydration mismatch
  if (!mounted) {
    return <>{children}</>;
  }

  const contextValue: ThemeContextType = {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
    systemTheme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

// Hook to use theme
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// HOC for components that need theme awareness
export function withTheme<P extends object>(Component: React.ComponentType<P>) {
  return function ThemedComponent(props: P) {
    const themeContext = useTheme();
    return <Component {...props} theme={themeContext} />;
  };
}

// Theme-aware CSS class helper
export function themeClass(lightClass: string, darkClass: string, theme?: ResolvedTheme): string {
  if (typeof window === 'undefined') return lightClass;
  
  const currentTheme = theme || 
    (document.documentElement.getAttribute('data-theme') as ResolvedTheme) || 
    'light';
  
  return currentTheme === 'dark' ? darkClass : lightClass;
}

// CSS variable helper for dynamic theming
export function getCSSVariable(variable: string, fallback: string = ''): string {
  if (typeof window === 'undefined') return fallback;
  
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(variable)
    .trim();
  
  return value || fallback;
}