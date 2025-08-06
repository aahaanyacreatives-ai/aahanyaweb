"use client"

import { Button } from "@/components/ui/button"
import { ShoppingCart, User, LogOut, Heart, Package } from "lucide-react"
import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { useEffect, useState } from "react"

interface NavButtonsProps {
  cartCount: number
  favoritesCount: number
}

const CountBadge = ({ count }: { count: number }) => {
  if (count <= 0) return null;
  
  return (
    <span className="absolute -right-2 -top-2 h-5 w-5 rounded-full bg-destructive text-xs text-destructive-foreground flex items-center justify-center">
      {count}
    </span>
  );
};

export function NavButtons({ cartCount, favoritesCount }: NavButtonsProps) {
  const { data: session, status } = useSession()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" })
  }

  if (!mounted) {
    return null;
  }

  return (
    <div className="flex items-center gap-4">
      <Link href="/favorites" className="relative">
        <Button variant="ghost" size="icon" className="text-primary-foreground">
          <Heart className="h-6 w-6" />
          <CountBadge count={favoritesCount} />
        </Button>
      </Link>

      {status === "authenticated" ? (
        <>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-primary-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="h-6 w-6" />
          </Button>
          <Link href="/my-orders">
            <Button variant="ghost" size="icon" className="text-primary-foreground">
              <Package className="h-6 w-6" />
            </Button>
          </Link>
        </>
      ) : (
        <Link href="/login">
          <Button variant="ghost" size="icon" className="text-primary-foreground">
            <User className="h-6 w-6" />
          </Button>
        </Link>
      )}

      <Link href="/cart" className="relative">
        <Button variant="ghost" size="icon" className="text-primary-foreground">
          <ShoppingCart className="h-6 w-6" />
          <CountBadge count={cartCount} />
        </Button>
      </Link>
    </div>
  )
}
