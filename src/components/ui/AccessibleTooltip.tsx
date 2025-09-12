'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  delay?: number;
  className?: string;
  triggerOnFocus?: boolean;
  triggerOnHover?: boolean;
  triggerOnClick?: boolean;
  interactive?: boolean;
  id?: string;
  maxWidth?: number;
}

export const AccessibleTooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'auto',
  delay = 200,
  className = '',
  triggerOnFocus = true,
  triggerOnHover = true,
  triggerOnClick = false,
  interactive = false,
  id,
  maxWidth = 250
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [actualPosition, setActualPosition] = useState(position);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const tooltipId = id || `tooltip-${Math.random().toString(36).substr(2, 9)}`;

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const spacing = 8;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = 0;
    let left = 0;
    let finalPosition = position;

    if (position === 'auto') {
      // Determine best position based on available space
      const spaceAbove = triggerRect.top;
      const spaceBelow = viewportHeight - triggerRect.bottom;
      const spaceLeft = triggerRect.left;
      const spaceRight = viewportWidth - triggerRect.right;

      if (spaceAbove > tooltipRect.height + spacing) {
        finalPosition = 'top';
      } else if (spaceBelow > tooltipRect.height + spacing) {
        finalPosition = 'bottom';
      } else if (spaceLeft > tooltipRect.width + spacing) {
        finalPosition = 'left';
      } else if (spaceRight > tooltipRect.width + spacing) {
        finalPosition = 'right';
      } else {
        finalPosition = 'top'; // Fallback
      }
    }

    switch (finalPosition) {
      case 'top':
        top = triggerRect.top - tooltipRect.height - spacing;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        top = triggerRect.bottom + spacing;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.left - tooltipRect.width - spacing;
        break;
      case 'right':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.right + spacing;
        break;
    }

    // Adjust for viewport boundaries
    if (left < spacing) left = spacing;
    if (left + tooltipRect.width > viewportWidth - spacing) {
      left = viewportWidth - tooltipRect.width - spacing;
    }
    if (top < spacing) top = spacing;
    if (top + tooltipRect.height > viewportHeight - spacing) {
      top = viewportHeight - tooltipRect.height - spacing;
    }

    setActualPosition(finalPosition);
    setTooltipStyle({
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      zIndex: 9999,
      maxWidth: `${maxWidth}px`
    });
  }, [position, maxWidth]);

  const showTooltip = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    if (delay > 0) {
      timeoutRef.current = setTimeout(() => {
        setIsVisible(true);
      }, delay);
    } else {
      setIsVisible(true);
    }
  }, [delay]);

  const hideTooltip = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    if (!interactive) {
      setIsVisible(false);
    } else {
      // For interactive tooltips, add a small delay to allow moving to the tooltip
      timeoutRef.current = setTimeout(() => {
        setIsVisible(false);
      }, 100);
    }
  }, [interactive]);

  // Calculate position when tooltip becomes visible
  useEffect(() => {
    if (isVisible) {
      calculatePosition();
      window.addEventListener('resize', calculatePosition);
      window.addEventListener('scroll', calculatePosition);
      
      return () => {
        window.removeEventListener('resize', calculatePosition);
        window.removeEventListener('scroll', calculatePosition);
      };
    }
  }, [isVisible, calculatePosition]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && isVisible) {
      setIsVisible(false);
      triggerRef.current?.focus();
    }
  };

  const handleMouseEnter = () => {
    if (triggerOnHover) {
      showTooltip();
    }
  };

  const handleMouseLeave = () => {
    if (triggerOnHover) {
      hideTooltip();
    }
  };

  const handleFocus = () => {
    if (triggerOnFocus) {
      showTooltip();
    }
  };

  const handleBlur = (e: React.FocusEvent) => {
    if (triggerOnFocus) {
      // Check if focus is moving to the tooltip itself (for interactive tooltips)
      if (interactive && tooltipRef.current?.contains(e.relatedTarget as Node)) {
        return;
      }
      hideTooltip();
    }
  };

  const handleClick = () => {
    if (triggerOnClick) {
      setIsVisible(!isVisible);
    }
  };

  const tooltipContent = isVisible && (
    <div
      ref={tooltipRef}
      id={tooltipId}
      role="tooltip"
      className={`
        px-3 py-2 text-sm rounded-lg shadow-lg
        bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900
        animate-fade-in pointer-events-none
        ${interactive ? 'pointer-events-auto' : ''}
        ${className}
      `}
      style={tooltipStyle}
      onMouseEnter={interactive ? () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      } : undefined}
      onMouseLeave={interactive ? hideTooltip : undefined}
      onKeyDown={handleKeyDown}
      tabIndex={interactive ? 0 : undefined}
    >
      {content}
      
      {/* Arrow pointer */}
      <div
        className={`
          absolute w-2 h-2 bg-gray-900 dark:bg-gray-100 transform rotate-45
          ${actualPosition === 'top' ? 'bottom-[-4px] left-1/2 -translate-x-1/2' : ''}
          ${actualPosition === 'bottom' ? 'top-[-4px] left-1/2 -translate-x-1/2' : ''}
          ${actualPosition === 'left' ? 'right-[-4px] top-1/2 -translate-y-1/2' : ''}
          ${actualPosition === 'right' ? 'left-[-4px] top-1/2 -translate-y-1/2' : ''}
        `}
        aria-hidden="true"
      />
    </div>
  );

  return (
    <>
      <div
        ref={triggerRef}
        className="inline-block"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-describedby={isVisible ? tooltipId : undefined}
      >
        {children}
      </div>
      
      {typeof document !== 'undefined' && 
        createPortal(tooltipContent, document.body)
      }
    </>
  );
};

// Compound component for tooltip trigger with proper ARIA
interface TooltipTriggerProps {
  children: React.ReactNode;
  label?: string;
  className?: string;
  asChild?: boolean;
}

export const TooltipTrigger: React.FC<TooltipTriggerProps> = ({
  children,
  label,
  className = '',
  asChild = false
}) => {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      'aria-label': label || (children as any).props['aria-label'],
      className: `${(children as any).props.className || ''} ${className}`.trim(),
      tabIndex: (children as any).props.tabIndex ?? 0
    });
  }

  return (
    <button
      type="button"
      className={`
        inline-flex items-center justify-center
        p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800
        focus:outline-none focus:ring-2 focus:ring-blue-500
        transition-colors
        ${className}
      `}
      aria-label={label}
      tabIndex={0}
    >
      {children}
    </button>
  );
};

// Information icon button with tooltip
interface InfoTooltipProps {
  content: React.ReactNode;
  className?: string;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({
  content,
  className = ''
}) => {
  return (
    <AccessibleTooltip content={content} triggerOnClick={false}>
      <TooltipTrigger label="More information" className={className}>
        <svg
          className="w-4 h-4 text-gray-400 dark:text-gray-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </TooltipTrigger>
    </AccessibleTooltip>
  );
};

export default AccessibleTooltip;