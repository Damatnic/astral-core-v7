'use client';

import React from 'react';

export function ErrorBoundaryFallback() {
  return (
    <div 
      className='min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8'
      role='main'
      aria-labelledby='error-heading'
    >
      <div className='sm:mx-auto sm:w-full sm:max-w-md'>
        <div className='bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10'>
          <div className='text-center'>
            <h1 
              id='error-heading' 
              className='text-2xl font-bold text-gray-900 mb-2'
            >
              Application Error
            </h1>
            <p className='text-gray-600 mb-4'>
              We apologize for the inconvenience. The application has encountered an unexpected error.
            </p>
            <p className='text-sm text-gray-500 mb-6'>
              Your data is safe. Please refresh the page or contact support if the issue persists.
            </p>
            <button
              onClick={() => window.location.reload()}
              className='inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 min-h-[44px]'
              aria-describedby='refresh-help'
            >
              Refresh Page
            </button>
            <p id='refresh-help' className='sr-only'>
              This will reload the application and may resolve the error
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}