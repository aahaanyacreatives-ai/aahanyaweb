"use client" // Error components must be Client Components

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] text-center px-4">
      <h2 className="text-3xl font-bold text-red-500">Something went wrong!</h2>
      <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
        We apologize for the inconvenience. Please try again.
      </p>
      <Button
        className="mt-6"
        onClick={
          // Attempt to recover by trying to re-render the segment
          () => reset()
        }
      >
        Try again
      </Button>
    </div>
  )
}
