  // components/login-form.tsx
  "use client";

  import type React from "react";
  import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
  import { Label } from "@/components/ui/label";
  import { Input } from "@/components/ui/input";
  import { Button } from "@/components/ui/button";
  import Link from "next/link";
  import { useState } from "react";
  import { useRouter } from "next/navigation";
  import { toast } from "@/hooks/use-toast";
  import { ChromeIcon } from "lucide-react";
  import { signIn, getSession } from "next-auth/react";

  export function LoginForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
      /*  DEBUG —–––––––––––––––––––––––––––––––––– */
    console.log("[DEBUG LOGIN-FORM] email =", email);
    console.log("[DEBUG LOGIN-FORM] password =", password);
    /*  ––––––––––––––––––––––––––––––––––––––––– */
    setLoading(true);
    console.log('[DEBUG] Starting login process...');

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      console.log('[DEBUG] SignIn result:', result);

      if (result?.error) {
        console.log('[DEBUG] Login failed:', result.error);
        setLoading(false);
        toast({
          title: "Login Failed",
          description: result.error || "Invalid credentials.",
          variant: "destructive",
        });
        return;
      }

      console.log('[DEBUG] Login successful, starting session check...');
      toast({
        title: "Login Successful!",
        description: "You have been logged in.",
      });

      // Wait a bit longer before starting session check
      setTimeout(() => {
        let attempts = 0;
        const maxAttempts = 10;
        
        const checkSessionAndRedirect = async () => {
          try {
            console.log(`[DEBUG] Checking session attempt ${attempts + 1}...`);
            const session = await getSession();
            console.log(`[DEBUG] Session data:`, session);
            console.log(`[DEBUG] User role:`, session?.user?.role);
            
            if (session?.user?.role) {
              console.log(`[DEBUG] Role found: ${session.user.role}`);
              setLoading(false);
              
              if (session.user.role === 'admin') {
                console.log('[DEBUG] Redirecting admin to /admin');
                router.push('/admin/dashboard');
              } else {
                console.log('[DEBUG] Redirecting user to /');
                router.push('/');
              }
            } else if (attempts < maxAttempts) {
              attempts++;
              console.log(`[DEBUG] No role yet, retrying in 300ms (attempt ${attempts})`);
              setTimeout(checkSessionAndRedirect, 300);
            } else {
              console.log('[DEBUG] Max attempts reached, redirecting to /');
              setLoading(false);
              router.push('/');
            }
          } catch (error) {
            console.error('[DEBUG] Error checking session:', error);
            if (attempts < maxAttempts) {
              attempts++;
              setTimeout(checkSessionAndRedirect, 300);
            } else {
              setLoading(false);
              router.push('/');
            }
          }
        };

        checkSessionAndRedirect();
      }, 1000); // Initial delay of 1 second

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
        // Google OAuth can use redirect: true since it doesn't have the timing issue
        await signIn("google", { 
          redirect: true, 
          callbackUrl: "/" // Your redirect callback will handle admin routing for Google
        });
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
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
          Don&apos;t have an account?&nbsp;&nbsp;  {" "}
          <Link href="/register" className="underline" prefetch={false}>
            Sign up
          </Link>
        </CardFooter>
      </Card>
    );
  }
