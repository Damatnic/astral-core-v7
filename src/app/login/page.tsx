'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the actual login page with timeout fallback
    const redirectTimer = setTimeout(() => {
      router.replace('/auth/login');
    }, 100);

    // Fallback for redirect failure
    const fallbackTimer = setTimeout(() => {
      // If still on this page after 5 seconds, show manual link
      const fallbackLink = document.getElementById('fallback-link');
      if (fallbackLink) {
        fallbackLink.style.display = 'block';
      }
    }, 5000);

    return () => {
      clearTimeout(redirectTimer);
      clearTimeout(fallbackTimer);
    };
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center" role="status" aria-busy="true">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto" aria-hidden="true"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400" aria-live="polite">Redirecting to login...</p>
        <div id="fallback-link" className="mt-4" style={{ display: 'none' }}>
          <a 
            href="/auth/login" 
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-2 py-1"
          >
            Click here if you are not redirected automatically
          </a>
        </div>
        <noscript>
          <div className="mt-4">
            <a href="/auth/login" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline">
              Click here to continue to login
            </a>
          </div>
        </noscript>
      </div>
    </div>
  );
}