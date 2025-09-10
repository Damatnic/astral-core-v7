import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/utils';
import { ROUTES } from '@/lib/constants';
import { getDashboardComponent, preloadDashboardComponent } from '@/components/dashboards/lazy';

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
      return <DashboardComponent user={user} />;
  }
}
