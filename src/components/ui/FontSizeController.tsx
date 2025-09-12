'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  MinusIcon, 
  PlusIcon,
  ArrowUturnLeftIcon
} from '@heroicons/react/24/outline';

interface FontSizeControllerProps {
  minSize?: number;
  maxSize?: number;
  step?: number;
  defaultSize?: number;
  persistPreference?: boolean;
  className?: string;
  position?: 'floating' | 'inline';
  onSizeChange?: (size: number) => void;
}

type FontSize = 'small' | 'medium' | 'large' | 'x-large';

const FONT_SIZE_SCALE = {
  small: 0.875,    // 14px base
  medium: 1,       // 16px base
  large: 1.125,    // 18px base
  'x-large': 1.25  // 20px base
};

export const FontSizeController: React.FC<FontSizeControllerProps> = ({
  minSize = 12,
  maxSize = 24,
  step = 1,
  defaultSize = 16,
  persistPreference = true,
  className = '',
  position = 'floating',
  onSizeChange
}) => {
  const [currentSize, setCurrentSize] = useState(defaultSize);
  const [isExpanded, setIsExpanded] = useState(false);

  // Load saved preference
  useEffect(() => {
    if (persistPreference && typeof window !== 'undefined') {
      const saved = localStorage.getItem('fontSize');
      if (saved) {
        const size = parseFloat(saved);
        if (size >= minSize && size <= maxSize) {
          setCurrentSize(size);
        }
      }
    }
  }, [minSize, maxSize, persistPreference]);

  // Apply font size changes
  const applyFontSize = useCallback((size: number) => {
    const root = document.documentElement;
    const scale = size / 16; // 16px is the base
    
    // Update CSS custom properties
    root.style.setProperty('--font-size-scale', scale.toString());
    root.style.setProperty('--font-size-base', `${size}px`);
    
    // Apply to common text elements
    const style = document.getElementById('font-size-overrides');
    if (style) {
      style.remove();
    }
    
    const newStyle = document.createElement('style');
    newStyle.id = 'font-size-overrides';
    newStyle.textContent = `
      :root {
        --font-size-scale: ${scale};
        --font-size-base: ${size}px;
      }
      
      .font-size-responsive {
        font-size: calc(var(--font-size-base, 16px) * var(--font-size-scale, 1)) !important;
      }
      
      .font-size-responsive.text-xs {
        font-size: calc(var(--font-size-base, 16px) * 0.75 * var(--font-size-scale, 1)) !important;
      }
      
      .font-size-responsive.text-sm {
        font-size: calc(var(--font-size-base, 16px) * 0.875 * var(--font-size-scale, 1)) !important;
      }
      
      .font-size-responsive.text-lg {
        font-size: calc(var(--font-size-base, 16px) * 1.125 * var(--font-size-scale, 1)) !important;
      }
      
      .font-size-responsive.text-xl {
        font-size: calc(var(--font-size-base, 16px) * 1.25 * var(--font-size-scale, 1)) !important;
      }
      
      .font-size-responsive.text-2xl {
        font-size: calc(var(--font-size-base, 16px) * 1.5 * var(--font-size-scale, 1)) !important;
      }
      
      /* Apply to body text by default */
      body.font-size-enabled {
        font-size: var(--font-size-base, 16px) !important;
      }
      
      body.font-size-enabled p,
      body.font-size-enabled div,
      body.font-size-enabled span,
      body.font-size-enabled li {
        font-size: inherit;
      }
      
      body.font-size-enabled h1 { font-size: calc(var(--font-size-base, 16px) * 2 * var(--font-size-scale, 1)) !important; }
      body.font-size-enabled h2 { font-size: calc(var(--font-size-base, 16px) * 1.75 * var(--font-size-scale, 1)) !important; }
      body.font-size-enabled h3 { font-size: calc(var(--font-size-base, 16px) * 1.5 * var(--font-size-scale, 1)) !important; }
      body.font-size-enabled h4 { font-size: calc(var(--font-size-base, 16px) * 1.25 * var(--font-size-scale, 1)) !important; }
      body.font-size-enabled h5 { font-size: calc(var(--font-size-base, 16px) * 1.125 * var(--font-size-scale, 1)) !important; }
      body.font-size-enabled h6 { font-size: calc(var(--font-size-base, 16px) * 1 * var(--font-size-scale, 1)) !important; }
      
      body.font-size-enabled small { font-size: calc(var(--font-size-base, 16px) * 0.875 * var(--font-size-scale, 1)) !important; }
      body.font-size-enabled .text-xs { font-size: calc(var(--font-size-base, 16px) * 0.75 * var(--font-size-scale, 1)) !important; }
      body.font-size-enabled .text-sm { font-size: calc(var(--font-size-base, 16px) * 0.875 * var(--font-size-scale, 1)) !important; }
    `;
    
    document.head.appendChild(newStyle);
    
    // Enable font size scaling on body
    document.body.classList.add('font-size-enabled');
  }, []);

  // Handle size change
  const handleSizeChange = useCallback((newSize: number) => {
    const clampedSize = Math.max(minSize, Math.min(maxSize, newSize));
    setCurrentSize(clampedSize);
    applyFontSize(clampedSize);
    
    // Save preference
    if (persistPreference && typeof window !== 'undefined') {
      localStorage.setItem('fontSize', clampedSize.toString());
    }
    
    // Notify parent
    onSizeChange?.(clampedSize);
    
    // Announce to screen readers
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.className = 'sr-only';
    announcement.textContent = `Font size changed to ${clampedSize} pixels`;
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      if (document.body.contains(announcement)) {
        document.body.removeChild(announcement);
      }
    }, 1000);
  }, [minSize, maxSize, applyFontSize, persistPreference, onSizeChange]);

  // Apply current size on mount
  useEffect(() => {
    applyFontSize(currentSize);
  }, [applyFontSize, currentSize]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Plus/Equals: Increase font size
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        handleSizeChange(currentSize + step);
      }
      
      // Ctrl/Cmd + Minus: Decrease font size
      if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        handleSizeChange(currentSize - step);
      }
      
      // Ctrl/Cmd + 0: Reset font size
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        handleSizeChange(defaultSize);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentSize, step, defaultSize, handleSizeChange]);

  const canDecrease = currentSize > minSize;
  const canIncrease = currentSize < maxSize;
  const isDefault = currentSize === defaultSize;

  if (position === 'floating') {
    return (
      <div className={`fixed bottom-4 left-4 z-50 ${className}`}>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          {/* Toggle Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-t-lg"
            aria-expanded={isExpanded}
            aria-label="Font size controls"
          >
            <span className="text-sm font-medium">Font Size</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
              {currentSize}px
            </span>
          </button>

          {/* Controls */}
          {isExpanded && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => handleSizeChange(currentSize - step)}
                  disabled={!canDecrease}
                  className="p-2 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Decrease font size"
                  title="Decrease font size (Ctrl+-)"
                >
                  <MinusIcon className="h-4 w-4" />
                </button>

                <div className="flex-1 text-center">
                  <span className="text-sm font-medium">{currentSize}px</span>
                </div>

                <button
                  onClick={() => handleSizeChange(currentSize + step)}
                  disabled={!canIncrease}
                  className="p-2 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Increase font size"
                  title="Increase font size (Ctrl++)"
                >
                  <PlusIcon className="h-4 w-4" />
                </button>
              </div>

              {/* Slider */}
              <input
                type="range"
                min={minSize}
                max={maxSize}
                step={step}
                value={currentSize}
                onChange={(e) => handleSizeChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer mb-3"
                aria-label="Font size slider"
              />

              {/* Preset Sizes */}
              <div className="grid grid-cols-2 gap-1 mb-3">
                {Object.entries(FONT_SIZE_SCALE).map(([name, scale]) => {
                  const size = Math.round(16 * scale);
                  return (
                    <button
                      key={name}
                      onClick={() => handleSizeChange(size)}
                      className={`
                        px-2 py-1 text-xs rounded-md border transition-colors
                        ${currentSize === size
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }
                      `}
                    >
                      {name} ({size}px)
                    </button>
                  );
                })}
              </div>

              {/* Reset Button */}
              {!isDefault && (
                <button
                  onClick={() => handleSizeChange(defaultSize)}
                  className="w-full px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors flex items-center justify-center gap-1"
                  title="Reset to default (Ctrl+0)"
                >
                  <ArrowUturnLeftIcon className="h-4 w-4" />
                  Reset to Default
                </button>
              )}

              {/* Help Text */}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                Use Ctrl/Cmd + +/- to adjust
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Inline controls
  return (
    <div className={`font-size-controller-inline ${className}`}>
      <fieldset className="flex items-center gap-3">
        <legend className="sr-only">Font size controls</legend>
        
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Font Size:
        </span>
        
        <button
          onClick={() => handleSizeChange(currentSize - step)}
          disabled={!canDecrease}
          className="p-1 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Decrease font size"
        >
          <MinusIcon className="h-4 w-4" />
        </button>
        
        <span className="min-w-[3rem] text-center text-sm font-medium">
          {currentSize}px
        </span>
        
        <button
          onClick={() => handleSizeChange(currentSize + step)}
          disabled={!canIncrease}
          className="p-1 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Increase font size"
        >
          <PlusIcon className="h-4 w-4" />
        </button>
        
        {!isDefault && (
          <button
            onClick={() => handleSizeChange(defaultSize)}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            aria-label="Reset font size"
          >
            Reset
          </button>
        )}
      </fieldset>
    </div>
  );
};

export default FontSizeController;