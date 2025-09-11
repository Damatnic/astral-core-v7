
import React from 'react';
import { useEffect, useState } from 'react';

export function useMobileOptimization() {
  const [isMobile, setIsMobile] = useState(false);
  const [touchDevice, setTouchDevice] = useState(false);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      setTouchDevice('ontouchstart' in window);
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
    };
  }, []);

  return { isMobile, touchDevice, orientation };
}

interface MobileOptimizedButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'crisis';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function MobileOptimizedButton({ 
  children, 
  onClick, 
  variant = 'primary',
  size = 'md',
  className = '' 
}: MobileOptimizedButtonProps) {
  const { isMobile } = useMobileOptimization();
  
  const baseClasses = 'font-semibold rounded-lg transition-all duration-200 touch-manipulation';
  const sizeClasses = {
    sm: isMobile ? 'px-4 py-3 text-sm min-h-[48px]' : 'px-3 py-2 text-sm min-h-[44px]',
    md: isMobile ? 'px-6 py-4 text-base min-h-[52px]' : 'px-4 py-2 text-base min-h-[44px]',
    lg: isMobile ? 'px-8 py-5 text-lg min-h-[56px]' : 'px-6 py-3 text-lg min-h-[48px]'
  };
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 active:bg-gray-400',
    crisis: 'bg-orange-600 text-white hover:bg-orange-700 active:bg-orange-800 shadow-lg'
  };

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      style={{
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none'
      }}
    >
      {children}
    </button>
  );
}

export default { useMobileOptimization, MobileOptimizedButton };