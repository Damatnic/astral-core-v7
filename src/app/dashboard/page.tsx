import { redirect } from 'next/navigation';
import { getCurrentUser } from '../../lib/auth/utils';
import { ROUTES } from '../../lib/constants';
import { getDashboardComponent, preloadDashboardComponent } from '../../components/dashboards/lazy';
import { ErrorBoundary } from '../../components/ErrorBoundary';

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect(ROUTES.auth.login);
  }

  // Preload the dashboard component for better UX
  preloadDashboardComponent(user.role);

  // Get the appropriate lazy-loaded dashboard component
  const DashboardComponent = getDashboardComponent(user.role);

  // Handle special redirects
  switch (user.role) {
    case 'CRISIS_RESPONDER':
      redirect('/crisis/dashboard');
      break;
    case 'SUPERVISOR':
      redirect('/supervisor/dashboard');
      break;
    default:
      return (
        <ErrorBoundary
          fallback={
            <div className='min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8'>
              <div className='sm:mx-auto sm:w-full sm:max-w-md'>
                <div className='bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10'>
                  <div className='text-center'>
                    <h3 className='text-lg font-medium text-gray-900'>Dashboard Error</h3>
                    <p className='mt-2 text-sm text-gray-600'>
                      Unable to load your dashboard. Please try refreshing the page.
                    </p>
                    <button
                      onClick={() => window.location.reload()}
                      className='mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700'
                    >
                      Refresh Dashboard
                    </button>
                  </div>
                </div>
              </div>
            </div>
          }
        >
          <DashboardComponent user={user} />
        </ErrorBoundary>
      );
  }
}
