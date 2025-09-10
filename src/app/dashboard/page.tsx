import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/utils';
import { ROUTES } from '@/lib/constants';
import ClientDashboard from '@/components/dashboards/ClientDashboard';
import TherapistDashboard from '@/components/dashboards/TherapistDashboard';
import AdminDashboard from '@/components/dashboards/AdminDashboard';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect(ROUTES.auth.login);
  }

  // Render dashboard based on user role
  switch (user.role) {
    case 'ADMIN':
      return <AdminDashboard user={user} />;
    case 'THERAPIST':
      return <TherapistDashboard user={user} />;
    case 'CLIENT':
      return <ClientDashboard user={user} />;
    case 'CRISIS_RESPONDER':
      redirect('/crisis/dashboard');
      break;
    case 'SUPERVISOR':
      redirect('/supervisor/dashboard');
      break;
    default:
      return <ClientDashboard user={user} />;
  }
}