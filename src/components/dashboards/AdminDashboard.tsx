'use client';

import Link from 'next/link';
import type { SessionUser } from '../../lib/types/auth';

interface AdminDashboardProps {
  user: SessionUser;
}

export default function AdminDashboard({ user }: AdminDashboardProps) {
  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>Admin Dashboard</h1>
          <p className='mt-2 text-gray-600 dark:text-gray-300'>System Overview - {user.name}</p>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-4 gap-6'>
          <div className='bg-white dark:bg-gray-800 p-6 rounded-lg shadow'>
            <h2 className='text-sm font-semibold text-gray-600 mb-2'>Total Users</h2>
            <p className='text-3xl font-bold text-blue-600'>1,248</p>
            <p className='text-sm text-green-600 mt-2'>+12% this month</p>
          </div>

          <div className='bg-white dark:bg-gray-800 p-6 rounded-lg shadow'>
            <h2 className='text-sm font-semibold text-gray-600 mb-2'>Active Sessions</h2>
            <p className='text-3xl font-bold text-green-600'>42</p>
            <p className='text-sm text-gray-500 mt-2'>Live now</p>
          </div>

          <div className='bg-white dark:bg-gray-800 p-6 rounded-lg shadow'>
            <h2 className='text-sm font-semibold text-gray-600 mb-2'>Crisis Alerts</h2>
            <p className='text-3xl font-bold text-red-600'>2</p>
            <p className='text-sm text-red-500 mt-2'>Requires attention</p>
          </div>

          <div className='bg-white dark:bg-gray-800 p-6 rounded-lg shadow'>
            <h2 className='text-sm font-semibold text-gray-600 mb-2'>System Health</h2>
            <p className='text-3xl font-bold text-green-600'>98%</p>
            <p className='text-sm text-green-500 mt-2'>All systems operational</p>
          </div>
        </div>

        <div className='mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8'>
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-6'>
            <h2 className='text-xl font-semibold mb-4'>Admin Actions</h2>
            <div className='space-y-3'>
              <Link
                href='/admin/users'
                className='block p-3 border rounded hover:bg-gray-50 dark:hover:bg-gray-700'
              >
                Manage Users
              </Link>
              <Link
                href='/admin/therapists'
                className='block p-3 border rounded hover:bg-gray-50 dark:hover:bg-gray-700'
              >
                Manage Therapists
              </Link>
              <Link
                href='/admin/audit'
                className='block p-3 border rounded hover:bg-gray-50 dark:hover:bg-gray-700'
              >
                Audit Logs
              </Link>
              <Link
                href='/admin/settings'
                className='block p-3 border rounded hover:bg-gray-50 dark:hover:bg-gray-700'
              >
                System Settings
              </Link>
            </div>
          </div>

          <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-6'>
            <h2 className='text-xl font-semibold mb-4'>Recent Activity</h2>
            <div className='space-y-2 text-sm'>
              <div className='flex justify-between'>
                <span>New user registration</span>
                <span className='text-gray-500'>2 min ago</span>
              </div>
              <div className='flex justify-between'>
                <span>Crisis intervention completed</span>
                <span className='text-gray-500'>15 min ago</span>
              </div>
              <div className='flex justify-between'>
                <span>Therapist profile updated</span>
                <span className='text-gray-500'>1 hour ago</span>
              </div>
              <div className='flex justify-between'>
                <span>System backup completed</span>
                <span className='text-gray-500'>3 hours ago</span>
              </div>
            </div>
          </div>
        </div>

        <div className='mt-8 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6'>
          <h2 className='text-xl font-semibold text-yellow-800 dark:text-yellow-200 mb-2'>
            Security & Compliance
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mt-4'>
            <div>
              <p className='text-sm font-semibold text-gray-600 dark:text-gray-300'>
                HIPAA Compliance
              </p>
              <p className='text-green-600 font-bold'>✓ Compliant</p>
            </div>
            <div>
              <p className='text-sm font-semibold text-gray-600 dark:text-gray-300'>
                Last Security Audit
              </p>
              <p className='font-bold'>3 days ago</p>
            </div>
            <div>
              <p className='text-sm font-semibold text-gray-600 dark:text-gray-300'>
                Data Encryption
              </p>
              <p className='text-green-600 font-bold'>✓ Active</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
