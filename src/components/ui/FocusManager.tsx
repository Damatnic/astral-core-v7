'use client';

import React, { useEffect, useState, useCallback } from 'react';

interface FocusManagerProps {
  children: React.ReactNode;
  enableFocusOutlines?: boolean;
  highContrastFocus?: boolean;
  showSkipLinks?: boolean;
  className?: string;
}

interface SkipLink {
  id: string;
  label: string;
  target: string;
}

const DEFAULT_SKIP_LINKS: SkipLink[] = [
  { id: 'main', label: 'Skip to main content', target: '#main-content' },
  { id: 'nav', label: 'Skip to navigation', target: '#navigation' },
  { id: 'search', label: 'Skip to search', target: '#search' }
];

export const FocusManager: React.FC<FocusManagerProps> = ({
  children,
  enableFocusOutlines = true,
  highContrastFocus = false,
  showSkipLinks = true,
  className = ''
}) => {
  const [isKeyboardUser, setIsKeyboardUser] = useState(false);
  const [skipLinks, setSkipLinks] = useState<SkipLink[]>(DEFAULT_SKIP_LINKS);

  // Detect keyboard vs mouse usage
  useEffect(() => {
    let mouseUsed = false;
    let keyboardUsed = false;

    const handleMouseDown = () => {
      mouseUsed = true;
      if (!keyboardUsed) {
        setIsKeyboardUser(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        keyboardUsed = true;
        setIsKeyboardUser(true);
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') {
        mouseUsed = true;
        if (!keyboardUsed) {
          setIsKeyboardUser(false);
        }
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);

  // Apply focus styles
  useEffect(() => {
    const root = document.documentElement;
    
    if (enableFocusOutlines) {
      root.classList.add('focus-visible-enabled');
    } else {
      root.classList.remove('focus-visible-enabled');
    }

    if (isKeyboardUser) {
      root.classList.add('keyboard-user');
      root.classList.remove('mouse-user');
    } else {
      root.classList.add('mouse-user');
      root.classList.remove('keyboard-user');
    }

    if (highContrastFocus) {
      root.classList.add('high-contrast-focus');
    } else {
      root.classList.remove('high-contrast-focus');
    }
  }, [enableFocusOutlines, isKeyboardUser, highContrastFocus]);

  // Handle skip link navigation
  const handleSkipLink = useCallback((target: string) => {
    const element = document.querySelector(target);
    if (element) {
      // Make element focusable if not already
      if (!element.hasAttribute('tabindex')) {
        element.setAttribute('tabindex', '-1');
      }
      
      // Focus the element
      (element as HTMLElement).focus();
      
      // Scroll into view
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Inject global CSS for focus styles
  useEffect(() => {
    const styleId = 'focus-manager-styles';
    
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        /* Base focus styles - only show when keyboard navigation is used */
        .keyboard-user *:focus {
          outline: 2px solid #3b82f6 !important;
          outline-offset: 2px !important;
        }

        .mouse-user *:focus {
          outline: none !important;
        }

        /* Enhanced focus styles for better visibility */
        .focus-visible-enabled.keyboard-user *:focus {
          outline: 2px solid #3b82f6 !important;
          outline-offset: 2px !important;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1) !important;
          border-radius: 4px;
        }

        /* High contrast focus mode */
        .high-contrast-focus.keyboard-user *:focus {
          outline: 3px solid #000 !important;
          outline-offset: 3px !important;
          box-shadow: 0 0 0 6px #ffff00 !important;
        }

        @media (prefers-color-scheme: dark) {
          .high-contrast-focus.keyboard-user *:focus {
            outline: 3px solid #fff !important;
            box-shadow: 0 0 0 6px #000 !important;
          }
        }

        /* Focus styles for different element types */
        .keyboard-user button:focus,
        .keyboard-user [role="button"]:focus {
          outline: 2px solid #3b82f6 !important;
          outline-offset: 2px !important;
        }

        .keyboard-user input:focus,
        .keyboard-user textarea:focus,
        .keyboard-user select:focus {
          outline: 2px solid #3b82f6 !important;
          outline-offset: 1px !important;
          border-color: #3b82f6 !important;
        }

        .keyboard-user a:focus {
          outline: 2px solid #3b82f6 !important;
          outline-offset: 2px !important;
          text-decoration: underline !important;
        }

        /* Focus for custom components */
        .keyboard-user [tabindex]:focus {
          outline: 2px solid #3b82f6 !important;
          outline-offset: 2px !important;
        }

        /* Skip links styles */
        .skip-link {
          position: absolute !important;
          top: -40px !important;
          left: 6px !important;
          background: #000 !important;
          color: #fff !important;
          padding: 8px 16px !important;
          text-decoration: none !important;
          font-weight: bold !important;
          border-radius: 4px !important;
          z-index: 9999 !important;
          transition: top 0.2s ease-in-out !important;
        }

        .skip-link:focus {
          top: 6px !important;
          outline: 2px solid #fff !important;
          outline-offset: 2px !important;
        }

        /* Focus trap styles */
        .focus-trap-active {
          outline: 2px dashed #f59e0b !important;
          outline-offset: 4px !important;
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          .skip-link {
            transition: none !important;
          }
          
          * {
            scroll-behavior: auto !important;
          }
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

  return (
    <div className={className}>
      {/* Skip Links */}
      {showSkipLinks && (
        <nav aria-label="Skip navigation links" className="skip-navigation">
          {skipLinks.map(link => (
            <a
              key={link.id}
              href={link.target}
              className="skip-link"
              onClick={(e) => {
                e.preventDefault();
                handleSkipLink(link.target);
              }}
            >
              {link.label}
            </a>
          ))}
        </nav>
      )}

      {children}

      {/* Focus debugging info (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div 
          className="fixed bottom-2 right-2 z-50 px-2 py-1 bg-black text-white text-xs rounded opacity-50"
          aria-hidden="true"
        >
          {isKeyboardUser ? 'Keyboard' : 'Mouse'} Navigation
        </div>
      )}
    </div>
  );
};

// Hook for managing focus within components
export const useFocusManagement = () => {
  const [focusableElements, setFocusableElements] = useState<HTMLElement[]>([]);

  const getFocusableElements = useCallback((container?: HTMLElement): HTMLElement[] => {
    const selector = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(',');

    const elements = Array.from(
      (container || document).querySelectorAll<HTMLElement>(selector)
    ).filter(element => {
      // Check if element is visible
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && 
             window.getComputedStyle(element).visibility !== 'hidden';
    });

    setFocusableElements(elements);
    return elements;
  }, []);

  const focusFirst = useCallback((container?: HTMLElement) => {
    const elements = getFocusableElements(container);
    if (elements.length > 0) {
      elements[0].focus();
    }
  }, [getFocusableElements]);

  const focusLast = useCallback((container?: HTMLElement) => {
    const elements = getFocusableElements(container);
    if (elements.length > 0) {
      elements[elements.length - 1].focus();
    }
  }, [getFocusableElements]);

  const trapFocus = useCallback((container: HTMLElement) => {
    const elements = getFocusableElements(container);
    if (elements.length === 0) return () => {};

    const firstElement = elements[0];
    const lastElement = elements[elements.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    container.classList.add('focus-trap-active');

    // Focus first element
    firstElement.focus();

    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      container.classList.remove('focus-trap-active');
    };
  }, [getFocusableElements]);

  return {
    focusableElements,
    getFocusableElements,
    focusFirst,
    focusLast,
    trapFocus
  };
};

export default FocusManager;