import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect users directly to the login page
  redirect('/auth/login');
}