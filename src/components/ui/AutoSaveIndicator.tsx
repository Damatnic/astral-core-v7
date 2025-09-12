'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircleIcon, CloudArrowUpIcon, ExclamationTriangleIcon } from '@heroicons/react/20/solid';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface AutoSaveIndicatorProps {
  status: SaveStatus;
  lastSaved?: Date;
  errorMessage?: string;
  className?: string;
}

export const AutoSaveIndicator: React.FC<AutoSaveIndicatorProps> = ({
  status,
  lastSaved,
  errorMessage,
  className = ''
}) => {
  const [displayTime, setDisplayTime] = useState<string>('');

  useEffect(() => {
    if (!lastSaved) return;

    const updateTime = () => {
      const now = new Date();
      const diff = Math.floor((now.getTime() - lastSaved.getTime()) / 1000);

      if (diff < 5) {
        setDisplayTime('Just now');
      } else if (diff < 60) {
        setDisplayTime(`${diff} seconds ago`);
      } else if (diff < 3600) {
        const minutes = Math.floor(diff / 60);
        setDisplayTime(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`);
      } else {
        const hours = Math.floor(diff / 3600);
        setDisplayTime(`${hours} ${hours === 1 ? 'hour' : 'hours'} ago`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [lastSaved]);

  const getStatusContent = () => {
    switch (status) {
      case 'saving':
        return (
          <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
            <CloudArrowUpIcon className="h-5 w-5 animate-pulse" aria-hidden="true" />
            <span className="text-sm font-medium">Saving...</span>
          </div>
        );
      
      case 'saved':
        return (
          <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
            <CheckCircleIcon className="h-5 w-5" aria-hidden="true" />
            <span className="text-sm">
              Saved {displayTime || 'just now'}
            </span>
          </div>
        );
      
      case 'error':
        return (
          <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
            <ExclamationTriangleIcon className="h-5 w-5" aria-hidden="true" />
            <span className="text-sm">
              {errorMessage || 'Failed to save'}
            </span>
          </div>
        );
      
      default:
        return null;
    }
  };

  if (status === 'idle') return null;

  return (
    <div 
      className={`inline-flex items-center ${className}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={`Save status: ${status === 'saving' ? 'Saving changes' : status === 'saved' ? `Saved ${displayTime}` : 'Save failed'}`}
    >
      {getStatusContent()}
    </div>
  );
};

// Hook for managing auto-save state
export const useAutoSave = (
  saveFunction: () => Promise<void>,
  dependencies: any[],
  debounceMs: number = 1000
) => {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | undefined>();
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  useEffect(() => {
    if (dependencies.every(dep => !dep)) return; // Don't save if all deps are empty

    const timeoutId = setTimeout(async () => {
      setSaveStatus('saving');
      setErrorMessage(undefined);
      
      try {
        await saveFunction();
        setSaveStatus('saved');
        setLastSaved(new Date());
      } catch (error) {
        setSaveStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'Failed to save');
        console.error('Auto-save error:', error);
      }
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, dependencies); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    saveStatus,
    lastSaved,
    errorMessage,
    resetStatus: () => setSaveStatus('idle')
  };
};

export default AutoSaveIndicator;