'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, TrashIcon, HeartIcon, BookmarkIcon } from '@heroicons/react/24/outline';

interface SwipeAction {
  label: string;
  icon?: React.ReactNode;
  color: string;
  action: () => void;
}

interface SwipeableCardProps {
  children: React.ReactNode;
  leftAction?: SwipeAction;
  rightAction?: SwipeAction;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  swipeThreshold?: number;
  className?: string;
  disabled?: boolean;
}

export const SwipeableCard: React.FC<SwipeableCardProps> = ({
  children,
  leftAction,
  rightAction,
  onSwipeLeft,
  onSwipeRight,
  swipeThreshold = 100,
  className = '',
  disabled = false
}) => {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [swipeDistance, setSwipeDistance] = useState(0);
  const [isSwipingLeft, setIsSwipingLeft] = useState(false);
  const [isSwipingRight, setIsSwipingRight] = useState(false);
  const [swipeVelocity, setSwipeVelocity] = useState(0);
  
  const cardRef = useRef<HTMLDivElement>(null);
  const touchStartTime = useRef<number>(0);

  const minSwipeDistance = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    touchStartTime.current = Date.now();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart || disabled) return;
    
    const currentTouch = e.targetTouches[0].clientX;
    const distance = currentTouch - touchStart;
    
    setSwipeDistance(distance);
    setTouchEnd(currentTouch);
    
    // Determine swipe direction
    if (Math.abs(distance) > minSwipeDistance) {
      setIsSwipingLeft(distance < 0);
      setIsSwipingRight(distance > 0);
    }
    
    // Calculate velocity
    const timeDiff = Date.now() - touchStartTime.current;
    if (timeDiff > 0) {
      setSwipeVelocity(Math.abs(distance) / timeDiff);
    }
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd || disabled) return;
    
    const distance = touchEnd - touchStart;
    const isLeftSwipe = distance < -minSwipeDistance;
    const isRightSwipe = distance > minSwipeDistance;
    
    // Check if swipe exceeds threshold or has high velocity
    const shouldTriggerAction = Math.abs(distance) > swipeThreshold || swipeVelocity > 0.5;
    
    if (shouldTriggerAction) {
      if (isLeftSwipe && (leftAction || onSwipeLeft)) {
        handleSwipeLeft();
      } else if (isRightSwipe && (rightAction || onSwipeRight)) {
        handleSwipeRight();
      } else {
        resetSwipe();
      }
    } else {
      resetSwipe();
    }
  };

  const handleSwipeLeft = () => {
    if (cardRef.current) {
      cardRef.current.style.transform = `translateX(-100%)`;
      cardRef.current.style.opacity = '0';
      
      setTimeout(() => {
        leftAction?.action();
        onSwipeLeft?.();
        resetSwipe();
      }, 300);
    }
  };

  const handleSwipeRight = () => {
    if (cardRef.current) {
      cardRef.current.style.transform = `translateX(100%)`;
      cardRef.current.style.opacity = '0';
      
      setTimeout(() => {
        rightAction?.action();
        onSwipeRight?.();
        resetSwipe();
      }, 300);
    }
  };

  const resetSwipe = () => {
    setSwipeDistance(0);
    setIsSwipingLeft(false);
    setIsSwipingRight(false);
    setTouchStart(null);
    setTouchEnd(null);
    setSwipeVelocity(0);
    
    if (cardRef.current) {
      cardRef.current.style.transform = '';
      cardRef.current.style.opacity = '';
    }
  };

  // Mouse support for desktop testing
  const [mouseStart, setMouseStart] = useState<number | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    setMouseStart(e.clientX);
    touchStartTime.current = Date.now();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!mouseStart || disabled) return;
    
    const distance = e.clientX - mouseStart;
    setSwipeDistance(distance);
    
    if (Math.abs(distance) > minSwipeDistance) {
      setIsSwipingLeft(distance < 0);
      setIsSwipingRight(distance > 0);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!mouseStart || disabled) return;
    
    const distance = e.clientX - mouseStart;
    
    if (Math.abs(distance) > swipeThreshold) {
      if (distance < 0 && (leftAction || onSwipeLeft)) {
        handleSwipeLeft();
      } else if (distance > 0 && (rightAction || onSwipeRight)) {
        handleSwipeRight();
      } else {
        resetSwipe();
      }
    } else {
      resetSwipe();
    }
    
    setMouseStart(null);
  };

  const getSwipeProgress = () => {
    return Math.min(Math.abs(swipeDistance) / swipeThreshold, 1);
  };

  return (
    <div className="relative overflow-hidden">
      {/* Background action indicators */}
      {isSwipingRight && rightAction && (
        <div 
          className={`absolute inset-0 flex items-center justify-start p-4 ${rightAction.color}`}
          style={{ opacity: getSwipeProgress() }}
        >
          {rightAction.icon}
          <span className="ml-2 font-medium">{rightAction.label}</span>
        </div>
      )}
      
      {isSwipingLeft && leftAction && (
        <div 
          className={`absolute inset-0 flex items-center justify-end p-4 ${leftAction.color}`}
          style={{ opacity: getSwipeProgress() }}
        >
          <span className="mr-2 font-medium">{leftAction.label}</span>
          {leftAction.icon}
        </div>
      )}

      {/* Swipeable content */}
      <div
        ref={cardRef}
        className={`relative bg-white dark:bg-gray-800 transition-transform duration-300 ${className}`}
        style={{
          transform: swipeDistance ? `translateX(${swipeDistance}px)` : '',
          opacity: 1 - (getSwipeProgress() * 0.3)
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={resetSwipe}
        role="article"
        aria-label="Swipeable card"
      >
        {children}
      </div>

      {/* Visual swipe hints */}
      {!disabled && (leftAction || rightAction) && swipeDistance === 0 && (
        <div className="absolute inset-x-0 bottom-2 flex justify-center pointer-events-none">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            {rightAction && (
              <>
                <ChevronRightIcon className="h-3 w-3" />
                <span>Swipe right to {rightAction.label.toLowerCase()}</span>
              </>
            )}
            {leftAction && rightAction && <span>•</span>}
            {leftAction && (
              <>
                <span>Swipe left to {leftAction.label.toLowerCase()}</span>
                <ChevronLeftIcon className="h-3 w-3" />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Swipeable List Component
interface SwipeableListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  onDelete?: (item: T, index: number) => void;
  onFavorite?: (item: T, index: number) => void;
  onArchive?: (item: T, index: number) => void;
  keyExtractor: (item: T) => string;
  className?: string;
}

export function SwipeableList<T>({
  items,
  renderItem,
  onDelete,
  onFavorite,
  onArchive,
  keyExtractor,
  className = ''
}: SwipeableListProps<T>) {
  const [deletedItems, setDeletedItems] = useState<Set<string>>(new Set());

  const handleDelete = (item: T, index: number) => {
    const key = keyExtractor(item);
    setDeletedItems(prev => new Set(prev).add(key));
    
    setTimeout(() => {
      onDelete?.(item, index);
    }, 300);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {items.map((item, index) => {
        const key = keyExtractor(item);
        const isDeleted = deletedItems.has(key);
        
        if (isDeleted) return null;
        
        return (
          <SwipeableCard
            key={key}
            leftAction={
              onDelete ? {
                label: 'Delete',
                icon: <TrashIcon className="h-5 w-5" />,
                color: 'bg-red-500 text-white',
                action: () => handleDelete(item, index)
              } : undefined
            }
            rightAction={
              onFavorite ? {
                label: 'Favorite',
                icon: <HeartIcon className="h-5 w-5" />,
                color: 'bg-pink-500 text-white',
                action: () => onFavorite(item, index)
              } : onArchive ? {
                label: 'Archive',
                icon: <BookmarkIcon className="h-5 w-5" />,
                color: 'bg-blue-500 text-white',
                action: () => onArchive(item, index)
              } : undefined
            }
          >
            {renderItem(item, index)}
          </SwipeableCard>
        );
      })}
    </div>
  );
}

// Carousel with swipe navigation
interface SwipeableCarouselProps {
  items: React.ReactNode[];
  showIndicators?: boolean;
  autoPlay?: boolean;
  autoPlayInterval?: number;
  className?: string;
}

export const SwipeableCarousel: React.FC<SwipeableCarouselProps> = ({
  items,
  showIndicators = true,
  autoPlay = false,
  autoPlayInterval = 5000,
  className = ''
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const goToNext = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % items.length);
  }, [items.length]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + items.length) % items.length);
  }, [items.length]);

  // Auto-play
  useEffect(() => {
    if (autoPlay && items.length > 1) {
      const interval = setInterval(goToNext, autoPlayInterval);
      return () => clearInterval(interval);
    }
  }, [autoPlay, autoPlayInterval, goToNext, items.length]);

  return (
    <div className={`relative ${className}`}>
      <SwipeableCard
        onSwipeLeft={goToNext}
        onSwipeRight={goToPrevious}
        className="overflow-hidden"
      >
        <div 
          className="flex transition-transform duration-300 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {items.map((item, index) => (
            <div key={index} className="w-full flex-shrink-0">
              {item}
            </div>
          ))}
        </div>
      </SwipeableCard>

      {/* Indicators */}
      {showIndicators && items.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {items.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`
                w-2 h-2 rounded-full transition-all
                ${index === currentIndex 
                  ? 'w-8 bg-blue-500' 
                  : 'bg-gray-300 dark:bg-gray-600'
                }
              `}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Navigation buttons for desktop */}
      <button
        onClick={goToPrevious}
        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/20 hover:bg-black/30 transition-colors hidden md:block"
        aria-label="Previous slide"
      >
        <ChevronLeftIcon className="h-5 w-5 text-white" />
      </button>
      <button
        onClick={goToNext}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/20 hover:bg-black/30 transition-colors hidden md:block"
        aria-label="Next slide"
      >
        <ChevronRightIcon className="h-5 w-5 text-white" />
      </button>
    </div>
  );
};

export default SwipeableCard;