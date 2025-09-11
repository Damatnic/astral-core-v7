/**
 * Intersection Observer-based Lazy Loading
 * Advanced lazy loading that only loads components when they come into viewport
 */

'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import LoadingFallback from '@/components/ui/LoadingFallback';
import { ErrorBoundary } from '@/components/ErrorBoundary';

interface IntersectionLazyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  rootMargin?: string;
  threshold?: number;
  triggerOnce?: boolean;
  className?: string;
  minHeight?: string;
  loadingMessage?: string;
}

/**
 * Component that only renders its children when they intersect with the viewport
 */
export const IntersectionLazy: React.FC<IntersectionLazyProps> = ({
  children,
  fallback,
  rootMargin = '50px',
  threshold = 0.1,
  triggerOnce = true,
  className = '',
  minHeight = 'min-h-[300px]',
  loadingMessage = 'Loading content...'
}) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        const isVisible = entry.isIntersecting;
        setIsIntersecting(isVisible);
        
        if (isVisible && triggerOnce) {
          setHasIntersected(true);
        }
      },
      {
        rootMargin,
        threshold
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [rootMargin, threshold, triggerOnce]);

  const shouldRender = triggerOnce ? hasIntersected || isIntersecting : isIntersecting;

  const defaultFallback = (
    <LoadingFallback
      variant='skeleton'
      size='lg'
      message={loadingMessage}
      className={minHeight}
    />
  );

  return (
    <div ref={elementRef} className={className}>
      {shouldRender ? (
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      ) : (
        fallback || defaultFallback
      )}
    </div>
  );
};

/**
 * Higher-order component that wraps a component with intersection-based lazy loading
 */
export const withIntersectionLoading = <P extends object>(
  Component: React.ComponentType<P>,
  options: {
    loadingMessage?: string;
    minHeight?: string;
    rootMargin?: string;
    threshold?: number;
  } = {}
) => {
  const IntersectionLazyComponent = (props: P) => (
    <IntersectionLazy
      {...(options.loadingMessage && { loadingMessage: options.loadingMessage })}
      {...(options.minHeight && { minHeight: options.minHeight })}
      {...(options.rootMargin && { rootMargin: options.rootMargin })}
      {...(options.threshold && { threshold: options.threshold })}
    >
      <Suspense
        fallback={
          <LoadingFallback
            variant='skeleton'
            size='lg'
            message={options.loadingMessage || 'Loading...'}
            className={options.minHeight || 'min-h-[300px]'}
          />
        }
      >
        <Component {...props} />
      </Suspense>
    </IntersectionLazy>
  );

  IntersectionLazyComponent.displayName = `IntersectionLazy(${
    Component.displayName || Component.name || 'Component'
  })`;

  return IntersectionLazyComponent;
};

/**
 * Hook for programmatic intersection detection
 */
export const useIntersectionObserver = (
  options: {
    rootMargin?: string;
    threshold?: number;
    triggerOnce?: boolean;
  } = {}
) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        const isVisible = entry.isIntersecting;
        setIsIntersecting(isVisible);
        
        if (isVisible && options.triggerOnce) {
          setHasIntersected(true);
        }
      },
      {
        rootMargin: options.rootMargin || '50px',
        threshold: options.threshold || 0.1
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [options.rootMargin, options.threshold, options.triggerOnce]);

  const shouldLoad = options.triggerOnce ? hasIntersected || isIntersecting : isIntersecting;

  return { elementRef, isIntersecting, hasIntersected, shouldLoad };
};