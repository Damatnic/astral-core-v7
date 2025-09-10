'use client';

import React from 'react';
import { useWebSocketContext } from '@/providers/WebSocketProvider';

interface PresenceIndicatorProps {
  userId: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function PresenceIndicator({ 
  userId, 
  showLabel = false,
  size = 'md' 
}: PresenceIndicatorProps) {
  const { getUserStatus } = useWebSocketContext();
  const status = getUserStatus(userId);

  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  const statusColors = {
    online: 'bg-green-500',
    away: 'bg-yellow-500',
    busy: 'bg-red-500',
    offline: 'bg-gray-400',
  };

  const statusLabels = {
    online: 'Online',
    away: 'Away',
    busy: 'Busy',
    offline: 'Offline',
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div 
          className={`${sizeClasses[size]} ${statusColors[status]} rounded-full`}
          aria-label={`Status: ${statusLabels[status]}`}
        />
        {status === 'online' && (
          <div 
            className={`${sizeClasses[size]} ${statusColors[status]} rounded-full absolute top-0 left-0 animate-ping`}
          />
        )}
      </div>
      {showLabel && (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {statusLabels[status]}
        </span>
      )}
    </div>
  );
}