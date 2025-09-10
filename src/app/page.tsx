import Link from 'next/link';
import { APP_CONFIG } from '@/lib/constants';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
          Welcome to {APP_CONFIG.name}
        </h1>
        
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
          Your comprehensive mental health platform providing secure, HIPAA-compliant 
          therapy services, wellness tracking, and crisis support.
        </p>
        
        <div className="flex gap-4 justify-center mb-12">
          <Link
            href="/auth/register"
            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Get Started
          </Link>
          
          <Link
            href="/auth/login"
            className="px-8 py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
          >
            Sign In
          </Link>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <div className="text-blue-600 dark:text-blue-400 text-3xl mb-4">🛡️</div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
              Secure & Private
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              HIPAA-compliant platform with end-to-end encryption for all your health data
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <div className="text-blue-600 dark:text-blue-400 text-3xl mb-4">📊</div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
              Wellness Tracking
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Monitor your mood, sleep, and mental health progress with intuitive tools
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <div className="text-blue-600 dark:text-blue-400 text-3xl mb-4">🆘</div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
              24/7 Crisis Support
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Immediate access to crisis intervention and professional support when you need it
            </p>
          </div>
        </div>
        
        <div className="mt-16 text-sm text-gray-500 dark:text-gray-400">
          Version {APP_CONFIG.version} | Built with security and care
        </div>
      </main>
    </div>
  );
}