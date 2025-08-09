import type React from "react"
import type { Metadata } from "next"
import { Poppins } from "next/font/google"
import "./globals.css"
import { Navbar } from "@/components/navbar"
import { CartProvider } from "@/components/cart-provider"
import { AuthProvider } from "@/components/auth-provider"
import { Toaster } from "@/components/ui/toaster";
import { FavoritesProvider } from "@/components/favorites-provider" // Import FavoritesProvider
import { Footer } from "@/components/footer"

import { SyncUserCartFavorites } from "@/components/sync-user-cart-favorites";

// Configure Poppins font
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
})

export const metadata: Metadata = {
  title: "Aahaanya Creatives - Premium Jewellery",
  description: "Exquisite handcrafted jewellery for every occasion.",
    generator: 'v0.dev'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${poppins.className} flex flex-col min-h-screen`}>
        <AuthProvider>
          <CartProvider>
            <FavoritesProvider>
              <Navbar />
              {/* CART/FAV USER AUTO SYNC */}
              <SyncUserCartFavorites />
              <main className="flex-1">{children}</main>
              <Footer />
              <Toaster />
            </FavoritesProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
