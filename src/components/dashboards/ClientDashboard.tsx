'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import type { SessionUser } from '../../lib/types/auth';
import type { AppointmentWithDetails } from '../../lib/types/therapy';
import type { wellnessDataSchema } from '../../lib/types/wellness';
import type { z } from 'zod';
import { AppointmentListSkeleton } from '../ui/SkeletonLoader';
import { logError } from '../../lib/logger';

type WellnessData = z.infer<typeof wellnessDataSchema>;

interface ClientDashboardProps {
  user: SessionUser;
}

export default function ClientDashboard({ user }: ClientDashboardProps) {
  const [wellnessData, setWellnessData] = useState<WellnessData | null>(null);
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [wellnessLoading, setWellnessLoading] = useState(true);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [wellnessError, setWellnessError] = useState<string | null>(null);
  const [appointmentsError, setAppointmentsError] = useState<string | null>(null);

  const fetchWellnessData = async () => {
    try {
      setWellnessLoading(true);
      setWellnessError(null);

      const wellnessRes = await fetch('/api/wellness/data?limit=1');

      if (!wellnessRes.ok) {
        throw new Error(`HTTP error! status: ${wellnessRes.status}`);
      }

      const wellness = await wellnessRes.json();
      setWellnessData(wellness.data?.items?.[0] || null);
    } catch (error) {
      logError('Error fetching wellness data', error, 'ClientDashboard');
      setWellnessError(error instanceof Error ? error.message : 'Failed to load wellness data');
    } finally {
      setWellnessLoading(false);
    }
  };

  const fetchAppointmentsData = async () => {
    try {
      setAppointmentsLoading(true);
      setAppointmentsError(null);

      const appointmentsRes = await fetch('/api/appointments?status=SCHEDULED&limit=5');

      if (!appointmentsRes.ok) {
        throw new Error(`HTTP error! status: ${appointmentsRes.status}`);
      }

      const appts = await appointmentsRes.json();
      setAppointments(appts.data?.items || []);
    } catch (error) {
      logError('Error fetching appointments data', error, 'ClientDashboard');
      setAppointmentsError(error instanceof Error ? error.message : 'Failed to load appointments');
    } finally {
      setAppointmentsLoading(false);
    }
  };

  const fetchDashboardData = useCallback(async () => {
    try {
      await Promise.allSettled([fetchWellnessData(), fetchAppointmentsData()]);
    } catch (error) {
      logError('Error fetching dashboard data', error, 'ClientDashboard');
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleWellnessRetry = () => {
    fetchWellnessData();
  };

  const handleAppointmentsRetry = () => {
    fetchAppointmentsData();
  };

  const getMoodEmoji = (score: number) => {
    if (score >= 8) return '😊';
    if (score >= 6) return '🙂';
    if (score >= 4) return '😐';
    if (score >= 2) return '😔';
    return '😢';
  };

  return (
    <main
      className='min-h-screen bg-gray-50 dark:bg-gray-900'
      role='main'
      aria-label='Client Dashboard'
    >
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        {/* Header */}
        <header className='mb-8'>
          <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>
            Welcome back, {user.name || 'User'}!
          </h1>
          <p className='mt-2 text-gray-600 dark:text-gray-300'>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </header>

        {/* Quick Actions */}
        <section className='mb-8' aria-labelledby='quick-actions-heading'>
          <h2 id='quick-actions-heading' className='sr-only'>
            Quick Actions
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
            <Link
              href='/wellness'
              className='bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
              aria-describedby='wellness-description'
            >
              <div
                className='text-blue-600 dark:text-blue-400 text-3xl mb-2'
                role='img'
                aria-label='Chart emoji'
              >
                📊
              </div>
              <h3 className='font-semibold text-gray-900 dark:text-white'>Track Wellness</h3>
              <p id='wellness-description' className='text-sm text-gray-600 dark:text-gray-300'>
                Log your daily mood
              </p>
            </Link>

            <Link
              href='/appointments'
              className='bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
              aria-describedby='appointments-description'
            >
              <div
                className='text-green-600 dark:text-green-400 text-3xl mb-2'
                role='img'
                aria-label='Calendar emoji'
              >
                📅
              </div>
              <h3 className='font-semibold text-gray-900 dark:text-white'>Appointments</h3>
              <p id='appointments-description' className='text-sm text-gray-600 dark:text-gray-300'>
                Schedule sessions
              </p>
            </Link>

            <Link
              href='/journal'
              className='bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
              aria-describedby='journal-description'
            >
              <div
                className='text-purple-600 dark:text-purple-400 text-3xl mb-2'
                role='img'
                aria-label='Writing emoji'
              >
                📝
              </div>
              <h3 className='font-semibold text-gray-900 dark:text-white'>Journal</h3>
              <p id='journal-description' className='text-sm text-gray-600 dark:text-gray-300'>
                Write your thoughts
              </p>
            </Link>

            <Link
              href='/crisis'
              className='bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition-shadow border-2 border-red-200 dark:border-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2'
              aria-describedby='crisis-description'
              aria-label='Crisis Support - Emergency assistance available 24/7'
            >
              <div
                className='text-red-600 dark:text-red-400 text-3xl mb-2'
                role='img'
                aria-label='SOS emergency emoji'
              >
                🆘
              </div>
              <h3 className='font-semibold text-gray-900 dark:text-white'>Crisis Support</h3>
              <p id='crisis-description' className='text-sm text-gray-600 dark:text-gray-300'>
                Get help now
              </p>
            </Link>
          </div>
        </section>

        <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
          {/* Today's Wellness */}
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-6'>
            <h2 className='text-xl font-semibold text-gray-900 dark:text-white mb-4'>
              Today&apos;s Wellness
            </h2>

            {wellnessLoading ? (
              <div className='space-y-4'>
                <div className='animate-pulse'>
                  <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3'></div>
                  <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-3'></div>
                  <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3'></div>
                </div>
              </div>
            ) : wellnessError ? (
              <div className='text-center py-4'>
                <div className='text-red-500 dark:text-red-400 mb-2'>
                  <svg
                    className='h-8 w-8 mx-auto mb-2'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z'
                    />
                  </svg>
                  <p className='text-sm'>Failed to load wellness data</p>
                </div>
                <button
                  onClick={handleWellnessRetry}
                  className='text-blue-600 dark:text-blue-400 hover:underline text-sm'
                >
                  Try again
                </button>
              </div>
            ) : wellnessData ? (
              <div className='space-y-4'>
                <div className='flex items-center justify-between'>
                  <span className='text-gray-600 dark:text-gray-300'>Mood</span>
                  <div className='flex items-center gap-2'>
                    <span className='text-2xl'>{getMoodEmoji(wellnessData.moodScore)}</span>
                    <span className='font-semibold'>{wellnessData.moodScore}/10</span>
                  </div>
                </div>

                <div className='flex items-center justify-between'>
                  <span className='text-gray-600 dark:text-gray-300'>Anxiety</span>
                  <div className='flex items-center gap-2'>
                    <div className='w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2'>
                      <div
                        className='bg-yellow-500 h-2 rounded-full'
                        style={{ width: `${wellnessData.anxietyLevel * 10}%` }}
                      />
                    </div>
                    <span className='font-semibold'>{wellnessData.anxietyLevel}/10</span>
                  </div>
                </div>

                <div className='flex items-center justify-between'>
                  <span className='text-gray-600 dark:text-gray-300'>Stress</span>
                  <div className='flex items-center gap-2'>
                    <div className='w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2'>
                      <div
                        className='bg-orange-500 h-2 rounded-full'
                        style={{ width: `${wellnessData.stressLevel * 10}%` }}
                      />
                    </div>
                    <span className='font-semibold'>{wellnessData.stressLevel}/10</span>
                  </div>
                </div>

                {wellnessData.sleepHours && (
                  <div className='flex items-center justify-between'>
                    <span className='text-gray-600 dark:text-gray-300'>Sleep</span>
                    <span className='font-semibold'>{wellnessData.sleepHours} hours</span>
                  </div>
                )}
              </div>
            ) : (
              <div className='text-center py-8'>
                <p className='text-gray-500 dark:text-gray-400 mb-4'>
                  No wellness data logged today
                </p>
                <Link
                  href='/wellness'
                  className='inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700'
                >
                  Log Wellness Data
                </Link>
              </div>
            )}
          </div>

          {/* Upcoming Appointments */}
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-6'>
            <div className='flex justify-between items-center mb-4'>
              <h2 className='text-xl font-semibold text-gray-900 dark:text-white'>
                Upcoming Appointments
              </h2>
              <Link
                href='/appointments'
                className='text-sm text-blue-600 dark:text-blue-400 hover:underline'
              >
                View all
              </Link>
            </div>

            {appointmentsLoading ? (
              <AppointmentListSkeleton count={3} />
            ) : appointmentsError ? (
              <div className='text-center py-4'>
                <div className='text-red-500 dark:text-red-400 mb-2'>
                  <svg
                    className='h-8 w-8 mx-auto mb-2'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z'
                    />
                  </svg>
                  <p className='text-sm'>Failed to load appointments</p>
                </div>
                <button
                  onClick={handleAppointmentsRetry}
                  className='text-blue-600 dark:text-blue-400 hover:underline text-sm'
                >
                  Try again
                </button>
              </div>
            ) : appointments.length > 0 ? (
              <div className='space-y-3'>
                {appointments.map(appointment => (
                  <div key={appointment.id} className='border-l-4 border-blue-500 pl-4 py-2'>
                    <div className='font-semibold text-gray-900 dark:text-white'>
                      {appointment.type.replace(/_/g, ' ')}
                    </div>
                    <div className='text-sm text-gray-600 dark:text-gray-300'>
                      {format(new Date(appointment.scheduledAt), 'MMM d, yyyy - h:mm a')}
                    </div>
                    <div className='text-sm text-gray-500 dark:text-gray-400'>
                      with {appointment.therapist?.name || 'Therapist'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className='text-center py-8'>
                <p className='text-gray-500 dark:text-gray-400 mb-4'>No upcoming appointments</p>
                <Link
                  href='/appointments/new'
                  className='inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700'
                >
                  Schedule Appointment
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Resources Section */}
        <div className='mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6'>
          <h2 className='text-xl font-semibold text-gray-900 dark:text-white mb-4'>
            Resources & Support
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            <Link
              href='/resources/coping-strategies'
              className='p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700'
            >
              <h3 className='font-semibold text-gray-900 dark:text-white mb-1'>
                Coping Strategies
              </h3>
              <p className='text-sm text-gray-600 dark:text-gray-300'>
                Learn effective techniques to manage stress and anxiety
              </p>
            </Link>

            <Link
              href='/resources/self-care'
              className='p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700'
            >
              <h3 className='font-semibold text-gray-900 dark:text-white mb-1'>Self-Care Guide</h3>
              <p className='text-sm text-gray-600 dark:text-gray-300'>
                Discover activities to improve your mental health
              </p>
            </Link>

            <Link
              href='/resources/emergency'
              className='p-4 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20'
            >
              <h3 className='font-semibold text-red-600 dark:text-red-400 mb-1'>
                Emergency Contacts
              </h3>
              <p className='text-sm text-gray-600 dark:text-gray-300'>
                24/7 crisis hotlines and emergency resources
              </p>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
