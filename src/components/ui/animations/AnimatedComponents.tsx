'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAnimation } from './AnimationProvider';

// Breathing Exercise Animation Component
interface BreathingCircleProps {
  isActive: boolean;
  inhaleSeconds?: number;
  exhaleSeconds?: number;
  className?: string;
}

export function BreathingCircle({ 
  isActive, 
  inhaleSeconds = 4, 
  exhaleSeconds = 6,
  className = '' 
}: BreathingCircleProps) {
  const { shouldAnimate, getAnimationDuration } = useAnimation();
  const [phase, setPhase] = useState<'inhale' | 'exhale' | 'pause'>('pause');
  const [scale, setScale] = useState(1);
  
  useEffect(() => {
    if (!isActive || !shouldAnimate()) return;
    
    let timeoutId: NodeJS.Timeout;
    
    const cycle = () => {
      // Inhale phase
      setPhase('inhale');
      setScale(1.3);
      
      timeoutId = setTimeout(() => {
        // Exhale phase
        setPhase('exhale');
        setScale(1);
        
        timeoutId = setTimeout(() => {
          cycle(); // Continue the cycle
        }, getAnimationDuration(exhaleSeconds * 1000));
      }, getAnimationDuration(inhaleSeconds * 1000));
    };
    
    cycle();
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isActive, inhaleSeconds, exhaleSeconds, shouldAnimate, getAnimationDuration]);
  
  const phaseText = {
    inhale: 'Breathe In',
    exhale: 'Breathe Out',
    pause: 'Press to Begin'
  };
  
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div
        className={`
          w-32 h-32 rounded-full 
          bg-gradient-to-br from-blue-400 to-purple-500
          flex items-center justify-center
          transition-transform duration-1000 ease-in-out
          ${shouldAnimate() ? '' : 'transition-none'}
        `}
        style={{
          transform: shouldAnimate() ? `scale(${scale})` : 'scale(1)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div className="w-24 h-24 rounded-full bg-white bg-opacity-30 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-white bg-opacity-50" />
        </div>
      </div>
      
      <p className="mt-4 text-lg font-medium text-center">
        {phaseText[phase]}
      </p>
      
      {isActive && (
        <div className="mt-2 flex space-x-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={`
                w-2 h-2 rounded-full
                ${phase === 'inhale' ? 'bg-blue-500' : 'bg-purple-500'}
                transition-opacity duration-500
                ${shouldAnimate() ? `animate-pulse` : ''}
              `}
              style={{
                animationDelay: `${i * 0.2}s`,
                opacity: shouldAnimate() ? 1 : 0.5
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Progress Ring for Goals/Wellness Tracking
interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  children?: React.ReactNode;
  className?: string;
}

export function ProgressRing({ 
  progress, 
  size = 120, 
  strokeWidth = 8,
  color = 'rgb(34, 197, 94)', // Green
  backgroundColor = 'rgb(229, 231, 235)', // Gray
  children,
  className = ''
}: ProgressRingProps) {
  const { shouldAnimate, getAnimationDuration } = useAnimation();
  const [animatedProgress, setAnimatedProgress] = useState(0);
  
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (animatedProgress / 100) * circumference;
  
  useEffect(() => {
    if (!shouldAnimate()) {
      setAnimatedProgress(progress);
      return;
    }
    
    const duration = getAnimationDuration(1000);
    const steps = 60;
    const stepValue = progress / steps;
    const stepDuration = duration / steps;
    
    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      setAnimatedProgress(Math.min(stepValue * currentStep, progress));
      
      if (currentStep >= steps) {
        clearInterval(timer);
      }
    }, stepDuration);
    
    return () => clearInterval(timer);
  }, [progress, shouldAnimate, getAnimationDuration]);
  
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={shouldAnimate() ? 'transition-all duration-1000 ease-out' : ''}
        />
      </svg>
      
      {/* Content in center */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children || (
          <span className="text-xl font-semibold">
            {Math.round(animatedProgress)}%
          </span>
        )}
      </div>
    </div>
  );
}

// Gentle Loading Dots for Mental Health Context
interface CalmLoadingDotsProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

export function CalmLoadingDots({ 
  size = 'md', 
  color = 'rgb(74, 144, 226)',
  className = ''
}: CalmLoadingDotsProps) {
  const { shouldAnimate } = useAnimation();
  
  const sizeMap = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };
  
  const dotClass = sizeMap[size];
  
  if (!shouldAnimate()) {
    return (
      <div className={`flex space-x-2 ${className}`}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`${dotClass} rounded-full opacity-60`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
    );
  }
  
  return (
    <div className={`flex space-x-2 ${className}`}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`${dotClass} rounded-full animate-pulse`}
          style={{ 
            backgroundColor: color,
            animationDelay: `${i * 0.3}s`,
            animationDuration: '1.5s'
          }}
        />
      ))}
    </div>
  );
}

// Mood Selector with Gentle Animations
interface MoodSelectorProps {
  moods: { emoji: string; label: string; value: number }[];
  selectedMood?: number;
  onMoodSelect: (mood: number) => void;
  className?: string;
}

export function MoodSelector({ 
  moods, 
  selectedMood, 
  onMoodSelect,
  className = ''
}: MoodSelectorProps) {
  const { shouldAnimate } = useAnimation();
  const [hoveredMood, setHoveredMood] = useState<number | null>(null);
  
  return (
    <div className={`flex justify-center space-x-4 ${className}`}>
      {moods.map((mood, index) => (
        <button
          key={mood.value}
          onClick={() => onMoodSelect(mood.value)}
          onMouseEnter={() => setHoveredMood(index)}
          onMouseLeave={() => setHoveredMood(null)}
          className={`
            relative flex flex-col items-center p-3 rounded-lg
            transition-all duration-300 ease-out
            hover:bg-gray-50 dark:hover:bg-gray-800
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            ${selectedMood === mood.value ? 'bg-blue-50 dark:bg-blue-900' : ''}
            ${shouldAnimate() ? '' : 'transition-none'}
          `}
          style={{
            transform: shouldAnimate() && (hoveredMood === index || selectedMood === mood.value) 
              ? 'scale(1.1)' 
              : 'scale(1)'
          }}
          aria-label={`Select mood: ${mood.label}`}
        >
          <span className="text-3xl mb-1">{mood.emoji}</span>
          <span className="text-xs font-medium text-center">{mood.label}</span>
          
          {selectedMood === mood.value && (
            <div 
              className={`
                absolute -bottom-1 left-1/2 transform -translate-x-1/2
                w-2 h-2 rounded-full bg-blue-500
                ${shouldAnimate() ? 'animate-pulse' : ''}
              `}
            />
          )}
        </button>
      ))}
    </div>
  );
}

// Floating Action Button with Gentle Pulse
interface FloatingActionButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  variant?: 'primary' | 'emergency' | 'wellness';
  className?: string;
}

export function FloatingActionButton({ 
  onClick, 
  icon, 
  label,
  variant = 'primary',
  className = ''
}: FloatingActionButtonProps) {
  const { shouldAnimate } = useAnimation();
  const [isPressed, setIsPressed] = useState(false);
  
  const variantClasses = {
    primary: 'bg-blue-500 hover:bg-blue-600 text-white',
    emergency: 'bg-orange-500 hover:bg-orange-600 text-white',
    wellness: 'bg-green-500 hover:bg-green-600 text-white'
  };
  
  return (
    <button
      onClick={onClick}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      className={`
        fixed bottom-6 right-6 w-14 h-14
        rounded-full shadow-lg
        flex items-center justify-center
        transition-all duration-300 ease-out
        focus:outline-none focus:ring-4 focus:ring-opacity-50
        ${variantClasses[variant]}
        ${shouldAnimate() ? 'hover:scale-110' : ''}
        ${isPressed && shouldAnimate() ? 'scale-95' : ''}
        ${shouldAnimate() ? 'animate-pulse' : ''}
        ${className}
      `}
      style={{
        animationDuration: '3s',
        transform: isPressed && shouldAnimate() ? 'scale(0.95)' : 
                  shouldAnimate() ? 'scale(1)' : 'scale(1)'
      }}
      aria-label={label}
      title={label}
    >
      {icon}
    </button>
  );
}

// Gentle Card Reveal Animation
interface RevealCardProps {
  children: React.ReactNode;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  className?: string;
}

export function RevealCard({ 
  children, 
  delay = 0, 
  direction = 'up',
  className = ''
}: RevealCardProps) {
  const { shouldAnimate, getAnimationDuration } = useAnimation();
  const [isVisible, setIsVisible] = useState(!shouldAnimate());
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!shouldAnimate()) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            setIsVisible(true);
          }, getAnimationDuration(delay));
        }
      },
      { threshold: 0.1 }
    );
    
    if (ref.current) {
      observer.observe(ref.current);
    }
    
    return () => observer.disconnect();
  }, [shouldAnimate, delay, getAnimationDuration]);
  
  const directionClasses = {
    up: isVisible ? 'translate-y-0' : 'translate-y-4',
    down: isVisible ? 'translate-y-0' : '-translate-y-4',
    left: isVisible ? 'translate-x-0' : 'translate-x-4',
    right: isVisible ? 'translate-x-0' : '-translate-x-4'
  };
  
  return (
    <div
      ref={ref}
      className={`
        transition-all duration-700 ease-out
        ${isVisible ? 'opacity-100' : 'opacity-0'}
        ${directionClasses[direction]}
        ${shouldAnimate() ? '' : 'transition-none opacity-100 transform-none'}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

// Success Celebration Animation
interface SuccessCelebrationProps {
  isVisible: boolean;
  message: string;
  onComplete?: () => void;
}

export function SuccessCelebration({ 
  isVisible, 
  message, 
  onComplete 
}: SuccessCelebrationProps) {
  const { shouldAnimate } = useAnimation();
  
  useEffect(() => {
    if (isVisible && onComplete) {
      const timer = setTimeout(onComplete, shouldAnimate() ? 3000 : 1000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete, shouldAnimate]);
  
  if (!isVisible) return null;
  
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
      <div 
        className={`
          bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 mx-4
          transform transition-all duration-500 ease-out
          ${isVisible ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}
          ${shouldAnimate() ? '' : 'transition-none'}
        `}
      >
        <div className="text-center">
          <div 
            className={`
              text-6xl mb-4
              ${shouldAnimate() ? 'animate-bounce' : ''}
            `}
          >
            🎉
          </div>
          <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}