'use client';

import Link from 'next/link';
import type { SessionUser } from '@/lib/types/auth';

interface TherapistDashboardProps {
  user: SessionUser;
}

export default function TherapistDashboard({ user }: TherapistDashboardProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Therapist Dashboard
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Welcome back, {user.name}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Today's Sessions</h2>
            <p className="text-3xl font-bold text-blue-600">5</p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Active Clients</h2>
            <p className="text-3xl font-bold text-green-600">24</p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Pending Notes</h2>
            <p className="text-3xl font-bold text-yellow-600">3</p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link href="/therapist/clients" className="block p-3 border rounded hover:bg-gray-50 dark:hover:bg-gray-700">
                View Clients
              </Link>
              <Link href="/therapist/sessions" className="block p-3 border rounded hover:bg-gray-50 dark:hover:bg-gray-700">
                Session Notes
              </Link>
              <Link href="/therapist/treatment-plans" className="block p-3 border rounded hover:bg-gray-50 dark:hover:bg-gray-700">
                Treatment Plans
              </Link>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Today's Schedule</h2>
            <p className="text-gray-500">Schedule implementation coming soon...</p>
          </div>
        </div>
      </div>
    </div>
  );
}