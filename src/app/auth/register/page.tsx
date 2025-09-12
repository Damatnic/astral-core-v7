'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';
import { registerSchema } from '../../../lib/types/auth';
import { APP_CONFIG } from '../../../lib/constants';
import { ErrorBoundary } from '../../../components/ErrorBoundary';

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    acceptTerms: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const validated = registerSchema.parse(formData);

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validated)
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Registration failed');
      } else {
        // Registration successful, redirect to login
        router.push('/auth/login?registered=true');
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        setError(error.issues[0]?.message || 'Validation error');
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ErrorBoundary
      fallback={
        <div className='min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8'>
          <div className='sm:mx-auto sm:w-full sm:max-w-md'>
            <div className='bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10'>
              <div className='text-center'>
                <h3 className='text-lg font-medium text-gray-900'>Registration Error</h3>
                <p className='mt-2 text-sm text-gray-600'>
                  We encountered an issue with the registration page. Please try refreshing or contact support if the problem persists.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className='mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700'
                >
                  Refresh Page
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4'>
      <div className='max-w-md w-full space-y-8'>
        <div className='text-center'>
          <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>Create Account</h1>
          <p className='mt-2 text-gray-600 dark:text-gray-300'>Join {APP_CONFIG.name} today</p>
        </div>

        <div className='bg-white dark:bg-gray-800 py-8 px-6 shadow-lg rounded-lg'>
          {error && (
            <div className='mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 rounded'>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className='space-y-6'>
            <div>
              <label
                htmlFor='name'
                className='block text-sm font-medium text-gray-700 dark:text-gray-200'
              >
                Full Name
              </label>
              <input
                id='name'
                name='name'
                type='text'
                autoComplete='name'
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className='mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500'
                disabled={isLoading}
              />
            </div>

            <div>
              <label
                htmlFor='email'
                className='block text-sm font-medium text-gray-700 dark:text-gray-200'
              >
                Email Address
              </label>
              <input
                id='email'
                name='email'
                type='email'
                autoComplete='email'
                required
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className='mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500'
                disabled={isLoading}
              />
            </div>

            <div>
              <label
                htmlFor='password'
                className='block text-sm font-medium text-gray-700 dark:text-gray-200'
              >
                Password
              </label>
              <input
                id='password'
                name='password'
                type='password'
                autoComplete='new-password'
                required
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                className='mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500'
                disabled={isLoading}
              />
              <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                Must be at least 8 characters with uppercase, lowercase, number, and special
                character
              </p>
            </div>

            <div>
              <label
                htmlFor='confirmPassword'
                className='block text-sm font-medium text-gray-700 dark:text-gray-200'
              >
                Confirm Password
              </label>
              <input
                id='confirmPassword'
                name='confirmPassword'
                type='password'
                autoComplete='new-password'
                required
                value={formData.confirmPassword}
                onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                className='mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500'
                disabled={isLoading}
              />
            </div>

            <div className='flex items-start'>
              <input
                id='accept-terms'
                name='accept-terms'
                type='checkbox'
                checked={formData.acceptTerms}
                onChange={e => setFormData({ ...formData, acceptTerms: e.target.checked })}
                className='h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5'
                disabled={isLoading}
              />
              <label
                htmlFor='accept-terms'
                className='ml-2 block text-sm text-gray-700 dark:text-gray-300'
              >
                I accept the{' '}
                <Link
                  href='/terms'
                  className='text-blue-600 hover:text-blue-500 dark:text-blue-400'
                  target='_blank'
                >
                  Terms and Conditions
                </Link>{' '}
                and{' '}
                <Link
                  href='/privacy'
                  className='text-blue-600 hover:text-blue-500 dark:text-blue-400'
                  target='_blank'
                >
                  Privacy Policy
                </Link>
              </label>
            </div>

            <button
              type='submit'
              disabled={isLoading || !formData.acceptTerms}
              className='w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {isLoading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <div className='mt-6'>
            <div className='relative'>
              <div className='absolute inset-0 flex items-center'>
                <div className='w-full border-t border-gray-300 dark:border-gray-600' />
              </div>
              <div className='relative flex justify-center text-sm'>
                <span className='px-2 bg-white dark:bg-gray-800 text-gray-500'>
                  Important Information
                </span>
              </div>
            </div>

            <div className='mt-4 text-sm text-gray-600 dark:text-gray-400 space-y-2'>
              <p>🔒 Your data is encrypted and secure</p>
              <p>🏥 HIPAA-compliant platform</p>
              <p>🚨 24/7 crisis support available</p>
            </div>
          </div>

          <div className='mt-6 text-center text-sm'>
            <span className='text-gray-600 dark:text-gray-400'>Already have an account? </span>
            <Link
              href='/auth/login'
              className='font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400'
            >
              Sign in
            </Link>
          </div>
        </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
