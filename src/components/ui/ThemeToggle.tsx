'use client';

import React, { useState } from 'react';
import { useTheme, Theme } from '@/providers/ThemeProvider';
import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';
import { SunIcon as SunIconSolid, MoonIcon as MoonIconSolid } from '@heroicons/react/24/solid';

interface ThemeToggleProps {
  variant?: 'icon' | 'button' | 'dropdown';
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
  className?: string;
}

const themeIcons = {
  light: { outline: SunIcon, solid: SunIconSolid },
  dark: { outline: MoonIcon, solid: MoonIconSolid },
  system: { outline: ComputerDesktopIcon, solid: ComputerDesktopIcon },
};

const themeLabels = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
};

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

const buttonSizeClasses = {
  sm: 'p-1.5',
  md: 'p-2',
  lg: 'p-2.5',
};

export function ThemeToggle({
  variant = 'icon',
  size = 'md',
  showLabels = false,
  className = '',
}: ThemeToggleProps) {
  const { theme, setTheme, toggleTheme, resolvedTheme } = useTheme();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const iconSize = sizeClasses[size];
  const buttonSize = buttonSizeClasses[size];

  // Simple icon toggle (light <-> dark, ignores system)
  if (variant === 'icon') {
    const CurrentIcon = resolvedTheme === 'dark' 
      ? themeIcons.light.outline 
      : themeIcons.dark.outline;

    return (
      <button
        onClick={toggleTheme}
        className={`
          ${buttonSize}
          rounded-md
          border border-gray-300 dark:border-gray-600
          bg-white dark:bg-gray-800
          text-gray-700 dark:text-gray-300
          hover:bg-gray-50 dark:hover:bg-gray-700
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          transition-all duration-200
          ${className}
        `}
        aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
        title={`Currently in ${resolvedTheme} mode. Click to toggle.`}
      >
        <CurrentIcon className={iconSize} aria-hidden="true" />
      </button>
    );
  }

  // Button with label
  if (variant === 'button') {
    const CurrentIcon = themeIcons[resolvedTheme].outline;

    return (
      <button
        onClick={toggleTheme}
        className={`
          inline-flex items-center gap-2
          ${buttonSize}
          px-3
          rounded-md
          border border-gray-300 dark:border-gray-600
          bg-white dark:bg-gray-800
          text-sm font-medium
          text-gray-700 dark:text-gray-300
          hover:bg-gray-50 dark:hover:bg-gray-700
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          transition-all duration-200
          ${className}
        `}
        aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
      >
        <CurrentIcon className={iconSize} aria-hidden="true" />
        {showLabels && (
          <span>{themeLabels[resolvedTheme]} Mode</span>
        )}
      </button>
    );
  }

  // Dropdown with all options
  if (variant === 'dropdown') {
    const CurrentIcon = themeIcons[theme].outline;

    return (
      <div className="relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={`
            inline-flex items-center gap-2
            ${buttonSize}
            px-3
            rounded-md
            border border-gray-300 dark:border-gray-600
            bg-white dark:bg-gray-800
            text-sm font-medium
            text-gray-700 dark:text-gray-300
            hover:bg-gray-50 dark:hover:bg-gray-700
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            transition-all duration-200
            ${className}
          `}
          aria-label="Theme options"
          aria-expanded={isDropdownOpen}
          aria-haspopup="true"
        >
          <CurrentIcon className={iconSize} aria-hidden="true" />
          {showLabels && (
            <span>{themeLabels[theme]}</span>
          )}
          <svg
            className={`h-4 w-4 transition-transform duration-200 ${
              isDropdownOpen ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {isDropdownOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsDropdownOpen(false)}
              aria-hidden="true"
            />
            
            {/* Dropdown */}
            <div
              className="
                absolute right-0 z-20 mt-2 w-48
                origin-top-right rounded-md
                bg-white dark:bg-gray-800
                shadow-lg ring-1 ring-black ring-opacity-5
                focus:outline-none
              "
              role="menu"
              aria-orientation="vertical"
            >
              <div className="py-1" role="none">
                {(['light', 'dark', 'system'] as Theme[]).map((themeOption) => {
                  const Icon = themeIcons[themeOption].outline;
                  const isSelected = theme === themeOption;

                  return (
                    <button
                      key={themeOption}
                      onClick={() => {
                        setTheme(themeOption);
                        setIsDropdownOpen(false);
                      }}
                      className={`
                        w-full flex items-center gap-3 px-4 py-2 text-sm
                        text-left
                        ${
                          isSelected
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }
                      `}
                      role="menuitem"
                      aria-current={isSelected ? 'true' : 'false'}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      <span className="flex-1">{themeLabels[themeOption]}</span>
                      {isSelected && (
                        <svg
                          className="h-4 w-4"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                          aria-hidden="true"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return null;
}

// Hook for components that need to respond to theme changes
export function useThemeClasses() {
  const { resolvedTheme } = useTheme();
  
  return {
    isDark: resolvedTheme === 'dark',
    theme: resolvedTheme,
    bg: resolvedTheme === 'dark' ? 'bg-gray-900' : 'bg-white',
    text: resolvedTheme === 'dark' ? 'text-gray-100' : 'text-gray-900',
    border: resolvedTheme === 'dark' ? 'border-gray-700' : 'border-gray-300',
    hover: resolvedTheme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-50',
  };
}