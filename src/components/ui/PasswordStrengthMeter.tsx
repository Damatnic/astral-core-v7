'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckCircleIcon, 
  XCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

interface PasswordRequirement {
  id: string;
  label: string;
  test: (password: string) => boolean;
  weight?: number;
}

interface PasswordStrengthMeterProps {
  password: string;
  onChange?: (password: string) => void;
  showPassword?: boolean;
  onToggleVisibility?: () => void;
  requirements?: PasswordRequirement[];
  showRequirements?: boolean;
  showSuggestions?: boolean;
  minScore?: number;
  onStrengthChange?: (score: number, isValid: boolean) => void;
  className?: string;
  label?: string;
  error?: string;
  placeholder?: string;
}

const DEFAULT_REQUIREMENTS: PasswordRequirement[] = [
  { id: 'length', label: 'At least 8 characters', test: (pwd) => pwd.length >= 8, weight: 2 },
  { id: 'uppercase', label: 'One uppercase letter', test: (pwd) => /[A-Z]/.test(pwd), weight: 1 },
  { id: 'lowercase', label: 'One lowercase letter', test: (pwd) => /[a-z]/.test(pwd), weight: 1 },
  { id: 'number', label: 'One number', test: (pwd) => /\d/.test(pwd), weight: 1 },
  { id: 'special', label: 'One special character', test: (pwd) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd), weight: 1 }
];

