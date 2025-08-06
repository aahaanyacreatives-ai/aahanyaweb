// app/auth/redirect/page.tsx
"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react"; // Optional: For a loading spinner (install lucide-react if needed)

export default function AuthRedirect() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    console.log("[DEBUG] Session status: ", status, " - full session: ", JSON.stringify(session));
    if (status === "loading") return;
    if (!session || !session.user) {
      console.log("[DEBUG] No session/user - redirect to /login");
      router.push("/login");
      return;
    }
    const role = session.user.role || 'user';
    console.log("[DEBUG] Detected role: ", role);
    if (role === "admin") {
      console.log("[DEBUG] Admin - redirect to /admin/dashboard");
      router.push("/admin/dashboard");
    } else {
      console.log("[DEBUG] Non-admin - redirect to /");
      router.push("/");
    }
  }, [session, status, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin" /> {/* Optional loading spinner */}
      <p>Redirecting...</p>
    </div>
  );
}
