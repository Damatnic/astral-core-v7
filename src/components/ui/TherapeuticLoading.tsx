
import React from 'react';

interface TherapeuticLoadingProps {
  message?: string;
  type?: 'breathing' | 'gentle-pulse' | 'progress' | 'mindfulness';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function TherapeuticLoading({ 
  message = "Taking a moment...",
  type = 'breathing',
  size = 'md',
  className = '' 
}: TherapeuticLoadingProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12', 
    lg: 'w-16 h-16'
  };

  const LoadingAnimation = () => {
    switch (type) {
      case 'breathing':
        return (
          <div className={`${sizeClasses[size]} relative`}>
            <div className="absolute inset-0 bg-blue-200 dark:bg-blue-800 rounded-full animate-ping opacity-20"></div>
            <div className="absolute inset-2 bg-blue-300 dark:bg-blue-700 rounded-full animate-pulse"></div>
            <div className="absolute inset-4 bg-blue-400 dark:bg-blue-600 rounded-full"></div>
          </div>
        );
      
      case 'gentle-pulse':
        return (
          <div className={`${sizeClasses[size]} bg-gradient-to-r from-blue-400 to-blue-600 rounded-full animate-pulse`}>
            <div className="w-full h-full bg-white dark:bg-gray-900 rounded-full opacity-20 animate-ping"></div>
          </div>
        );
      
      case 'progress':
        return (
          <div className={`${sizeClasses[size]} border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin`}></div>
        );
      
      case 'mindfulness':
        return (
          <div className={`${sizeClasses[size]} relative`}>
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className={`absolute inset-0 border-2 border-blue-300 dark:border-blue-600 rounded-full animate-ping opacity-30`}
                style={{ 
                  animationDelay: `${i * 0.5}s`,
                  animationDuration: '2s'
                }}
              />
            ))}
            <div className="absolute inset-2 bg-blue-400 dark:bg-blue-600 rounded-full"></div>
          </div>
        );
      
      default:
        return null;
    }
  };

  const therapeuticMessages = {
    breathing: "Breathing deeply... taking your time",
    'gentle-pulse': "Processing gently...", 
    progress: "Moving forward at your pace",
    mindfulness: "Taking a mindful moment..."
  };

  return (
    <div className={`flex flex-col items-center justify-center p-6 ${className}`}>
      <LoadingAnimation />
      
      <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 text-center max-w-xs">
        {message || therapeuticMessages[type]}
      </p>
      
      {/* Breathing guide for anxiety reduction */}
      {type === 'breathing' && (
        <div className="mt-4 text-xs text-gray-500 dark:text-gray-500 text-center">
          <p>Breathe in slowly... and out gently</p>
          <p className="mt-1">4 seconds in, 4 seconds out</p>
        </div>
      )}
      
      {/* Supportive affirmation */}
      <div className="mt-3 text-xs text-blue-600 dark:text-blue-400 text-center font-medium">
        You're taking positive steps ✨
      </div>
    </div>
  );
}

export default TherapeuticLoading;