const COMMON_PASSWORDS = [
  'password', '123456', '123456789', 'qwerty', 'abc123', '111111', 
  'password123', 'admin', 'letmein', 'welcome', 'monkey', '1234567890'
];

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({
  password,
  onChange,
  showPassword: externalShowPassword,
  onToggleVisibility,
  requirements = DEFAULT_REQUIREMENTS,
  showRequirements = true,
  showSuggestions = true,
  minScore = 60,
  onStrengthChange,
  className = '',
  label = 'Password',
  error,
  placeholder = 'Enter your password'
}) => {
  const [internalShowPassword, setInternalShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  const showPassword = externalShowPassword !== undefined ? externalShowPassword : internalShowPassword;
  const toggleVisibility = onToggleVisibility || (() => setInternalShowPassword(!internalShowPassword));

  // Calculate password strength
  const { score, level, color, metRequirements, suggestions } = useMemo(() => {
    if (!password) {
      return { 
        score: 0, 
        level: 'None', 
        color: 'gray', 
        metRequirements: [],
        suggestions: []
      };
    }

    let score = 0;
    const metRequirements: string[] = [];
    const suggestions: string[] = [];
    const maxWeight = requirements.reduce((sum, req) => sum + (req.weight || 1), 0);

    // Check requirements
    requirements.forEach(req => {
      if (req.test(password)) {
        score += (req.weight || 1);
        metRequirements.push(req.id);
      }
    });

    // Bonus points for length
    if (password.length > 12) score += 1;
    if (password.length > 16) score += 1;
    if (password.length > 20) score += 1;

    // Penalty for common passwords
    if (COMMON_PASSWORDS.some(common => password.toLowerCase().includes(common))) {
      score = Math.max(0, score - 3);
      suggestions.push('Avoid common passwords');
    }

    // Penalty for repetitive characters
    if (/(.)\1{2,}/.test(password)) {
      score = Math.max(0, score - 1);
      suggestions.push('Avoid repetitive characters');
    }

    // Check for dictionary words (simplified)
    if (password.length > 4 && /^[a-zA-Z]+$/.test(password)) {
      suggestions.push('Consider mixing letters with numbers and symbols');
    }

    // Normalize score to percentage
    const normalizedScore = Math.min(100, Math.round((score / (maxWeight + 3)) * 100));

    // Determine strength level
    let level: string;
    let color: string;
    
    if (normalizedScore < 20) {
      level = 'Very Weak';
      color = 'red';
    } else if (normalizedScore < 40) {
      level = 'Weak';
      color = 'orange';
    } else if (normalizedScore < 60) {
      level = 'Fair';
      color = 'yellow';
    } else if (normalizedScore < 80) {
      level = 'Good';
      color = 'blue';
    } else {
      level = 'Strong';
      color = 'green';
    }

    // Generate suggestions
    requirements.forEach(req => {
      if (!req.test(password)) {
        suggestions.unshift(req.label);
      }
    });

    return { score: normalizedScore, level, color, metRequirements, suggestions };
  }, [password, requirements]);

  // Notify parent of strength changes
  useEffect(() => {
    if (onStrengthChange) {
      onStrengthChange(score, score >= minScore);
    }
  }, [score, minScore, onStrengthChange]);

  // Generate secure password
  const generatePassword = () => {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const all = uppercase + lowercase + numbers + special;
    
    let newPassword = '';
    
    // Ensure at least one of each type
    newPassword += uppercase[Math.floor(Math.random() * uppercase.length)];
    newPassword += lowercase[Math.floor(Math.random() * lowercase.length)];
    newPassword += numbers[Math.floor(Math.random() * numbers.length)];
    newPassword += special[Math.floor(Math.random() * special.length)];
    
    // Fill the rest randomly
    for (let i = 4; i < 16; i++) {
      newPassword += all[Math.floor(Math.random() * all.length)];
    }
    
    // Shuffle the password
    newPassword = newPassword.split('').sort(() => Math.random() - 0.5).join('');
    
    onChange?.(newPassword);
  };

  const getStrengthColor = () => {
    switch (color) {
      case 'red': return 'bg-red-500';
      case 'orange': return 'bg-orange-500';
      case 'yellow': return 'bg-yellow-500';
      case 'blue': return 'bg-blue-500';
      case 'green': return 'bg-green-500';
      default: return 'bg-gray-300';
    }
  };

  const getStrengthTextColor = () => {
    switch (color) {
      case 'red': return 'text-red-600 dark:text-red-400';
      case 'orange': return 'text-orange-600 dark:text-orange-400';
      case 'yellow': return 'text-yellow-600 dark:text-yellow-400';
      case 'blue': return 'text-blue-600 dark:text-blue-400';
      case 'green': return 'text-green-600 dark:text-green-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className={className}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}

      {/* Password Input */}
      <div className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => onChange?.(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className={`
            w-full px-3 py-2 pr-20
            border rounded-lg
            bg-white dark:bg-gray-900
            text-gray-900 dark:text-gray-100
            placeholder-gray-400
            transition-colors
            ${error 
              ? 'border-red-500 focus:ring-red-500' 
              : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
            }
            focus:outline-none focus:ring-2
          `}
          aria-label={label}
          aria-invalid={!!error}
          aria-describedby={error ? 'password-error' : 'password-strength'}
        />

        {/* Toggle Visibility */}
        <button
          type="button"
          onClick={toggleVisibility}
          className="absolute right-10 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? (
            <EyeSlashIcon className="h-5 w-5 text-gray-400" />
          ) : (
            <EyeIcon className="h-5 w-5 text-gray-400" />
          )}
        </button>

        {/* Generate Password */}
        <button
          type="button"
          onClick={generatePassword}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          aria-label="Generate secure password"
          title="Generate secure password"
        >
          <ShieldCheckIcon className="h-5 w-5 text-gray-400" />
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <p id="password-error" className="mt-1 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* Strength Meter */}
      {password && (
        <div id="password-strength" className="mt-3 space-y-2">
          {/* Progress Bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${getStrengthColor()}`}
                  style={{ width: `${score}%` }}
                  role="progressbar"
                  aria-valuenow={score}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Password strength"
                />
              </div>
            </div>
            <span className={`text-sm font-medium ${getStrengthTextColor()}`}>
              {level}
            </span>
          </div>

          {/* Requirements */}
          {showRequirements && (isFocused || password) && (
            <div className="space-y-1">
              {requirements.map(req => {
                const isMet = metRequirements.includes(req.id);
                return (
                  <div 
                    key={req.id}
                    className={`
                      flex items-center gap-2 text-sm
                      ${isMet ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}
                      transition-colors
                    `}
                  >
                    {isMet ? (
                      <CheckCircleIcon className="h-4 w-4" />
                    ) : (
                      <XCircleIcon className="h-4 w-4" />
                    )}
                    <span className={isMet ? 'line-through' : ''}>
                      {req.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Suggestions */}
          {showSuggestions && suggestions.length > 0 && score < 80 && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="flex items-start gap-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                    Suggestions to improve:
                  </p>
                  <ul className="text-sm text-yellow-600 dark:text-yellow-500 list-disc list-inside">
                    {suggestions.slice(0, 3).map((suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {score >= minScore && (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircleIcon className="h-4 w-4" />
              <span>Password meets security requirements</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PasswordStrengthMeter;