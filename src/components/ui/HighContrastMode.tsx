'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  EyeIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon
} from '@heroicons/react/24/outline';

interface HighContrastModeProps {
  children: React.ReactNode;
  persistPreference?: boolean;
  showToggle?: boolean;
  position?: 'floating' | 'inline';
  className?: string;
}

type ContrastMode = 'normal' | 'high' | 'auto';
type Theme = 'light' | 'dark' | 'system';

export const HighContrastMode: React.FC<HighContrastModeProps> = ({
  children,
  persistPreference = true,
  showToggle = true,
  position = 'floating',
  className = ''
}) => {
  const [contrastMode, setContrastMode] = useState<ContrastMode>('normal');
  const [theme, setTheme] = useState<Theme>('system');
  const [systemPreference, setSystemPreference] = useState<'light' | 'dark'>('light');

  // Detect system preferences
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check for high contrast preference
    const checkHighContrast = () => {
      const hasHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
      if (hasHighContrast && contrastMode === 'auto') {
        applyContrastMode('high');
      } else if (!hasHighContrast && contrastMode === 'auto') {
        applyContrastMode('normal');
      }
    };

    // Check for color scheme preference
    const checkColorScheme = () => {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setSystemPreference(prefersDark ? 'dark' : 'light');
    };

    checkHighContrast();
    checkColorScheme();

    // Listen for changes
    const contrastQuery = window.matchMedia('(prefers-contrast: high)');
    const colorQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    contrastQuery.addEventListener('change', checkHighContrast);
    colorQuery.addEventListener('change', checkColorScheme);

    return () => {
      contrastQuery.removeEventListener('change', checkHighContrast);
      colorQuery.removeEventListener('change', checkColorScheme);
    };
  }, [contrastMode]);

  // Load saved preferences
  useEffect(() => {
    if (persistPreference && typeof window !== 'undefined') {
      const savedContrast = localStorage.getItem('contrastMode') as ContrastMode;
      const savedTheme = localStorage.getItem('theme') as Theme;
      
      if (savedContrast) {
        setContrastMode(savedContrast);
      }
      if (savedTheme) {
        setTheme(savedTheme);
      }
    }
  }, [persistPreference]);

  // Apply contrast mode
  const applyContrastMode = useCallback((mode: ContrastMode) => {
    const root = document.documentElement;
    
    // Remove existing contrast classes
    root.classList.remove('contrast-normal', 'contrast-high', 'contrast-auto');
    
    // Add new contrast class
    root.classList.add(`contrast-${mode}`);
    
    // Apply high contrast styles
    if (mode === 'high' || (mode === 'auto' && window.matchMedia('(prefers-contrast: high)').matches)) {
      root.classList.add('high-contrast-active');
    } else {
      root.classList.remove('high-contrast-active');
    }
  }, []);

  // Apply theme
  const applyTheme = useCallback((newTheme: Theme) => {
    const root = document.documentElement;
    
    // Remove existing theme classes
    root.classList.remove('theme-light', 'theme-dark', 'theme-system');
    
    // Add new theme class
    root.classList.add(`theme-${newTheme}`);
    
    // Apply actual theme
    if (newTheme === 'system') {
      root.classList.toggle('dark', systemPreference === 'dark');
    } else {
      root.classList.toggle('dark', newTheme === 'dark');
    }
  }, [systemPreference]);

  // Handle contrast change
  const handleContrastChange = useCallback((newMode: ContrastMode) => {
    setContrastMode(newMode);
    applyContrastMode(newMode);
    
    // Save preference
    if (persistPreference && typeof window !== 'undefined') {
      localStorage.setItem('contrastMode', newMode);
    }
    
    // Announce change
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.className = 'sr-only';
    announcement.textContent = `Contrast mode changed to ${newMode}`;
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      if (document.body.contains(announcement)) {
        document.body.removeChild(announcement);
      }
    }, 1000);
  }, [applyContrastMode, persistPreference]);

  // Handle theme change
  const handleThemeChange = useCallback((newTheme: Theme) => {
    setTheme(newTheme);
    applyTheme(newTheme);
    
    // Save preference
    if (persistPreference && typeof window !== 'undefined') {
      localStorage.setItem('theme', newTheme);
    }
  }, [applyTheme, persistPreference]);

  // Apply modes on mount and when they change
  useEffect(() => {
    applyContrastMode(contrastMode);
  }, [applyContrastMode, contrastMode]);

  useEffect(() => {
    applyTheme(theme);
  }, [applyTheme, theme]);

  // Inject high contrast CSS
  useEffect(() => {
    const styleId = 'high-contrast-styles';
    
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        /* High contrast mode styles */
        .high-contrast-active {
          --bg-primary: #000000;
          --bg-secondary: #ffffff;
          --text-primary: #ffffff;
          --text-secondary: #000000;
          --border-color: #ffffff;
          --accent-color: #ffff00;
          --error-color: #ff0000;
          --success-color: #00ff00;
          --warning-color: #ffaa00;
          --info-color: #0099ff;
        }

        .high-contrast-active.dark {
          --bg-primary: #ffffff;
          --bg-secondary: #000000;
          --text-primary: #000000;
          --text-secondary: #ffffff;
          --border-color: #000000;
        }

        /* Apply high contrast styles */
        .high-contrast-active {
          background-color: var(--bg-primary) !important;
          color: var(--text-primary) !important;
        }

        .high-contrast-active * {
          border-color: var(--border-color) !important;
        }

        .high-contrast-active button,
        .high-contrast-active input,
        .high-contrast-active select,
        .high-contrast-active textarea {
          background-color: var(--bg-secondary) !important;
          color: var(--text-secondary) !important;
          border: 2px solid var(--border-color) !important;
        }

        .high-contrast-active button:hover,
        .high-contrast-active button:focus {
          background-color: var(--accent-color) !important;
          color: var(--bg-primary) !important;
          outline: 3px solid var(--border-color) !important;
          outline-offset: 2px !important;
        }

        .high-contrast-active a {
          color: var(--accent-color) !important;
          text-decoration: underline !important;
        }

        .high-contrast-active a:visited {
          color: #cc00cc !important;
        }

        .high-contrast-active a:hover,
        .high-contrast-active a:focus {
          background-color: var(--accent-color) !important;
          color: var(--bg-primary) !important;
        }

        /* Remove background images and shadows */
        .high-contrast-active * {
          background-image: none !important;
          box-shadow: none !important;
          text-shadow: none !important;
        }

        /* High contrast focus indicators */
        .high-contrast-active *:focus {
          outline: 3px solid var(--accent-color) !important;
          outline-offset: 2px !important;
        }

        /* Status indicators */
        .high-contrast-active .text-red-500,
        .high-contrast-active .text-red-600 {
          color: var(--error-color) !important;
        }

        .high-contrast-active .text-green-500,
        .high-contrast-active .text-green-600 {
          color: var(--success-color) !important;
        }

        .high-contrast-active .text-yellow-500,
        .high-contrast-active .text-yellow-600 {
          color: var(--warning-color) !important;
        }

        .high-contrast-active .text-blue-500,
        .high-contrast-active .text-blue-600 {
          color: var(--info-color) !important;
        }

        /* Ensure sufficient contrast for backgrounds */
        .high-contrast-active .bg-red-500,
        .high-contrast-active .bg-red-600 {
          background-color: var(--error-color) !important;
          color: var(--bg-primary) !important;
        }

        .high-contrast-active .bg-green-500,
        .high-contrast-active .bg-green-600 {
          background-color: var(--success-color) !important;
          color: var(--bg-primary) !important;
        }

        .high-contrast-active .bg-yellow-500,
        .high-contrast-active .bg-yellow-600 {
          background-color: var(--warning-color) !important;
          color: var(--bg-primary) !important;
        }

        .high-contrast-active .bg-blue-500,
        .high-contrast-active .bg-blue-600 {
          background-color: var(--info-color) !important;
          color: var(--bg-primary) !important;
        }

        /* Remove gradients and complex backgrounds */
        .high-contrast-active .bg-gradient-to-r,
        .high-contrast-active .bg-gradient-to-l,
        .high-contrast-active .bg-gradient-to-t,
        .high-contrast-active .bg-gradient-to-b {
          background: var(--bg-secondary) !important;
        }
      `;
      
      document.head.appendChild(style);
    }

    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  const ContrastToggle = () => (
    <div className="space-y-4">
      {/* Contrast Mode */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Contrast
        </label>
        <div className="grid grid-cols-3 gap-2">
          {([
            { value: 'normal', label: 'Normal', icon: EyeIcon },
            { value: 'high', label: 'High', icon: EyeIcon },
            { value: 'auto', label: 'Auto', icon: ComputerDesktopIcon }
          ] as const).map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => handleContrastChange(value)}
              className={`
                flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors
                ${contrastMode === value
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }
              `}
              aria-pressed={contrastMode === value}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Theme */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Theme
        </label>
        <div className="grid grid-cols-3 gap-2">
          {([
            { value: 'light', label: 'Light', icon: SunIcon },
            { value: 'dark', label: 'Dark', icon: MoonIcon },
            { value: 'system', label: 'System', icon: ComputerDesktopIcon }
          ] as const).map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => handleThemeChange(value)}
              className={`
                flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors
                ${theme === value
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }
              `}
              aria-pressed={theme === value}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="text-xs text-gray-500 dark:text-gray-400">
        <p>Auto mode follows your system preferences</p>
        {contrastMode === 'high' && (
          <p className="mt-1 text-yellow-600 dark:text-yellow-400">
            High contrast mode is active
          </p>
        )}
      </div>
    </div>
  );

  if (!showToggle) {
    return <>{children}</>;
  }

  if (position === 'floating') {
    return (
      <>
        {children}
        <div className={`fixed top-4 right-4 z-50 ${className}`}>
          <details className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
            <summary className="px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-t-lg list-none">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Display</span>
                <EyeIcon className="h-5 w-5 text-gray-500" />
              </div>
            </summary>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <ContrastToggle />
            </div>
          </details>
        </div>
      </>
    );
  }

  return (
    <div className={className}>
      <ContrastToggle />
      {children}
    </div>
  );
};

export default HighContrastMode;