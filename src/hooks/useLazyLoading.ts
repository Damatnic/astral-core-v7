/**
 * useLazyLoading Hook
 * Manages lazy loading of components with intersection observer and hover preloading
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { LoadingStrategy, LoadingPriority } from '@/lib/lazy-loading';

interface UseLazyLoadingOptions {
  strategy?: LoadingStrategy;
  priority?: LoadingPriority;
  threshold?: number;
  rootMargin?: string;
  preloadOnHover?: boolean;
  preloadDelay?: number;
}

interface UseLazyLoadingReturn {
  ref: React.RefObject<HTMLElement | null>;
  shouldLoad: boolean;
  isVisible: boolean;
  preload: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onFocus: () => void;
}

export function useLazyLoading<T = unknown>(
  preloadFn: () => Promise<T>,
  options: UseLazyLoadingOptions = {}
): UseLazyLoadingReturn {
  const {
    strategy = LoadingStrategy.ON_INTERACTION,
    priority = LoadingPriority.MEDIUM,
    threshold = 0.1,
    rootMargin = '50px',
    preloadOnHover = true,
    preloadDelay = 200
  } = options;

  const [shouldLoad, setShouldLoad] = useState(
    strategy === LoadingStrategy.IMMEDIATE || 
    priority === LoadingPriority.HIGH
  );
  const [isVisible, setIsVisible] = useState(false);
  const [hasPreloaded, setHasPreloaded] = useState(false);
  
  const ref = useRef<HTMLElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const observerRef = useRef<IntersectionObserver | undefined>(undefined);

  // Preload function
  const preload = useCallback(async () => {
    if (hasPreloaded) return;
    
    try {
      await preloadFn();
      setHasPreloaded(true);
    } catch (error) {
      console.warn('Failed to preload component:', error);
    }
  }, [preloadFn, hasPreloaded]);

  // Mouse enter handler for hover preloading
  const onMouseEnter = useCallback(() => {
    if (!preloadOnHover || hasPreloaded) return;

    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    hoverTimeoutRef.current = setTimeout(() => {
      preload();
    }, preloadDelay);
  }, [preload, preloadOnHover, hasPreloaded, preloadDelay]);

  // Mouse leave handler
  const onMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
  }, []);

  // Focus handler for keyboard navigation
  const onFocus = useCallback(() => {
    if (!hasPreloaded) {
      preload();
    }
  }, [preload, hasPreloaded]);

  // Set up intersection observer for viewport strategy
  useEffect(() => {
    if (strategy !== LoadingStrategy.ON_VIEWPORT || !ref.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry) return;
        
        setIsVisible(entry.isIntersecting);
        
        if (entry.isIntersecting) {
          setShouldLoad(true);
          preload();
        }
      },
      {
        threshold,
        rootMargin
      }
    );

    observer.observe(ref.current);
    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [strategy, threshold, rootMargin, preload]);

  // Handle interaction-based loading
  useEffect(() => {
    if (strategy !== LoadingStrategy.ON_INTERACTION || !ref.current) return;

    const element = ref.current;
    
    const handleInteraction = () => {
      setShouldLoad(true);
      preload();
    };

    // Add event listeners for various interactions
    element.addEventListener('click', handleInteraction);
    element.addEventListener('touchstart', handleInteraction);
    element.addEventListener('keydown', handleInteraction);

    return () => {
      element.removeEventListener('click', handleInteraction);
      element.removeEventListener('touchstart', handleInteraction);
      element.removeEventListener('keydown', handleInteraction);
    };
  }, [strategy, preload]);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  return {
    ref,
    shouldLoad,
    isVisible,
    preload,
    onMouseEnter,
    onMouseLeave,
    onFocus
  };
}

// Hook for preloading based on route changes
export function useRoutePreloading() {
  const preloadedRoutes = useRef(new Set<string>());

  const preloadRoute = useCallback(async (route: string, preloadFn: () => Promise<unknown>) => {
    if (preloadedRoutes.current.has(route)) return;

    try {
      await preloadFn();
      preloadedRoutes.current.add(route);
    } catch (error) {
      console.warn(`Failed to preload route ${route}:`, error);
    }
  }, []);

  return { preloadRoute };
}

// Hook for managing component visibility
export function useComponentVisibility(threshold = 0.1) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry) {
          setIsVisible(entry.isIntersecting);
        }
      },
      { threshold }
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible };
}