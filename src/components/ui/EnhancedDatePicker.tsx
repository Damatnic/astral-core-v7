'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  CalendarIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon,
  ClockIcon 
} from '@heroicons/react/24/outline';

interface DatePickerProps {
  value?: Date | null;
  onChange: (date: Date | null) => void;
  min?: Date;
  max?: Date;
  placeholder?: string;
  showTime?: boolean;
  showShortcuts?: boolean;
  disabled?: boolean;
  className?: string;
  label?: string;
  error?: string;
  required?: boolean;
}

interface DateShortcut {
  label: string;
  getValue: () => Date;
  keyboard?: string;
}

const DATE_SHORTCUTS: DateShortcut[] = [
  { label: 'Today', getValue: () => new Date(), keyboard: 'T' },
  { label: 'Tomorrow', getValue: () => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date;
  }, keyboard: 'M' },
  { label: 'Next Week', getValue: () => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date;
  }, keyboard: 'W' },
  { label: 'Next Month', getValue: () => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    return date;
  }, keyboard: 'N' },
  { label: 'In 3 Months', getValue: () => {
    const date = new Date();
    date.setMonth(date.getMonth() + 3);
    return date;
  }},
  { label: 'Clear', getValue: () => null as any, keyboard: 'C' }
];

export const EnhancedDatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  min,
  max,
  placeholder = 'Select date',
  showTime = false,
  showShortcuts = true,
  disabled = false,
  className = '',
  label,
  error,
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value || new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(value || null);
  const [selectedTime, setSelectedTime] = useState({
    hours: value?.getHours() || 0,
    minutes: value?.getMinutes() || 0
  });
  const [focusedDate, setFocusedDate] = useState<Date | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Generate calendar days
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days: (Date | null)[] = [];
    
    // Add empty days for alignment
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const isDateDisabled = (date: Date): boolean => {
    if (!date) return true;
    if (min && date < min) return true;
    if (max && date > max) return true;
    return false;
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return '';
    
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    };
    
    if (showTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
    }
    
    return date.toLocaleString('en-US', options);
  };

  const handleDateSelect = (date: Date) => {
    if (isDateDisabled(date)) return;
    
    const newDate = new Date(date);
    if (showTime) {
      newDate.setHours(selectedTime.hours);
      newDate.setMinutes(selectedTime.minutes);
    }
    
    setSelectedDate(newDate);
    onChange(newDate);
    
    if (!showTime) {
      setIsOpen(false);
    }
  };

  const handleTimeChange = (hours: number, minutes: number) => {
    setSelectedTime({ hours, minutes });
    
    if (selectedDate) {
      const newDate = new Date(selectedDate);
      newDate.setHours(hours);
      newDate.setMinutes(minutes);
      setSelectedDate(newDate);
      onChange(newDate);
    }
  };

  const handleShortcut = (shortcut: DateShortcut) => {
    const date = shortcut.getValue();
    if (date) {
      handleDateSelect(date);
    } else {
      setSelectedDate(null);
      onChange(null);
      setIsOpen(false);
    }
  };

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    const currentFocus = focusedDate || selectedDate || new Date();
    let newFocus: Date | null = null;

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        newFocus = new Date(currentFocus);
        newFocus.setDate(currentFocus.getDate() - 1);
        break;
      case 'ArrowRight':
        e.preventDefault();
        newFocus = new Date(currentFocus);
        newFocus.setDate(currentFocus.getDate() + 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        newFocus = new Date(currentFocus);
        newFocus.setDate(currentFocus.getDate() - 7);
        break;
      case 'ArrowDown':
        e.preventDefault();
        newFocus = new Date(currentFocus);
        newFocus.setDate(currentFocus.getDate() + 7);
        break;
      case 'PageUp':
        e.preventDefault();
        if (e.shiftKey) {
          // Previous year
          setCurrentMonth(new Date(currentMonth.getFullYear() - 1, currentMonth.getMonth()));
        } else {
          // Previous month
          setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
        }
        break;
      case 'PageDown':
        e.preventDefault();
        if (e.shiftKey) {
          // Next year
          setCurrentMonth(new Date(currentMonth.getFullYear() + 1, currentMonth.getMonth()));
        } else {
          // Next month
          setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
        }
        break;
      case 'Home':
        e.preventDefault();
        // First day of month
        newFocus = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        break;
      case 'End':
        e.preventDefault();
        // Last day of month
        newFocus = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedDate && !isDateDisabled(focusedDate)) {
          handleDateSelect(focusedDate);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        inputRef.current?.focus();
        break;
      default:
        // Handle shortcut keys
        if (showShortcuts && e.key.length === 1) {
          const shortcut = DATE_SHORTCUTS.find(s => 
            s.keyboard?.toLowerCase() === e.key.toLowerCase()
          );
          if (shortcut) {
            e.preventDefault();
            handleShortcut(shortcut);
          }
        }
        break;
    }

    if (newFocus && !isDateDisabled(newFocus)) {
      setFocusedDate(newFocus);
      // Update month if needed
      if (newFocus.getMonth() !== currentMonth.getMonth() || 
          newFocus.getFullYear() !== currentMonth.getFullYear()) {
        setCurrentMonth(newFocus);
      }
    }
  }, [isOpen, focusedDate, selectedDate, currentMonth, showShortcuts]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const days = getDaysInMonth(currentMonth);
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Label */}
      {label && (
        <label 
          htmlFor="date-input"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Input */}
      <div className="relative">
        <input
          ref={inputRef}
          id="date-input"
          type="text"
          value={formatDate(selectedDate)}
          placeholder={placeholder}
          disabled={disabled}
          readOnly
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          className={`
            w-full pl-10 pr-3 py-2 
            border rounded-lg
            bg-white dark:bg-gray-900
            ${error 
              ? 'border-red-500 focus:ring-red-500' 
              : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            focus:outline-none focus:ring-2
            transition-colors
          `}
          aria-label={label || 'Date picker'}
          aria-invalid={!!error}
          aria-describedby={error ? 'date-error' : undefined}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          aria-required={required}
        />
        <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
      </div>

      {/* Error message */}
      {error && (
        <p id="date-error" className="mt-1 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* Calendar Dropdown */}
      {isOpen && !disabled && (
        <div
          ref={calendarRef}
          className="
            absolute z-50 mt-2
            bg-white dark:bg-gray-800
            border border-gray-200 dark:border-gray-700
            rounded-lg shadow-lg
            p-4
          "
          role="dialog"
          aria-label="Date picker calendar"
        >
          {/* Shortcuts */}
          {showShortcuts && (
            <div className="mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex flex-wrap gap-2">
                {DATE_SHORTCUTS.map((shortcut) => (
                  <button
                    key={shortcut.label}
                    onClick={() => handleShortcut(shortcut)}
                    className="
                      px-3 py-1 text-sm rounded-md
                      bg-gray-100 dark:bg-gray-700
                      hover:bg-gray-200 dark:hover:bg-gray-600
                      focus:outline-none focus:ring-2 focus:ring-blue-500
                      transition-colors
                    "
                    title={shortcut.keyboard ? `Keyboard: ${shortcut.keyboard}` : undefined}
                  >
                    {shortcut.label}
                    {shortcut.keyboard && (
                      <span className="ml-1 text-xs text-gray-500">({shortcut.keyboard})</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h3>
            
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              aria-label="Next month"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Week day headers */}
            {weekDays.map(day => (
              <div
                key={day}
                className="text-xs font-medium text-gray-500 dark:text-gray-400 text-center py-1"
                aria-hidden="true"
              >
                {day}
              </div>
            ))}
            
            {/* Calendar days */}
            {days.map((date, index) => {
              const isSelected = date && selectedDate && 
                date.toDateString() === selectedDate.toDateString();
              const isToday = date && date.toDateString() === new Date().toDateString();
              const isFocused = date && focusedDate && 
                date.toDateString() === focusedDate.toDateString();
              const isDisabled = date && isDateDisabled(date);
              
              return (
                <button
                  key={index}
                  onClick={() => date && handleDateSelect(date)}
                  disabled={!date || isDisabled}
                  className={`
                    p-2 text-sm rounded-md transition-colors
                    ${!date ? 'invisible' : ''}
                    ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}
                    ${isSelected ? 'bg-blue-500 text-white hover:bg-blue-600' : ''}
                    ${isToday && !isSelected ? 'font-bold text-blue-600 dark:text-blue-400' : ''}
                    ${isFocused ? 'ring-2 ring-blue-500' : ''}
                    focus:outline-none focus:ring-2 focus:ring-blue-500
                  `}
                  aria-label={date ? date.toLocaleDateString() : undefined}
                  aria-selected={isSelected}
                  aria-current={isToday ? 'date' : undefined}
                  tabIndex={date && !isDisabled ? 0 : -1}
                >
                  {date?.getDate()}
                </button>
              );
            })}
          </div>

          {/* Time Picker */}
          {showTime && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <ClockIcon className="h-5 w-5 text-gray-400" />
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={selectedTime.hours.toString().padStart(2, '0')}
                  onChange={(e) => handleTimeChange(parseInt(e.target.value) || 0, selectedTime.minutes)}
                  className="w-12 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500"
                  aria-label="Hours"
                />
                <span>:</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={selectedTime.minutes.toString().padStart(2, '0')}
                  onChange={(e) => handleTimeChange(selectedTime.hours, parseInt(e.target.value) || 0)}
                  className="w-12 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500"
                  aria-label="Minutes"
                />
              </div>
            </div>
          )}

          {/* Help text */}
          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Use arrow keys to navigate, Enter to select
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedDatePicker;