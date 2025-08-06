// app/admin/not-found.tsx
'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";

export default function AdminNotFound() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center max-w-md">
        <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Admin Page Not Found</h1>
        <p className="text-gray-600 mb-4">
          The admin route <code className="bg-gray-100 px-2 py-1 rounded">{pathname}</code> doesn't exist.
        </p>
        <div className="space-y-2">
          <Button 
            onClick={() => router.push('/admin/dashboard')}
            className="w-full"
          >
            <Home className="mr-2 h-4 w-4" />
            Admin Dashboard
          </Button>
          <Button 
            variant="outline" 
            onClick={() => router.back()}
            className="w-full"
          >
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}
