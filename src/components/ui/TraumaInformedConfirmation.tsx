
import React, { useState, useCallback } from 'react';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface TraumaInformedConfirmationProps {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'gentle' | 'important' | 'crisis';
}

export function TraumaInformedConfirmation({
  title,
  message,
  confirmText = "I understand and want to continue",
  cancelText = "Not right now",
  onConfirm,
  onCancel,
  variant = 'gentle'
}: TraumaInformedConfirmationProps) {
  const [hasReadMessage, setHasReadMessage] = useState(false);
  const [userConfirmedUnderstanding, setUserConfirmedUnderstanding] = useState(false);

  const variantStyles = {
    gentle: {
      container: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
      title: 'text-blue-900 dark:text-blue-100',
      message: 'text-blue-800 dark:text-blue-200',
      confirm: 'bg-blue-600 hover:bg-blue-700 text-white',
      cancel: 'bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200'
    },
    important: {
      container: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
      title: 'text-amber-900 dark:text-amber-100',
      message: 'text-amber-800 dark:text-amber-200',
      confirm: 'bg-amber-600 hover:bg-amber-700 text-white',
      cancel: 'bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200'
    },
    crisis: {
      container: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
      title: 'text-orange-900 dark:text-orange-100',
      message: 'text-orange-800 dark:text-orange-200',
      confirm: 'bg-orange-600 hover:bg-orange-700 text-white',
      cancel: 'bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200'
    }
  };

  const styles = variantStyles[variant];

  const handleMessageRead = useCallback(() => {
    if (!hasReadMessage) {
      setTimeout(() => setHasReadMessage(true), 2000); // Ensure minimum read time
    }
  }, [hasReadMessage]);

  const handleConfirm = useCallback(() => {
    if (hasReadMessage && userConfirmedUnderstanding) {
      onConfirm();
    }
  }, [hasReadMessage, userConfirmedUnderstanding, onConfirm]);

  return (
    <div className={`max-w-md mx-auto p-6 rounded-lg border-2 ${styles.container}`}>
      <div className="space-y-4">
        {/* Title */}
        <h3 className={`text-lg font-semibold ${styles.title}`}>
          {title}
        </h3>

        {/* Message with reading indication */}
        <div 
          className={`text-sm ${styles.message} leading-relaxed`}
          onFocus={handleMessageRead}
          onMouseEnter={handleMessageRead}
        >
          {message}
        </div>

        {/* Understanding confirmation */}
        <div className="flex items-start gap-2 py-2">
          <input
            type="checkbox"
            id="understanding-confirmation"
            checked={userConfirmedUnderstanding}
            onChange={(e) => setUserConfirmedUnderstanding(e.target.checked)}
            className="mt-0.5 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            disabled={!hasReadMessage}
          />
          <label 
            htmlFor="understanding-confirmation"
            className={`text-sm cursor-pointer ${styles.message} ${!hasReadMessage ? 'opacity-50' : ''}`}
          >
            I have read and understood this message
          </label>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleConfirm}
            disabled={!hasReadMessage || !userConfirmedUnderstanding}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${styles.confirm}`}
          >
            <CheckIcon className="inline h-4 w-4 mr-1" />
            {confirmText}
          </button>
          
          <button
            onClick={onCancel}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${styles.cancel}`}
          >
            <XMarkIcon className="inline h-4 w-4 mr-1" />
            {cancelText}
          </button>
        </div>

        {/* Supportive messaging */}
        <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
          Take your time. You're in control of your experience.
        </p>
      </div>
    </div>
  );
}

export default TraumaInformedConfirmation;