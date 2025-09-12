'use client';

import React from 'react';
import { CheckIcon } from '@heroicons/react/20/solid';

export interface Step {
  id: string;
  name: string;
  description?: string;
  status: 'complete' | 'current' | 'upcoming';
}

interface StepProgressIndicatorProps {
  steps: Step[];
  orientation?: 'horizontal' | 'vertical';
  showDescription?: boolean;
  className?: string;
}

export const StepProgressIndicator: React.FC<StepProgressIndicatorProps> = ({
  steps,
  orientation = 'horizontal',
  showDescription = true,
  className = ''
}) => {
  const currentStepIndex = steps.findIndex(step => step.status === 'current');
  const progressPercentage = ((currentStepIndex + 1) / steps.length) * 100;

  if (orientation === 'vertical') {
    return (
      <nav aria-label="Progress" className={className}>
        <ol role="list" className="overflow-hidden">
          {steps.map((step, stepIdx) => (
            <li key={step.id} className={stepIdx !== steps.length - 1 ? 'pb-10 relative' : ''}>
              {stepIdx !== steps.length - 1 && (
                <div 
                  className={`absolute left-4 top-4 -ml-px mt-0.5 h-full w-0.5 ${
                    step.status === 'complete' ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                  aria-hidden="true"
                />
              )}
              
              <div className="relative flex items-start group">
                <span className="flex h-9 items-center">
                  <span
                    className={`
                      relative z-10 flex h-8 w-8 items-center justify-center rounded-full
                      ${step.status === 'complete' 
                        ? 'bg-blue-600 group-hover:bg-blue-800' 
                        : step.status === 'current'
                        ? 'border-2 border-blue-600 bg-white dark:bg-gray-800'
                        : 'border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 group-hover:border-gray-400'
                      }
                      transition-colors duration-200
                    `}
                  >
                    {step.status === 'complete' ? (
                      <CheckIcon className="h-5 w-5 text-white" aria-hidden="true" />
                    ) : step.status === 'current' ? (
                      <span className="h-2.5 w-2.5 rounded-full bg-blue-600" aria-hidden="true" />
                    ) : (
                      <span className="h-2.5 w-2.5 rounded-full bg-transparent" aria-hidden="true" />
                    )}
                  </span>
                </span>
                
                <span className="ml-4 min-w-0 flex flex-col">
                  <span 
                    className={`
                      text-sm font-medium
                      ${step.status === 'complete' 
                        ? 'text-blue-600' 
                        : step.status === 'current'
                        ? 'text-blue-600'
                        : 'text-gray-500 dark:text-gray-400'
                      }
                    `}
                  >
                    {step.name}
                  </span>
                  {showDescription && step.description && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {step.description}
                    </span>
                  )}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </nav>
    );
  }

  // Horizontal layout
  return (
    <nav aria-label="Progress" className={className}>
      <ol role="list" className="flex items-center">
        {steps.map((step, stepIdx) => (
          <li key={step.id} className={stepIdx !== steps.length - 1 ? 'flex-1 relative' : ''}>
            <div className="flex items-center">
              <span
                className={`
                  relative z-10 flex h-8 w-8 items-center justify-center rounded-full
                  ${step.status === 'complete' 
                    ? 'bg-blue-600' 
                    : step.status === 'current'
                    ? 'border-2 border-blue-600 bg-white dark:bg-gray-800'
                    : 'border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                  }
                  transition-colors duration-200
                `}
                aria-current={step.status === 'current' ? 'step' : undefined}
                aria-label={`Step ${stepIdx + 1}: ${step.name} - ${step.status}`}
              >
                {step.status === 'complete' ? (
                  <CheckIcon className="h-5 w-5 text-white" aria-hidden="true" />
                ) : (
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {stepIdx + 1}
                  </span>
                )}
              </span>
              
              {stepIdx !== steps.length - 1 && (
                <div 
                  className="absolute top-4 left-8 -ml-px h-0.5 w-full bg-gray-300 dark:bg-gray-600"
                  aria-hidden="true"
                >
                  <div 
                    className={`h-0.5 bg-blue-600 transition-all duration-300`}
                    style={{ width: step.status === 'complete' ? '100%' : '0%' }}
                  />
                </div>
              )}
            </div>
            
            <div className="mt-2">
              <span 
                className={`
                  text-xs font-medium
                  ${step.status === 'current' 
                    ? 'text-blue-600' 
                    : step.status === 'complete'
                    ? 'text-gray-900 dark:text-gray-100'
                    : 'text-gray-500 dark:text-gray-400'
                  }
                `}
              >
                {step.name}
              </span>
            </div>
          </li>
        ))}
      </ol>
      
      {/* Progress bar */}
      <div className="mt-4">
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-600 transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
            role="progressbar"
            aria-valuenow={progressPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Progress: ${Math.round(progressPercentage)}% complete`}
          />
        </div>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 text-center">
          Step {currentStepIndex + 1} of {steps.length}
        </p>
      </div>
    </nav>
  );
};

// Crisis-specific progress indicator with timeout warning
export const CrisisProgressIndicator: React.FC<{
  steps: Step[];
  timeoutSeconds?: number;
  onTimeout?: () => void;
}> = ({ steps, timeoutSeconds = 300, onTimeout }) => {
  const [timeRemaining, setTimeRemaining] = React.useState(timeoutSeconds);
  const [showWarning, setShowWarning] = React.useState(false);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onTimeout?.();
          return 0;
        }
        
        // Show warning at 2 minutes and 30 seconds
        if (prev === 120 || prev === 30) {
          setShowWarning(true);
          setTimeout(() => setShowWarning(false), 5000);
        }
        
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeoutSeconds, onTimeout]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      <StepProgressIndicator steps={steps} />
      
      {/* Timeout warning */}
      <div 
        className={`
          flex items-center justify-between p-3 rounded-lg
          ${timeRemaining <= 30 
            ? 'bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-600' 
            : timeRemaining <= 120
            ? 'bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-400 dark:border-yellow-600'
            : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
          }
          transition-colors duration-300
        `}
        role="timer"
        aria-live={showWarning ? 'assertive' : 'polite'}
        aria-atomic="true"
      >
        <span className={`
          text-sm font-medium
          ${timeRemaining <= 30 
            ? 'text-red-800 dark:text-red-400' 
            : timeRemaining <= 120
            ? 'text-yellow-800 dark:text-yellow-400'
            : 'text-blue-800 dark:text-blue-400'
          }
        `}>
          Time remaining: {formatTime(timeRemaining)}
        </span>
        
        {timeRemaining <= 120 && (
          <span className="text-xs text-gray-600 dark:text-gray-400">
            Session will timeout soon
          </span>
        )}
      </div>
    </div>
  );
};

export default StepProgressIndicator;