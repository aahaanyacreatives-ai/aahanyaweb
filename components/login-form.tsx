// components/login-form.tsx - COMPLETE WORKING VERSION
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import {
  Card, CardHeader, CardTitle, CardDescription,
  CardContent, CardFooter
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { toast } from '@/hooks/use-toast';
import { ChromeIcon } from 'lucide-react';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { data: session, status } = useSession();

  // Handle redirects based on session
  useEffect(() => {
    console.log('[DEBUG] Session status:', status, 'Session:', session);
    
    if (status === 'authenticated' && session?.user) {
      console.log('[DEBUG] User authenticated with role:', session.user.role);
      
      if (session.user.role === 'admin') {
        console.log('[DEBUG] Admin user detected, redirecting to dashboard');
        router.push('/admin/dashboard');
      } else {
        console.log('[DEBUG] Regular user, redirecting to home');
        router.push('/');
      }
    }
  }, [status, session, router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    
    console.log('[DEBUG] Login attempt - Email:', email);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      console.log('[DEBUG] SignIn result:', result);

      if (result?.error) {
        console.log('[DEBUG] Login failed:', result.error);
        setLoading(false);
        toast({
          title: "Login Failed",
          description: "Invalid email or password",
          variant: "destructive",
        });
        return;
      }

      if (result?.ok) {
        console.log('[DEBUG] Login successful, waiting for session update');
        toast({
          title: "Login Successful",
          description: "Redirecting...",
        });
        // Don't set loading to false here - let useEffect handle the redirect
      }

    } catch (error) {
      setLoading(false);
      console.error("[DEBUG] Login error:", error);
      toast({
        title: "Login Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  const handleGoogleLogin = async () => {
  setLoading(true);
  try {
    // ✅ Remove redirect: false for Google - let NextAuth handle it
    await signIn("google"); // This will auto-redirect
  } catch (error) {
    setLoading(false);
    console.error("[DEBUG] Google login error:", error);
    toast({
      title: "Google Login Error", 
      description: "Failed to login with Google.",
      variant: "destructive",
    });
  }
};


  // Show loading spinner while session is loading
  if (status === 'loading') {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="flex items-center justify-center p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Loading...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Don't show login form if already authenticated
  if (status === 'authenticated') {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="flex items-center justify-center p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Redirecting...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold">Login to Aahaanya Creatives</CardTitle>
        <CardDescription>Enter your email below to login to your account</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="xyz@gmail.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </Button>
        </form>
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
          </div>
        </div>
        <Button variant="outline" className="w-full bg-transparent" onClick={handleGoogleLogin} disabled={loading}>
          <ChromeIcon className="mr-2 h-4 w-4" />
          Login with Google
        </Button>
      </CardContent>
      <CardFooter className="text-center text-sm">
        Don&apos;t have an account?&nbsp;&nbsp;
        <Link href="/register" className="underline" prefetch={false}>
          Sign up
        </Link>
      </CardFooter>
    </Card>
  );
}
