
import React, { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface ProgressiveDisclosureProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  priority?: 'high' | 'medium' | 'low';
}

export function ProgressiveDisclosure({ 
  title, 
  children, 
  defaultExpanded = false,
  priority = 'medium' 
}: ProgressiveDisclosureProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  const priorityStyles = {
    high: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950',
    medium: 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800', 
    low: 'border-gray-100 bg-gray-25 dark:border-gray-800 dark:bg-gray-900'
  };

  return (
    <div className={`rounded-lg border ${priorityStyles[priority]} transition-all duration-200`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-opacity-75 transition-colors"
        aria-expanded={isExpanded}
        aria-controls={`disclosure-${title.replace(/\s+/g, '-').toLowerCase()}`}
      >
        <span className="font-medium text-gray-900 dark:text-gray-100">
          {title}
        </span>
        {isExpanded ? (
          <ChevronUpIcon className="h-5 w-5 text-gray-500" />
        ) : (
          <ChevronDownIcon className="h-5 w-5 text-gray-500" />
        )}
      </button>
      
      <div
        id={`disclosure-${title.replace(/\s+/g, '-').toLowerCase()}`}
        className={`overflow-hidden transition-all duration-300 ${
          isExpanded ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="p-4 pt-0">
          {children}
        </div>
      </div>
    </div>
  );
}

export default ProgressiveDisclosure;