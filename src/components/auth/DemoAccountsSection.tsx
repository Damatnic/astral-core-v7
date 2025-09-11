'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface DemoAccount {
  role: string;
  email: string;
  name: string;
  color: string;
  icon: React.ReactNode;
  description: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: 'CLIENT',
    email: 'client@demo.astralcore.com',
    name: 'Emma Johnson',
    color: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
    description: 'Experience wellness tracking, journaling, and therapy scheduling',
    icon: (
      <svg className='w-4 h-4 mr-2' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' />
      </svg>
    )
  },
  {
    role: 'THERAPIST',
    email: 'therapist@demo.astralcore.com',
    name: 'Dr. Michael Thompson',
    color: 'bg-purple-600 hover:bg-purple-700 focus:ring-purple-500',
    description: 'Manage patients, create treatment plans, and conduct sessions',
    icon: (
      <svg className='w-4 h-4 mr-2' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' />
      </svg>
    )
  },
  {
    role: 'ADMIN',
    email: 'admin@demo.astralcore.com',
    name: 'Sarah Administrator',
    color: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    description: 'Access system dashboard, user management, and platform settings',
    icon: (
      <svg className='w-4 h-4 mr-2' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' />
        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 12a3 3 0 11-6 0 3 3 0 016 0z' />
      </svg>
    )
  },
  {
    role: 'CRISIS_RESPONDER',
    email: 'crisis@demo.astralcore.com',
    name: 'Alex Crisis-Response',
    color: 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500',
    description: 'Handle crisis interventions and emergency mental health support',
    icon: (
      <svg className='w-4 h-4 mr-2' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z' />
      </svg>
    )
  }
];

interface DemoAccountsSectionProps {
  onError: (error: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export default function DemoAccountsSection({ onError, isLoading, setIsLoading }: DemoAccountsSectionProps) {
  const router = useRouter();
  const [demoAccountsExist, setDemoAccountsExist] = useState<boolean | null>(null);
  const [creatingAccounts, setCreatingAccounts] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Check if demo accounts exist on component mount
  useEffect(() => {
    checkDemoAccounts();
  }, []);

  const checkDemoAccounts = async () => {
    try {
      const response = await fetch('/api/auth/demo/create');
      if (response.ok) {
        const data = await response.json();
        setDemoAccountsExist(data.allExist);
      }
    } catch (error) {
      console.error('Error checking demo accounts:', error);
      setDemoAccountsExist(false);
    }
  };

  const createDemoAccounts = async () => {
    setCreatingAccounts(true);
    try {
      const response = await fetch('/api/auth/demo/create', { method: 'POST' });
      const data = await response.json();
      
      if (response.ok && data.success) {
        setDemoAccountsExist(true);
        onError(''); // Clear any existing errors
      } else {
        onError(`Failed to create demo accounts: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      onError('Error creating demo accounts. Please check your database connection.');
    } finally {
      setCreatingAccounts(false);
    }
  };

  const handleDemoLogin = async (role: string) => {
    onError('');
    setIsLoading(true);

    try {
      const demoCredentials: Record<string, { email: string; password: string }> = {
        CLIENT: { email: 'client@demo.astralcore.com', password: 'Demo123!Client' },
        THERAPIST: { email: 'therapist@demo.astralcore.com', password: 'Demo123!Therapist' },
        ADMIN: { email: 'admin@demo.astralcore.com', password: 'Demo123!Admin' },
        CRISIS_RESPONDER: { email: 'crisis@demo.astralcore.com', password: 'Demo123!Crisis' },
        SUPERVISOR: { email: 'supervisor@demo.astralcore.com', password: 'Demo123!Supervisor' }
      };

      const credentials = demoCredentials[role];
      
      if (!credentials) {
        onError('Demo account not found');
        return;
      }

      const result = await signIn('credentials', {
        email: credentials.email,
        password: credentials.password,
        redirect: false
      });

      if (result?.error) {
        onError(`Demo login failed: ${result.error}. Make sure demo accounts are created.`);
      } else if (result?.ok) {
        router.push('/dashboard');
      }
    } catch (error) {
      onError('An error occurred during demo login');
    } finally {
      setIsLoading(false);
    }
  };

  // If we're still checking, show loading state
  if (demoAccountsExist === null) {
    return (
      <div className='mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto'></div>
          <p className='text-xs text-blue-700 dark:text-blue-300 mt-2'>
            Checking demo accounts...
          </p>
        </div>
      </div>
    );
  }

  // If demo accounts don't exist, show creation option
  if (!demoAccountsExist) {
    return (
      <div className='mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg'>
        <div className='text-center'>
          <h3 className='text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-2'>
            Demo Accounts Not Found
          </h3>
          <p className='text-xs text-yellow-700 dark:text-yellow-300 mb-3'>
            Create demo accounts to explore different user experiences
          </p>
          <button
            onClick={createDemoAccounts}
            disabled={creatingAccounts}
            className='px-4 py-2 text-xs font-medium text-white bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2'
          >
            {creatingAccounts ? (
              <>
                <div className='inline-block animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2'></div>
                Creating Accounts...
              </>
            ) : (
              'Create Demo Accounts'
            )}
          </button>
        </div>
      </div>
    );
  }

  // Show demo accounts section
  return (
    <div className='mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg'>
      <div className='text-center mb-3'>
        <h3 className='text-sm font-semibold text-blue-900 dark:text-blue-100'>
          Demo Accounts for Testing
        </h3>
        <p className='text-xs text-blue-700 dark:text-blue-300 mt-1'>
          Explore different user experiences with one-click login
        </p>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className='text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 mt-1 underline'
        >
          {showDetails ? 'Hide details' : 'Show account details'}
        </button>
      </div>
      
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
        {DEMO_ACCOUNTS.map((account) => (
          <div key={account.role} className='space-y-1'>
            <button
              onClick={() => handleDemoLogin(account.role)}
              disabled={isLoading || creatingAccounts}
              className={`w-full flex items-center justify-center px-3 py-2 text-xs font-medium text-white ${account.color} disabled:opacity-50 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2`}
              aria-label={`Login as demo ${account.role.toLowerCase()} - ${account.name}`}
            >
              {account.icon}
              {account.role === 'CRISIS_RESPONDER' ? 'Crisis Demo' : `${account.role.charAt(0) + account.role.slice(1).toLowerCase()} Demo`}
            </button>
            
            {showDetails && (
              <div className='text-xs text-gray-600 dark:text-gray-400 px-2'>
                <div className='font-medium'>{account.name}</div>
                <div className='text-gray-500 dark:text-gray-500'>{account.description}</div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div className='mt-3 text-center'>
        <p className='text-xs text-blue-600 dark:text-blue-400'>
          Each demo account showcases different platform features and user journeys
        </p>
        <div className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
          🔒 Demo accounts use secure authentication and include sample data
        </div>
      </div>
    </div>
  );
}