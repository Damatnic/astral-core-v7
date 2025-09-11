
import { useEffect, useState } from 'react';

export interface BreakpointConfig {
  sm: number;
  md: number;
  lg: number;
  xl: number;
  '2xl': number;
}

const defaultBreakpoints: BreakpointConfig = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
};

export function useResponsiveBreakpoints(customBreakpoints?: Partial<BreakpointConfig>) {
  const breakpoints = { ...defaultBreakpoints, ...customBreakpoints };
  const [screenSize, setScreenSize] = useState<keyof BreakpointConfig>('md');
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setDimensions({ width, height });
      
      if (width >= breakpoints['2xl']) setScreenSize('2xl');
      else if (width >= breakpoints.xl) setScreenSize('xl');
      else if (width >= breakpoints.lg) setScreenSize('lg');
      else if (width >= breakpoints.md) setScreenSize('md');
      else setScreenSize('sm');
    };

    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);
    return () => window.removeEventListener('resize', updateScreenSize);
  }, [breakpoints]);

  return {
    screenSize,
    dimensions,
    isMobile: screenSize === 'sm',
    isTablet: screenSize === 'md',
    isDesktop: ['lg', 'xl', '2xl'].includes(screenSize),
    breakpoints
  };
}

// ResponsiveContainerProps moved to components

// ResponsiveContainer moved to components - this is a hooks file
// export function ResponsiveContainer...

export function useMobileOptimization() {
  const { isMobile, isTablet, dimensions } = useResponsiveBreakpoints();
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [touchDevice, setTouchDevice] = useState(false);

  useEffect(() => {
    const updateOrientation = () => {
      setOrientation(dimensions.height > dimensions.width ? 'portrait' : 'landscape');
      setTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };

    updateOrientation();
  }, [dimensions]);

  const getMobileOptimizedSpacing = (base: number) => {
    return isMobile ? Math.max(base * 1.2, 16) : base;
  };

  const getMobileOptimizedFontSize = (base: string) => {
    const sizeMap: Record<string, string> = {
      'text-xs': isMobile ? 'text-sm' : 'text-xs',
      'text-sm': isMobile ? 'text-base' : 'text-sm',
      'text-base': isMobile ? 'text-lg' : 'text-base',
      'text-lg': isMobile ? 'text-xl' : 'text-lg',
      'text-xl': isMobile ? 'text-2xl' : 'text-xl'
    };
    
    return sizeMap[base] || base;
  };

  return {
    isMobile,
    isTablet,
    orientation,
    touchDevice,
    getMobileOptimizedSpacing,
    getMobileOptimizedFontSize,
    dimensions
  };
}

export default { useResponsiveBreakpoints, useMobileOptimization };