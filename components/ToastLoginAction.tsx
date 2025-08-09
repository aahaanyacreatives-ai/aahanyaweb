"use client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function ToastLoginAction() {
  const router = useRouter();
  return (
    <Button
      size="sm"
      className="mt-2"
      variant="outline"
      onClick={() => router.push("/login")}
    >
      Login
    </Button>
  );
}
