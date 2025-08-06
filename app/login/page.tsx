// app/login/page.tsx
import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-background px-4 py-12 dark:bg-gray-950">
      <LoginForm />
    </div>
  )
}
