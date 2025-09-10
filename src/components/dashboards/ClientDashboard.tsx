'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import type { SessionUser } from '@/lib/types/auth';

interface ClientDashboardProps {
  user: SessionUser;
}

export default function ClientDashboard({ user }: ClientDashboardProps) {
  const [wellnessData, setWellnessData] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [wellnessRes, appointmentsRes] = await Promise.all([
        fetch('/api/wellness/data?limit=1'),
        fetch('/api/appointments?status=SCHEDULED&limit=5'),
      ]);

      if (wellnessRes.ok) {
        const wellness = await wellnessRes.json();
        setWellnessData(wellness.data?.items?.[0]);
      }

      if (appointmentsRes.ok) {
        const appts = await appointmentsRes.json();
        setAppointments(appts.data?.items || []);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMoodEmoji = (score: number) => {
    if (score >= 8) return '😊';
    if (score >= 6) return '🙂';
    if (score >= 4) return '😐';
    if (score >= 2) return '😔';
    return '😢';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome back, {user.name || 'User'}!
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Link
            href="/wellness"
            className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <div className="text-blue-600 dark:text-blue-400 text-3xl mb-2">📊</div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Track Wellness</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">Log your daily mood</p>
          </Link>

          <Link
            href="/appointments"
            className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <div className="text-green-600 dark:text-green-400 text-3xl mb-2">📅</div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Appointments</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">Schedule sessions</p>
          </Link>

          <Link
            href="/journal"
            className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <div className="text-purple-600 dark:text-purple-400 text-3xl mb-2">📝</div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Journal</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">Write your thoughts</p>
          </Link>

          <Link
            href="/crisis"
            className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition-shadow border-2 border-red-200 dark:border-red-800"
          >
            <div className="text-red-600 dark:text-red-400 text-3xl mb-2">🆘</div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Crisis Support</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">Get help now</p>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Today's Wellness */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Today's Wellness
            </h2>
            
            {loading ? (
              <div className="text-gray-500 dark:text-gray-400">Loading...</div>
            ) : wellnessData ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Mood</span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getMoodEmoji(wellnessData.moodScore)}</span>
                    <span className="font-semibold">{wellnessData.moodScore}/10</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Anxiety</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-yellow-500 h-2 rounded-full"
                        style={{ width: `${wellnessData.anxietyLevel * 10}%` }}
                      />
                    </div>
                    <span className="font-semibold">{wellnessData.anxietyLevel}/10</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Stress</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-orange-500 h-2 rounded-full"
                        style={{ width: `${wellnessData.stressLevel * 10}%` }}
                      />
                    </div>
                    <span className="font-semibold">{wellnessData.stressLevel}/10</span>
                  </div>
                </div>

                {wellnessData.sleepHours && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Sleep</span>
                    <span className="font-semibold">{wellnessData.sleepHours} hours</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  No wellness data logged today
                </p>
                <Link
                  href="/wellness"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Log Wellness Data
                </Link>
              </div>
            )}
          </div>

          {/* Upcoming Appointments */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Upcoming Appointments
              </h2>
              <Link
                href="/appointments"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                View all
              </Link>
            </div>
            
            {loading ? (
              <div className="text-gray-500 dark:text-gray-400">Loading...</div>
            ) : appointments.length > 0 ? (
              <div className="space-y-3">
                {appointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="border-l-4 border-blue-500 pl-4 py-2"
                  >
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {appointment.type.replace(/_/g, ' ')}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {format(new Date(appointment.scheduledAt), 'MMM d, yyyy - h:mm a')}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      with {appointment.therapist?.name || 'Therapist'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  No upcoming appointments
                </p>
                <Link
                  href="/appointments/new"
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Schedule Appointment
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Resources Section */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Resources & Support
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/resources/coping-strategies"
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                Coping Strategies
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Learn effective techniques to manage stress and anxiety
              </p>
            </Link>
            
            <Link
              href="/resources/self-care"
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                Self-Care Guide
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Discover activities to improve your mental health
              </p>
            </Link>
            
            <Link
              href="/resources/emergency"
              className="p-4 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <h3 className="font-semibold text-red-600 dark:text-red-400 mb-1">
                Emergency Contacts
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                24/7 crisis hotlines and emergency resources
              </p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}