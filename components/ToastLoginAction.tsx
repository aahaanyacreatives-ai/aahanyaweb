"use client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function ToastLoginAction() {
  const router = useRouter();
  return (
    <Button
      size="sm"
      className="mt-2 bg-rose-800 text-white hover:bg-rose-600 transition-colors font-semibold"
      onClick={() => router.push("/login")}
    >
      Login
    </Button>
  );
}
