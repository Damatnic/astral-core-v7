'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useWebSocketContext } from '@/providers/WebSocketProvider';
import { format } from 'date-fns';
import { BellIcon } from '@heroicons/react/24/outline';
import { BellAlertIcon } from '@heroicons/react/24/solid';
import { logError } from '@/lib/logger';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  isRead: boolean;
  actionUrl?: string;
  createdAt: string;
}

export default function NotificationBell() {
  const { unreadCount, on } = useWebSocketContext();
  const [showDropdown, setShowDropdown] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (showDropdown && notifications.length === 0) {
      fetchNotifications();
    }
  }, [showDropdown]);

  // Listen for new notifications
  useEffect(() => {
    if (!on) return;

    const unsubscribe = on('notification:new', notification => {
      setNotifications(prev => [notification, ...prev]);
      // Play notification sound
      playNotificationSound();
    });

    return unsubscribe;
  }, [on]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/notifications?limit=10');
      const data = await response.json();
      if (data.success) {
        setNotifications(data.data.items);
      }
    } catch (error) {
      logError('Error fetching notifications', error, 'NotificationBell');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId })
      });

      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
    } catch (error) {
      logError('Error marking notification as read', error, 'NotificationBell');
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true })
      });

      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      logError('Error marking all as read', error, 'NotificationBell');
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications?id=${notificationId}`, {
        method: 'DELETE'
      });

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      logError('Error deleting notification', error, 'NotificationBell');
    }
  };

  const playNotificationSound = () => {
    // Play a subtle notification sound
    const audio = new Audio('/sounds/notification.mp3');
    audio.volume = 0.3;
    audio.play().catch(() => {
      // Ignore errors if audio playback is blocked
    });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'MESSAGE':
        return '💬';
      case 'APPOINTMENT':
        return '📅';
      case 'CRISIS':
        return '🚨';
      case 'WELLNESS':
        return '🌟';
      case 'SESSION':
        return '📝';
      case 'ACHIEVEMENT':
        return '🏆';
      case 'MEDICATION':
        return '💊';
      default:
        return '📢';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-100 dark:bg-red-900/30 border-red-300';
      case 'HIGH':
        return 'bg-orange-100 dark:bg-orange-900/30 border-orange-300';
      default:
        return 'bg-white dark:bg-gray-800 border-gray-200';
    }
  };

  return (
    <div className='relative' ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className='relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'
        aria-label='Notifications'
      >
        {unreadCount > 0 ? (
          <BellAlertIcon className='h-6 w-6 text-gray-700 dark:text-gray-300 animate-pulse' />
        ) : (
          <BellIcon className='h-6 w-6 text-gray-700 dark:text-gray-300' />
        )}

        {unreadCount > 0 && (
          <span className='absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center'>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className='absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50'>
          <div className='p-4 border-b border-gray-200 dark:border-gray-700'>
            <div className='flex items-center justify-between'>
              <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className='text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400'
                >
                  Mark all as read
                </button>
              )}
            </div>
          </div>

          <div className='max-h-96 overflow-y-auto'>
            {loading ? (
              <div className='p-8 text-center text-gray-500'>Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className='p-8 text-center text-gray-500'>No notifications yet</div>
            ) : (
              <div className='divide-y divide-gray-200 dark:divide-gray-700'>
                {notifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                      !notification.isRead ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                    } ${getPriorityColor(notification.priority)}`}
                  >
                    <div className='flex items-start gap-3'>
                      <span className='text-2xl'>{getNotificationIcon(notification.type)}</span>
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-start justify-between'>
                          <div className='flex-1'>
                            <p className='font-medium text-gray-900 dark:text-white'>
                              {notification.title}
                            </p>
                            <p className='mt-1 text-sm text-gray-600 dark:text-gray-400'>
                              {notification.message}
                            </p>
                            <p className='mt-2 text-xs text-gray-500'>
                              {format(new Date(notification.createdAt), 'MMM d, h:mm a')}
                            </p>
                          </div>
                          <div className='flex items-center gap-1 ml-2'>
                            {!notification.isRead && (
                              <button
                                onClick={() => markAsRead(notification.id)}
                                className='p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded'
                                title='Mark as read'
                              >
                                <svg
                                  className='w-4 h-4'
                                  fill='none'
                                  stroke='currentColor'
                                  viewBox='0 0 24 24'
                                >
                                  <path
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                    strokeWidth={2}
                                    d='M5 13l4 4L19 7'
                                  />
                                </svg>
                              </button>
                            )}
                            <button
                              onClick={() => deleteNotification(notification.id)}
                              className='p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded'
                              title='Delete'
                            >
                              <svg
                                className='w-4 h-4'
                                fill='none'
                                stroke='currentColor'
                                viewBox='0 0 24 24'
                              >
                                <path
                                  strokeLinecap='round'
                                  strokeLinejoin='round'
                                  strokeWidth={2}
                                  d='M6 18L18 6M6 6l12 12'
                                />
                              </svg>
                            </button>
                          </div>
                        </div>
                        {notification.actionUrl && (
                          <a
                            href={notification.actionUrl}
                            className='inline-block mt-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400'
                            onClick={() => setShowDropdown(false)}
                          >
                            View details →
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className='p-3 border-t border-gray-200 dark:border-gray-700'>
            <a
              href='/notifications'
              className='block text-center text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400'
              onClick={() => setShowDropdown(false)}
            >
              View all notifications
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
