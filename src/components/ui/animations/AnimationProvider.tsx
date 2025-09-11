'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface AnimationSettings {
  reduceMotion: boolean;
  animationSpeed: 'slow' | 'normal' | 'fast';
  enableParticles: boolean;
  enableMicroInteractions: boolean;
  enableTransitions: boolean;
}

interface AnimationContextType {
  settings: AnimationSettings;
  updateSettings: (newSettings: Partial<AnimationSettings>) => void;
  getAnimationDuration: (baseMs: number) => number;
  shouldAnimate: () => boolean;
}

const AnimationContext = createContext<AnimationContextType | undefined>(undefined);

const defaultSettings: AnimationSettings = {
  reduceMotion: false,
  animationSpeed: 'normal',
  enableParticles: false,
  enableMicroInteractions: true,
  enableTransitions: true,
};

const speedMultipliers = {
  slow: 1.5,
  normal: 1,
  fast: 0.7,
};

interface AnimationProviderProps {
  children: ReactNode;
}

export function AnimationProvider({ children }: AnimationProviderProps) {
  const [settings, setSettings] = useState<AnimationSettings>(defaultSettings);

  useEffect(() => {
    // Check system preference for reduced motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const handleMotionPreference = (e: MediaQueryListEvent) => {
      setSettings(prev => ({
        ...prev,
        reduceMotion: e.matches
      }));
    };

    // Set initial value
    setSettings(prev => ({
      ...prev,
      reduceMotion: mediaQuery.matches
    }));

    mediaQuery.addEventListener('change', handleMotionPreference);
    
    // Load saved settings from localStorage
    const savedSettings = localStorage.getItem('astral-animation-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Failed to parse animation settings:', error);
      }
    }

    return () => {
      mediaQuery.removeEventListener('change', handleMotionPreference);
    };
  }, []);

  const updateSettings = (newSettings: Partial<AnimationSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    
    try {
      localStorage.setItem('astral-animation-settings', JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save animation settings:', error);
    }
  };

  const getAnimationDuration = (baseMs: number): number => {
    if (settings.reduceMotion) return 1; // Minimal duration for reduced motion
    return baseMs * speedMultipliers[settings.animationSpeed];
  };

  const shouldAnimate = (): boolean => {
    return !settings.reduceMotion && settings.enableTransitions;
  };

  const contextValue: AnimationContextType = {
    settings,
    updateSettings,
    getAnimationDuration,
    shouldAnimate,
  };

  return (
    <AnimationContext.Provider value={contextValue}>
      <div
        className={`
          transition-all duration-300
          ${settings.reduceMotion ? 'motion-reduce' : ''}
          ${settings.animationSpeed === 'fast' ? 'animate-fast' : ''}
          ${settings.animationSpeed === 'slow' ? 'animate-slow' : ''}
        `}
      >
        {children}
      </div>
    </AnimationContext.Provider>
  );
}

export function useAnimation() {
  const context = useContext(AnimationContext);
  if (context === undefined) {
    throw new Error('useAnimation must be used within an AnimationProvider');
  }
  return context;
}

// Calming animation variants for mental health apps
export const calmingAnimations = {
  // Gentle breathing animation
  breathe: {
    initial: { scale: 1 },
    animate: { 
      scale: [1, 1.05, 1],
      transition: { 
        duration: 4, 
        repeat: Infinity, 
        ease: "easeInOut" 
      }
    }
  },
  
  // Soft fade in
  softFadeIn: {
    initial: { opacity: 0, y: 10 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" }
    }
  },
  
  // Gentle slide from left
  slideInLeft: {
    initial: { opacity: 0, x: -20 },
    animate: { 
      opacity: 1, 
      x: 0,
      transition: { duration: 0.5, ease: "easeOut" }
    }
  },
  
  // Gentle slide from right
  slideInRight: {
    initial: { opacity: 0, x: 20 },
    animate: { 
      opacity: 1, 
      x: 0,
      transition: { duration: 0.5, ease: "easeOut" }
    }
  },
  
  // Soft scale in
  scaleIn: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { 
      opacity: 1, 
      scale: 1,
      transition: { duration: 0.4, ease: "easeOut" }
    }
  },
  
  // Gentle pulse for attention without being jarring
  gentlePulse: {
    animate: {
      scale: [1, 1.02, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  },
  
  // Wellness progress animation
  progressFill: {
    initial: { width: "0%" },
    animate: (progress: number) => ({
      width: `${progress}%`,
      transition: { duration: 1.2, ease: "easeOut" }
    })
  },
  
  // Success celebration (subtle)
  celebrate: {
    animate: {
      scale: [1, 1.1, 1],
      rotate: [0, 5, -5, 0],
      transition: { duration: 0.6, ease: "easeInOut" }
    }
  }
};

// Stagger children animations for lists
export const staggerChildren = {
  container: {
    animate: {
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  },
  item: {
    initial: { opacity: 0, y: 20 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" }
    }
  }
};

// Mental health specific micro-interactions
export const mentalHealthInteractions = {
  // Soothing button hover
  calmButton: {
    whileHover: { 
      scale: 1.02,
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
      transition: { duration: 0.2 }
    },
    whileTap: { 
      scale: 0.98,
      transition: { duration: 0.1 }
    }
  },
  
  // Card hover for wellness content
  wellnessCard: {
    whileHover: { 
      y: -2,
      boxShadow: "0 8px 25px rgba(0, 0, 0, 0.1)",
      transition: { duration: 0.3 }
    }
  },
  
  // Gentle journal entry animation
  journalEntry: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { 
      opacity: 1, 
      scale: 1,
      transition: { duration: 0.4, ease: "easeOut" }
    },
    exit: { 
      opacity: 0, 
      scale: 0.95,
      transition: { duration: 0.3 }
    }
  },
  
  // Mood indicator animation
  moodIndicator: {
    whileHover: { 
      scale: 1.1,
      transition: { duration: 0.2 }
    },
    whileTap: { 
      scale: 0.9,
      transition: { duration: 0.1 }
    }
  }
};