"use client"

import type React from "react"

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"
import { ChromeIcon } from "lucide-react" // Changed from GithubIcon to ChromeIcon
import { signIn } from "next-auth/react"

export function RegisterForm() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    /*  DEBUG —–––––––––––––––––––––––––––––––––– */
  console.log("[DEBUG REGISTER-FORM] email =", email);
  console.log("[DEBUG REGISTER-FORM] password =", password);

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, email, password }),
    })
    console.log("[DEBUG REGISTER] Raw password registered:", password);


    const data = await response.json()
    setLoading(false)

    if (response.ok) {
      toast({
        title: "Registration Successful!",
        description: "Your account has been created. Please log in.",
      })
      // After successful registration, automatically sign in the user
      await signIn("credentials", {
        redirect: false,
        email,
        password,
      })
      router.push("/") // Redirect to home after registration and auto-login
    } else {
      toast({
        title: "Registration Failed",
        description: data.error || "Something went wrong. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleGoogleRegister = async () => {
    setLoading(true)
    await signIn("google", { callbackUrl: "/" }) // Redirect to home after Google registration
    // setLoading(false) is not strictly needed here as signIn will redirect
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold">Create an Account</CardTitle>
        <CardDescription>Enter your details below to create your Aahaanya Creatives account</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
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
            {loading ? "Registering..." : "Register"}
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
        <Button variant="outline" className="w-full bg-transparent" onClick={handleGoogleRegister} disabled={loading}>
          <ChromeIcon className="mr-2 h-4 w-4" /> {/* Using ChromeIcon for Google */}
          Register with Google
        </Button>
      </CardContent>
      <CardFooter className="text-center text-sm">
        Already have an account?{" "}
        <Link href="/login" className="underline" prefetch={false}>
          Login
        </Link>
      </CardFooter>
    </Card>
  )
}
