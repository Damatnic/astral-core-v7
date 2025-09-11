
import React, { useState, useEffect } from 'react';
import { PhoneIcon } from '@heroicons/react/24/solid';
import { useMobileOptimization } from '@/hooks/useResponsiveBreakpoints';

export function MobileCrisisButton() {
  const { isMobile } = useMobileOptimization();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Show button when scrolling up, hide when scrolling down (unless at top)
      if (currentScrollY < lastScrollY || currentScrollY < 100) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const handleCrisisCall = () => {
    // Announce to screen readers
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'assertive');
    announcement.className = 'sr-only';
    announcement.textContent = 'Initiating crisis support call. Help is on the way.';
    document.body.appendChild(announcement);
    
    setTimeout(() => document.body.removeChild(announcement), 2000);
    
    // Initiate call
    window.location.href = 'tel:988';
  };

  if (!isMobile) return null;

  return (
    <button
      onClick={handleCrisisCall}
      className={`fixed bottom-6 right-6 z-50 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white p-4 rounded-full shadow-lg transition-all duration-300 ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-16 opacity-0'
      }`}
      style={{
        minWidth: '56px',
        minHeight: '56px',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation'
      }}
      aria-label="Emergency crisis support - Call 988 Suicide & Crisis Lifeline"
      title="Tap for immediate crisis support"
    >
      <PhoneIcon className="w-6 h-6" />
      
      {/* Subtle pulse animation to draw attention */}
      <div className="absolute inset-0 bg-orange-600 rounded-full animate-ping opacity-20"></div>
      
      {/* Screen reader helper text */}
      <span className="sr-only">
        Crisis support button. Tap to call 988 Suicide & Crisis Lifeline immediately.
      </span>
    </button>
  );
}

export default MobileCrisisButton;