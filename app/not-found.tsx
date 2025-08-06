import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] text-center px-4">
      <h1 className="text-6xl font-bold text-primary">404</h1>
      <p className="mt-4 text-xl text-gray-600 dark:text-gray-400">Page Not Found</p>
      <p className="mt-2 text-gray-500 dark:text-gray-500">
        The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
      </p>
      <Link href="/" className="mt-6">
        <Button>Go to Homepage</Button>
      </Link>
    </div>
  )
}
