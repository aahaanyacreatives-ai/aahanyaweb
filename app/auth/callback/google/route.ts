import { redirect } from 'next/navigation';
import { auth } from '@/auth';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const searchParams = new URLSearchParams(url.search);
  
  // Get the callback URL from the search params
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  
  // Get the session
  const session = await auth();
  
  if (session) {
    // If the user is an admin, redirect to admin dashboard
    if (session.user?.role === 'admin') {
      redirect('/admin/dashboard');
    }
    // Otherwise redirect to the callback URL or home
    redirect(callbackUrl);
  }
  
  // If no session, redirect to login
  redirect('/login');
}
