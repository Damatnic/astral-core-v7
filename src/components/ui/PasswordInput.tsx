'use client';

import React, { useState, forwardRef, useId } from 'react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  showStrengthIndicator?: boolean;
  helpText?: string;
}

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, error, showStrengthIndicator = false, helpText, className = '', ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const [strength, setStrength] = useState(0);
    const inputId = useId();
    const errorId = useId();
    const helpId = useId();
    
    const calculateStrength = (password: string) => {
      let score = 0;
      if (password.length >= 8) score++;
      if (password.length >= 12) score++;
      if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
      if (/\d/.test(password)) score++;
      if (/[^A-Za-z0-9]/.test(password)) score++;
      return Math.min(score, 4);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (showStrengthIndicator) {
        setStrength(calculateStrength(e.target.value));
      }
      if (props.onChange) {
        props.onChange(e);
      }
    };

    const getStrengthLabel = () => {
      switch (strength) {
        case 0: return 'Very Weak';
        case 1: return 'Weak';
        case 2: return 'Fair';
        case 3: return 'Good';
        case 4: return 'Strong';
        default: return '';
      }
    };

    const getStrengthColor = () => {
      switch (strength) {
        case 0: return 'bg-red-500';
        case 1: return 'bg-orange-500';
        case 2: return 'bg-yellow-500';
        case 3: return 'bg-blue-500';
        case 4: return 'bg-green-500';
        default: return 'bg-gray-300';
      }
    };

    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={props.id || inputId} className="block text-sm font-medium text-gray-700 dark:text-gray-200">
            {label}
            {props.required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
          </label>
        )}
        
        <div className="relative">
          <input
            ref={ref}
            id={props.id || inputId}
            type={showPassword ? 'text' : 'password'}
            className={`
              block w-full px-3 py-2 pr-10 
              border border-gray-300 dark:border-gray-600 
              rounded-md shadow-sm 
              focus:ring-blue-500 focus:border-blue-500 
              dark:bg-gray-800 dark:text-white
              ${error ? 'border-red-500' : ''}
              ${className}
            `}
            aria-invalid={!!error}
            aria-describedby={`${error ? errorId : ''} ${helpText ? helpId : ''}`}
            onChange={handleChange}
            {...props}
          />
          
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
            tabIndex={0}
          >
            {showPassword ? (
              <EyeSlashIcon className="h-5 w-5" aria-hidden="true" />
            ) : (
              <EyeIcon className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>

        {showStrengthIndicator && props.value && (
          <div className="space-y-1" role="status" aria-live="polite" aria-atomic="true">
            <div className="flex gap-1">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    i < strength ? getStrengthColor() : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                  aria-hidden="true"
                />
              ))}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Password strength: <span className="font-medium">{getStrengthLabel()}</span>
            </p>
          </div>
        )}

        {helpText && !error && (
          <p id={helpId} className="text-sm text-gray-500 dark:text-gray-400">
            {helpText}
          </p>
        )}

        {error && (
          <p id={errorId} className="text-sm text-red-600 dark:text-red-400" role="alert" aria-live="assertive">
            {error}
          </p>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';

export default PasswordInput;