'use client';

import React from 'react';
import { 
  DocumentTextIcon, 
  FolderIcon, 
  MagnifyingGlassIcon,
  ChatBubbleLeftRightIcon,
  CalendarIcon,
  UserGroupIcon,
  HeartIcon,
  ChartBarIcon,
  PhotoIcon,
  MusicalNoteIcon,
  InboxIcon,
  BellIcon
} from '@heroicons/react/24/outline';

interface EmptyStateProps {
  type?: 'search' | 'data' | 'messages' | 'appointments' | 'journal' | 'wellness' | 'files' | 'notifications' | 'custom';
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  illustration?: 'minimal' | 'detailed' | 'animated';
  className?: string;
}

const illustrations = {
  search: {
    icon: MagnifyingGlassIcon,
    title: 'No results found',
    description: 'Try adjusting your search terms or filters',
    svg: (
      <svg viewBox="0 0 200 200" className="w-full h-full">
        <circle cx="80" cy="80" r="40" fill="none" stroke="currentColor" strokeWidth="3" className="text-gray-300" />
        <line x1="110" y1="110" x2="140" y2="140" stroke="currentColor" strokeWidth="3" className="text-gray-300" />
        <path d="M60 80 Q80 60 100 80" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400" />
        <circle cx="65" cy="70" r="3" fill="currentColor" className="text-gray-400" />
        <circle cx="95" cy="70" r="3" fill="currentColor" className="text-gray-400" />
      </svg>
    )
  },
  data: {
    icon: ChartBarIcon,
    title: 'No data yet',
    description: 'Start tracking your progress to see insights here',
    svg: (
      <svg viewBox="0 0 200 200" className="w-full h-full">
        <rect x="40" y="120" width="20" height="40" fill="currentColor" className="text-gray-200" />
        <rect x="70" y="100" width="20" height="60" fill="currentColor" className="text-gray-200" />
        <rect x="100" y="80" width="20" height="80" fill="currentColor" className="text-gray-200" />
        <rect x="130" y="90" width="20" height="70" fill="currentColor" className="text-gray-200" />
        <path d="M40 60 L70 45 L100 55 L130 40 L160 50" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-400" strokeDasharray="5,5" />
      </svg>
    )
  },
  messages: {
    icon: ChatBubbleLeftRightIcon,
    title: 'No messages',
    description: 'Start a conversation with your therapist or support group',
    svg: (
      <svg viewBox="0 0 200 200" className="w-full h-full">
        <rect x="40" y="50" width="80" height="60" rx="10" fill="currentColor" className="text-gray-200" />
        <rect x="80" y="90" width="80" height="60" rx="10" fill="currentColor" className="text-gray-200" />
        <circle cx="60" cy="80" r="3" fill="currentColor" className="text-gray-400 animate-pulse" />
        <circle cx="75" cy="80" r="3" fill="currentColor" className="text-gray-400 animate-pulse" style={{animationDelay: '0.2s'}} />
        <circle cx="90" cy="80" r="3" fill="currentColor" className="text-gray-400 animate-pulse" style={{animationDelay: '0.4s'}} />
      </svg>
    )
  },
  appointments: {
    icon: CalendarIcon,
    title: 'No upcoming appointments',
    description: 'Schedule your next session to continue your wellness journey',
    svg: (
      <svg viewBox="0 0 200 200" className="w-full h-full">
        <rect x="40" y="60" width="120" height="100" rx="5" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-300" />
        <line x1="40" y1="85" x2="160" y2="85" stroke="currentColor" strokeWidth="2" className="text-gray-300" />
        <rect x="55" y="45" width="10" height="30" rx="2" fill="currentColor" className="text-gray-400" />
        <rect x="135" y="45" width="10" height="30" rx="2" fill="currentColor" className="text-gray-400" />
        {[0, 1, 2, 3, 4, 5, 6].map((col) => (
          [0, 1, 2, 3].map((row) => (
            <rect 
              key={`${col}-${row}`}
              x={50 + col * 15} 
              y={95 + row * 15} 
              width="10" 
              height="10" 
              fill="currentColor" 
              className="text-gray-200"
            />
          ))
        ))}
      </svg>
    )
  },
  journal: {
    icon: DocumentTextIcon,
    title: 'Your journal is empty',
    description: 'Start writing to track your thoughts and feelings',
    svg: (
      <svg viewBox="0 0 200 200" className="w-full h-full">
        <rect x="50" y="30" width="100" height="140" rx="3" fill="currentColor" className="text-gray-100" />
        <rect x="50" y="30" width="100" height="140" rx="3" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-300" />
        <line x1="70" y1="60" x2="130" y2="60" stroke="currentColor" strokeWidth="2" className="text-gray-300" />
        <line x1="70" y1="80" x2="130" y2="80" stroke="currentColor" strokeWidth="2" className="text-gray-300" />
        <line x1="70" y1="100" x2="110" y2="100" stroke="currentColor" strokeWidth="2" className="text-gray-300" />
        <path d="M120 120 L130 110 L140 120 L130 130 Z" fill="currentColor" className="text-blue-400" />
        <line x1="140" y1="120" x2="145" y2="125" stroke="currentColor" strokeWidth="2" className="text-blue-400" />
      </svg>
    )
  },
  wellness: {
    icon: HeartIcon,
    title: 'No wellness data',
    description: 'Track your mood and activities to see your progress',
    svg: (
      <svg viewBox="0 0 200 200" className="w-full h-full">
        <path 
          d="M100 160 C100 160 40 120 40 80 C40 60 55 45 70 45 C85 45 100 55 100 55 C100 55 115 45 130 45 C145 45 160 60 160 80 C160 120 100 160 100 160 Z" 
          fill="currentColor" 
          className="text-pink-200"
        />
        <path 
          d="M70 45 C55 45 40 60 40 80 C40 100 60 120 80 135" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          className="text-pink-400"
        />
        <circle cx="85" cy="80" r="5" fill="currentColor" className="text-white animate-pulse" />
        <circle cx="115" cy="80" r="5" fill="currentColor" className="text-white animate-pulse" style={{animationDelay: '0.5s'}} />
      </svg>
    )
  },
  files: {
    icon: FolderIcon,
    title: 'No files uploaded',
    description: 'Upload documents to keep everything in one place',
    svg: (
      <svg viewBox="0 0 200 200" className="w-full h-full">
        <path d="M40 70 L40 150 L160 150 L160 90 L120 90 L110 70 Z" fill="currentColor" className="text-gray-200" />
        <path d="M40 70 L40 150 L160 150 L160 90 L120 90 L110 70 Z" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400" />
        <rect x="50" y="60" width="40" height="10" rx="2" fill="currentColor" className="text-gray-400" />
      </svg>
    )
  },
  notifications: {
    icon: BellIcon,
    title: 'No notifications',
    description: "You're all caught up!",
    svg: (
      <svg viewBox="0 0 200 200" className="w-full h-full">
        <path d="M100 40 C80 40 65 55 65 75 L65 110 L50 130 L150 130 L135 110 L135 75 C135 55 120 40 100 40 Z" fill="currentColor" className="text-gray-200" />
        <circle cx="100" cy="145" r="10" fill="currentColor" className="text-gray-300" />
        <path d="M90 145 C90 150 95 155 100 155 C105 155 110 150 110 145" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400" />
      </svg>
    )
  }
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'data',
  title,
  description,
  icon,
  action,
  secondaryAction,
  illustration = 'minimal',
  className = ''
}) => {
  const config = type !== 'custom' ? illustrations[type] : null;
  const Icon = icon || config?.icon;
  const displayTitle = title || config?.title || 'No data';
  const displayDescription = description || config?.description || 'Get started by adding some content';

  return (
    <div className={`flex flex-col items-center justify-center py-12 px-6 ${className}`}>
      {/* Illustration */}
      <div className={`mb-6 ${illustration === 'animated' ? 'animate-float' : ''}`}>
        {illustration === 'detailed' && config?.svg ? (
          <div className="w-48 h-48">
            {config.svg}
          </div>
        ) : Icon ? (
          <div className={`
            p-4 rounded-full 
            ${illustration === 'minimal' 
              ? 'bg-gray-100 dark:bg-gray-800' 
              : 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700'
            }
          `}>
            <Icon className="h-12 w-12 text-gray-400 dark:text-gray-500" />
          </div>
        ) : null}
      </div>

      {/* Text Content */}
      <div className="text-center max-w-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {displayTitle}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          {displayDescription}
        </p>
      </div>

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {action && (
            <button
              onClick={action.onClick}
              className="
                px-6 py-2 rounded-lg
                bg-blue-500 text-white
                hover:bg-blue-600
                focus:outline-none focus:ring-2 focus:ring-blue-500
                transition-colors
              "
            >
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="
                px-6 py-2 rounded-lg
                border border-gray-300 dark:border-gray-600
                text-gray-700 dark:text-gray-300
                hover:bg-gray-50 dark:hover:bg-gray-800
                focus:outline-none focus:ring-2 focus:ring-gray-500
                transition-colors
              "
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

// Empty State with Loading
interface LoadingEmptyStateProps {
  isLoading: boolean;
  isEmpty: boolean;
  emptyStateProps: EmptyStateProps;
  children: React.ReactNode;
}

export const LoadingEmptyState: React.FC<LoadingEmptyStateProps> = ({
  isLoading,
  isEmpty,
  emptyStateProps,
  children
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 mx-auto mb-4 text-gray-400" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (isEmpty) {
    return <EmptyState {...emptyStateProps} />;
  }

  return <>{children}</>;
};

export default EmptyState;