'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircleIcon, ArrowRightIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component: React.ReactNode;
  validation?: () => boolean | Promise<boolean>;
  required?: boolean;
}

interface OnboardingProgressProps {
  steps: OnboardingStep[];
  onComplete: (data: Record<string, any>) => void;
  onSkip?: () => void;
  saveKey?: string;
  autoSave?: boolean;
  autoSaveInterval?: number;
  allowSkip?: boolean;
  className?: string;
}

interface ProgressState {
  currentStep: number;
  completedSteps: Set<string>;
  stepData: Record<string, any>;
  lastSaved: Date | null;
}

const STORAGE_PREFIX = 'onboarding_progress_';

export const OnboardingProgress: React.FC<OnboardingProgressProps> = ({
  steps,
  onComplete,
  onSkip,
  saveKey = 'default',
  autoSave = true,
  autoSaveInterval = 5000,
  allowSkip = false,
  className = ''
}) => {
  const [progress, setProgress] = useState<ProgressState>(() => {
    // Load saved progress from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`${STORAGE_PREFIX}${saveKey}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return {
            ...parsed,
            completedSteps: new Set(parsed.completedSteps),
            lastSaved: parsed.lastSaved ? new Date(parsed.lastSaved) : null
          };
        } catch (e) {
          console.error('Failed to parse saved progress:', e);
        }
      }
    }
    
    return {
      currentStep: 0,
      completedSteps: new Set<string>(),
      stepData: {},
      lastSaved: null
    };
  });

  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveIndicator, setShowSaveIndicator] = useState(false);

  const currentStepData = steps[progress.currentStep];
  const progressPercentage = ((progress.completedSteps.size / steps.length) * 100).toFixed(0);

  // Save progress to localStorage
  const saveProgress = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    setIsSaving(true);
    setShowSaveIndicator(true);
    
    const toSave = {
      ...progress,
      completedSteps: Array.from(progress.completedSteps),
      lastSaved: new Date()
    };
    
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${saveKey}`, JSON.stringify(toSave));
      setProgress(prev => ({ ...prev, lastSaved: new Date() }));
      
      // Show save indicator briefly
      setTimeout(() => {
        setIsSaving(false);
        setTimeout(() => setShowSaveIndicator(false), 1000);
      }, 500);
    } catch (e) {
      console.error('Failed to save progress:', e);
      setIsSaving(false);
    }
  }, [progress, saveKey]);

  // Auto-save progress
  useEffect(() => {
    if (autoSave) {
      const interval = setInterval(saveProgress, autoSaveInterval);
      return () => clearInterval(interval);
    }
  }, [autoSave, autoSaveInterval, saveProgress]);

  // Save on step change
  useEffect(() => {
    if (progress.completedSteps.size > 0) {
      saveProgress();
    }
  }, [progress.currentStep]);

  // Clear saved progress
  const clearProgress = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`${STORAGE_PREFIX}${saveKey}`);
    }
    
    setProgress({
      currentStep: 0,
      completedSteps: new Set(),
      stepData: {},
      lastSaved: null
    });
  }, [saveKey]);

  // Validate and move to next step
  const handleNext = useCallback(async () => {
    const step = steps[progress.currentStep];
    
    if (step.validation) {
      setIsValidating(true);
      setValidationError(null);
      
      try {
        const isValid = await step.validation();
        
        if (!isValid) {
          setValidationError('Please complete all required fields before continuing.');
          setIsValidating(false);
          return;
        }
      } catch (error) {
        setValidationError('Validation failed. Please check your input.');
        setIsValidating(false);
        return;
      }
    }
    
    setIsValidating(false);
    setValidationError(null);
    
    // Mark current step as completed
    setProgress(prev => ({
      ...prev,
      completedSteps: new Set(prev.completedSteps).add(step.id),
      currentStep: Math.min(prev.currentStep + 1, steps.length - 1)
    }));
    
    // Check if all steps are completed
    if (progress.currentStep === steps.length - 1) {
      handleComplete();
    }
  }, [progress.currentStep, steps]);

  // Go to previous step
  const handlePrevious = useCallback(() => {
    setProgress(prev => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 0)
    }));
    setValidationError(null);
  }, []);

  // Jump to specific step
  const goToStep = useCallback((index: number) => {
    // Only allow jumping to completed steps or the next uncompleted step
    const canJump = index <= progress.completedSteps.size;
    
    if (canJump) {
      setProgress(prev => ({
        ...prev,
        currentStep: index
      }));
      setValidationError(null);
    }
  }, [progress.completedSteps]);

  // Complete onboarding
  const handleComplete = useCallback(() => {
    // Mark final step as completed
    const finalStep = steps[steps.length - 1];
    setProgress(prev => ({
      ...prev,
      completedSteps: new Set(prev.completedSteps).add(finalStep.id)
    }));
    
    // Clear saved progress
    clearProgress();
    
    // Call completion handler
    onComplete(progress.stepData);
  }, [steps, progress.stepData, onComplete, clearProgress]);

  // Skip onboarding
  const handleSkip = useCallback(() => {
    clearProgress();
    onSkip?.();
  }, [clearProgress, onSkip]);

  // Update step data
  const updateStepData = useCallback((key: string, value: any) => {
    setProgress(prev => ({
      ...prev,
      stepData: {
        ...prev.stepData,
        [key]: value
      }
    }));
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && progress.currentStep < steps.length - 1) {
        handleNext();
      } else if (e.key === 'ArrowLeft' && progress.currentStep > 0) {
        handlePrevious();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [progress.currentStep, steps.length, handleNext, handlePrevious]);

  return (
    <div className={`onboarding-progress ${className}`}>
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Getting Started
          </h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {progressPercentage}% Complete
          </span>
        </div>
        
        <div className="relative">
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-300 ease-out"
              style={{ width: `${progressPercentage}%` }}
              role="progressbar"
              aria-valuenow={parseInt(progressPercentage)}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          
          {/* Step indicators */}
          <div className="absolute top-0 left-0 w-full h-full flex items-center justify-between px-1">
            {steps.map((step, index) => {
              const isCompleted = progress.completedSteps.has(step.id);
              const isCurrent = index === progress.currentStep;
              
              return (
                <button
                  key={step.id}
                  onClick={() => goToStep(index)}
                  disabled={index > progress.completedSteps.size}
                  className={`
                    w-6 h-6 rounded-full -mt-2 transition-all
                    ${isCompleted 
                      ? 'bg-green-500 hover:bg-green-600' 
                      : isCurrent
                      ? 'bg-blue-500 ring-4 ring-blue-200 dark:ring-blue-800'
                      : 'bg-gray-300 dark:bg-gray-600'
                    }
                    ${index <= progress.completedSteps.size 
                      ? 'cursor-pointer' 
                      : 'cursor-not-allowed opacity-50'
                    }
                  `}
                  aria-label={`Step ${index + 1}: ${step.title}`}
                  title={step.title}
                >
                  {isCompleted && (
                    <CheckCircleIcon className="h-4 w-4 text-white mx-auto" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Current Step */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Step {progress.currentStep + 1}: {currentStepData.title}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {currentStepData.description}
        </p>
        
        {/* Step Content */}
        <div className="min-h-[300px]">
          {React.cloneElement(currentStepData.component as React.ReactElement, {
            onDataChange: updateStepData,
            data: progress.stepData
          })}
        </div>
        
        {/* Validation Error */}
        {validationError && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-400 dark:border-red-600 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-400">{validationError}</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrevious}
          disabled={progress.currentStep === 0}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg
            ${progress.currentStep === 0
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }
            transition-colors
          `}
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Previous
        </button>

        <div className="flex items-center gap-4">
          {/* Save Indicator */}
          {showSaveIndicator && (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              {isSaving ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-4 w-4 text-green-500" />
                  Saved
                </>
              )}
            </div>
          )}

          {/* Skip button */}
          {allowSkip && (
            <button
              onClick={handleSkip}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Skip for now
            </button>
          )}

          {/* Next/Complete button */}
          <button
            onClick={progress.currentStep === steps.length - 1 ? handleComplete : handleNext}
            disabled={isValidating}
            className={`
              flex items-center gap-2 px-6 py-2 rounded-lg
              bg-blue-500 text-white hover:bg-blue-600
              focus:outline-none focus:ring-2 focus:ring-blue-500
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors
            `}
          >
            {isValidating ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Validating...
              </>
            ) : progress.currentStep === steps.length - 1 ? (
              'Complete'
            ) : (
              <>
                Next
                <ArrowRightIcon className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Last saved time */}
      {progress.lastSaved && (
        <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
          Last saved: {progress.lastSaved.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};

export default OnboardingProgress;