import type React from "react"
import Link from "next/link"
import { Package2, Home, Package, Users, LineChart, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle  } from "@/components/ui/card"


export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen w-full lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-secondary lg:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-[60px] items-center border-b px-6">
            <Link href="/admin/dashboard" className="flex items-center gap-2 font-semibold">
              <Package2 className="h-6 w-6" />
              <span className="">Aahaanya Admin</span>
            </Link>
          </div>
          <div className="flex-1 overflow-auto py-2">
            <nav className="grid items-start px-4 text-sm font-medium">
              <Link
                href="/admin/dashboard"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
              >
                <Home className="h-4 w-4" />
                Dashboard
              </Link>
              <Link
                href="/admin/products" // Placeholder for products management page
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
              >
                <Package className="h-4 w-4" />
                Products
              </Link>

           <Link
  href="/admin/coupons"
  className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
>
  <Settings className="h-4 w-4" /> {/* Use Settings icon temporarily */}
  Coupons
</Link>

              <Link
                href="/admin/users" // Placeholder for user management page
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
              >
                <Users className="h-4 w-4" />
                Users
              </Link>
              <Link
                href="/admin/orders" // Placeholder for orders management page
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
              >
                <LineChart className="h-4 w-4" />
                Orders & Earnings
              </Link>
              <Link
                href="/admin/settings" // Placeholder for settings page
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
              >
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </nav>
          </div>
          <div className="mt-auto p-4">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle>Admin Tools</CardTitle>
                <CardDescription>Manage your store efficiently.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button size="sm" className="w-full">
                  View Reports
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <header className="flex h-14 lg:h-[60px] items-center gap-4 border-b bg-secondary px-6">
          <Link href="/admin/dashboard" className="lg:hidden">
            <Package2 className="h-6 w-6" />
            <span className="sr-only">Admin Home</span>
          </Link>
          <h1 className="font-semibold text-lg md:text-2xl">Admin Panel</h1>
          {/* Add admin specific header elements like search or user dropdown here */}
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">{children}</main>
      </div>
    </div>
  )
}
