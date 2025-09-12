'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface ReducedMotionContextType {
  prefersReducedMotion: boolean;
  respectSystemPreference: boolean;
  setRespectSystemPreference: (value: boolean) => void;
  overrideMotionPreference: (value: boolean) => void;
  isAnimationEnabled: (animationType?: 'essential' | 'decorative') => boolean;
}

const ReducedMotionContext = createContext<ReducedMotionContextType | null>(null);

interface ReducedMotionProviderProps {
  children: React.ReactNode;
  respectSystem?: boolean;
  persistPreference?: boolean;
}

export const ReducedMotionProvider: React.FC<ReducedMotionProviderProps> = ({
  children,
  respectSystem = true,
  persistPreference = true
}) => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [respectSystemPreference, setRespectSystemPreference] = useState(respectSystem);
  const [userOverride, setUserOverride] = useState<boolean | null>(null);

  // Detect system preference
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const updatePreference = () => {
      if (respectSystemPreference && userOverride === null) {
        setPrefersReducedMotion(mediaQuery.matches);
      }
    };

    updatePreference();
    mediaQuery.addEventListener('change', updatePreference);

    return () => mediaQuery.removeEventListener('change', updatePreference);
  }, [respectSystemPreference, userOverride]);

  // Load saved preferences
  useEffect(() => {
    if (persistPreference && typeof window !== 'undefined') {
      const savedRespectSystem = localStorage.getItem('respectSystemMotion');
      const savedOverride = localStorage.getItem('motionOverride');

      if (savedRespectSystem !== null) {
        setRespectSystemPreference(savedRespectSystem === 'true');
      }

      if (savedOverride !== null) {
        const override = savedOverride === 'true' ? true : savedOverride === 'false' ? false : null;
        setUserOverride(override);
        if (override !== null) {
          setPrefersReducedMotion(override);
        }
      }
    }
  }, [persistPreference]);

  // Apply motion preferences
  useEffect(() => {
    const root = document.documentElement;
    
    if (prefersReducedMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }

    // Inject CSS for reduced motion
    const styleId = 'reduced-motion-styles';
    
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        /* Reduced motion styles */
        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }
        }

        /* Manual reduced motion override */
        .reduce-motion *,
        .reduce-motion *::before,
        .reduce-motion *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
          scroll-behavior: auto !important;
        }

        /* Essential animations (keep these even with reduced motion) */
        .reduce-motion .animation-essential {
          animation-duration: 0.2s !important;
          transition-duration: 0.2s !important;
        }

        /* Completely disable decorative animations */
        .reduce-motion .animation-decorative {
          animation: none !important;
          transform: none !important;
        }

        /* Reduce but don't eliminate loading spinners */
        .reduce-motion .animate-spin {
          animation: spin 2s linear infinite !important;
        }

        /* Reduce pulse effects */
        .reduce-motion .animate-pulse {
          animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite !important;
        }

        /* Disable auto-playing animations */
        .reduce-motion [autoplay] {
          animation-play-state: paused !important;
        }

        /* Reduce parallax effects */
        .reduce-motion [data-parallax] {
          transform: none !important;
        }

        /* Simplify hover effects */
        .reduce-motion :hover {
          transition-duration: 0.1s !important;
        }

        /* Focus effects remain for accessibility */
        .reduce-motion :focus {
          transition-duration: 0.1s !important;
          outline-offset: 2px !important;
        }
      `;
      
      document.head.appendChild(style);
    }
  }, [prefersReducedMotion]);

  const handleRespectSystemChange = useCallback((value: boolean) => {
    setRespectSystemPreference(value);
    
    if (persistPreference && typeof window !== 'undefined') {
      localStorage.setItem('respectSystemMotion', value.toString());
    }

    // If respecting system again, clear override
    if (value) {
      setUserOverride(null);
      if (persistPreference && typeof window !== 'undefined') {
        localStorage.removeItem('motionOverride');
      }
      
      // Reapply system preference
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches);
    }
  }, [persistPreference]);

  const overrideMotionPreference = useCallback((value: boolean) => {
    setUserOverride(value);
    setPrefersReducedMotion(value);
    setRespectSystemPreference(false);
    
    if (persistPreference && typeof window !== 'undefined') {
      localStorage.setItem('motionOverride', value.toString());
      localStorage.setItem('respectSystemMotion', 'false');
    }

    // Announce change
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.className = 'sr-only';
    announcement.textContent = `Motion preference changed to ${value ? 'reduced' : 'normal'}`;
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      if (document.body.contains(announcement)) {
        document.body.removeChild(announcement);
      }
    }, 1000);
  }, [persistPreference]);

  const isAnimationEnabled = useCallback((animationType: 'essential' | 'decorative' = 'decorative') => {
    if (!prefersReducedMotion) return true;
    
    // Essential animations (loading, focus) are allowed with reduced motion
    if (animationType === 'essential') return true;
    
    // Decorative animations are disabled with reduced motion
    return false;
  }, [prefersReducedMotion]);

  const contextValue: ReducedMotionContextType = {
    prefersReducedMotion,
    respectSystemPreference,
    setRespectSystemPreference: handleRespectSystemChange,
    overrideMotionPreference,
    isAnimationEnabled
  };

  return (
    <ReducedMotionContext.Provider value={contextValue}>
      {children}
    </ReducedMotionContext.Provider>
  );
};

// Hook to use reduced motion context
export const useReducedMotion = (): ReducedMotionContextType => {
  const context = useContext(ReducedMotionContext);
  if (!context) {
    throw new Error('useReducedMotion must be used within a ReducedMotionProvider');
  }
  return context;
};

// Component for motion controls
interface MotionControlsProps {
  className?: string;
  showSystemToggle?: boolean;
}

export const MotionControls: React.FC<MotionControlsProps> = ({
  className = '',
  showSystemToggle = true
}) => {
  const {
    prefersReducedMotion,
    respectSystemPreference,
    setRespectSystemPreference,
    overrideMotionPreference
  } = useReducedMotion();

  const [systemPreference, setSystemPreference] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setSystemPreference(mediaQuery.matches);
      
      const updateSystem = () => setSystemPreference(mediaQuery.matches);
      mediaQuery.addEventListener('change', updateSystem);
      
      return () => mediaQuery.removeEventListener('change', updateSystem);
    }
  }, []);

  return (
    <div className={`motion-controls space-y-4 ${className}`}>
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Animation Preferences
        </h3>
        
        <div className="space-y-3">
          {/* Motion Preference */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Reduce Motion
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={prefersReducedMotion}
                onChange={(e) => overrideMotionPreference(e.target.checked)}
                className="sr-only"
              />
              <div className={`
                w-11 h-6 rounded-full transition-colors
                ${prefersReducedMotion ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}
              `}>
                <div className={`
                  w-5 h-5 bg-white rounded-full shadow-lg transform transition-transform
                  ${prefersReducedMotion ? 'translate-x-5' : 'translate-x-0.5'}
                  translate-y-0.5
                `} />
              </div>
            </label>
          </div>

          {/* System Preference Toggle */}
          {showSystemToggle && (
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Follow System Settings
                </span>
                {systemPreference && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    System prefers reduced motion
                  </p>
                )}
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-3">
                <input
                  type="checkbox"
                  checked={respectSystemPreference}
                  onChange={(e) => setRespectSystemPreference(e.target.checked)}
                  className="sr-only"
                />
                <div className={`
                  w-11 h-6 rounded-full transition-colors
                  ${respectSystemPreference ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}
                `}>
                  <div className={`
                    w-5 h-5 bg-white rounded-full shadow-lg transform transition-colors
                    ${respectSystemPreference ? 'translate-x-5' : 'translate-x-0.5'}
                    translate-y-0.5
                  `} />
                </div>
              </label>
            </div>
          )}
        </div>
      </div>

      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
        <p>• Reduced motion disables decorative animations</p>
        <p>• Essential animations (loading, focus) remain active</p>
        <p>• Helps reduce motion sensitivity and improve battery life</p>
      </div>
    </div>
  );
};

// HOC for conditional animation
interface AnimatedProps {
  children: React.ReactNode;
  type?: 'essential' | 'decorative';
  fallback?: React.ReactNode;
}

export const Animated: React.FC<AnimatedProps> = ({
  children,
  type = 'decorative',
  fallback = null
}) => {
  const { isAnimationEnabled } = useReducedMotion();
  
  if (!isAnimationEnabled(type)) {
    return <>{fallback || children}</>;
  }
  
  return <>{children}</>;
};

export default ReducedMotionProvider;