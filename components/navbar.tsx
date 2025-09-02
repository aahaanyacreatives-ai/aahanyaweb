"use client";

import type React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet";
import { Menu, ShoppingCart, User, LogOut, Search, Heart, Package } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { useFavorites } from "@/components/favorites-provider";
import { useSession, signOut } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

// Create a client-only component for the cart count
const CartCount = ({ count }: { count: number }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return count > 0 ? (
    <span className="absolute -right-2 -top-2 h-5 w-5 rounded-full bg-destructive text-xs text-destructive-foreground flex items-center justify-center">
      {count}
    </span>
  ) : null;
};

// Create a client-only component for the favorites count
const FavoritesCount = ({ count }: { count: number }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return count > 0 ? (
    <span className="absolute -right-2 -top-2 h-5 w-5 rounded-full bg-destructive text-xs text-destructive-foreground flex items-center justify-center">
      {count}
    </span>
  ) : null;
};

export function Navbar() {
  const pathname = usePathname();
  const onAdmin = pathname.startsWith("/admin");

  // ‼️ Do not render the public navbar inside the admin area
  if (onAdmin) return null;
  const { cartItems } = useCart();
  const { favoriteProductIds } = useFavorites();
  const { data: session, status } = useSession();
  const totalItemsInCart = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const [searchQuery, setSearchQuery] = useState("");
  const isAdmin = (session?.user as any)?.role === "admin";
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" });
  };

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?query=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  };

  return (
    <>
      {/* Top Announcement Bar */}
      <div className="w-full bg-primary text-primary-foreground text-center text-sm py-2 font-medium">
        Use code <span className="font-bold">LAUNCH10</span> to get discount on your first order!
      </div>

      <header className="sticky top-0 z-50 w-full border-b bg-primary text-primary-foreground">
        <div className="container flex h-16 items-center justify-between px-4 md:px-6">
          {/* Left Section: Menu (Mobile), Brand Name, and Search (Desktop) */}
          <div className="flex items-center gap-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden text-primary-foreground">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="bg-background text-foreground">
                <div className="grid gap-4 py-6">
                  {/* Search bar for mobile */}
                  <form onSubmit={handleSearch} className="relative mb-4">
                    <Input
                      type="search"
                      placeholder="Search products..."
                      className="pl-8 w-full"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <Button type="submit" variant="ghost" size="icon" className="absolute left-0 top-0 h-full px-2">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <span className="sr-only">Search</span>
                    </Button>
                  </form>

                  <Link href="/" className="text-lg font-semibold" prefetch={false}>
                    Home
                  </Link>
                  <Link href="/female-collection" className="text-lg font-semibold" prefetch={false}>
                    Female Collection
                  </Link>
                  <Link href="/male-collection" className="text-lg font-semibold" prefetch={false}>
                    Male Collection
                  </Link>
                  <Link href="/metal-art" className="text-lg font-semibold" prefetch={false}>
                    Metal Art
                  </Link>
                  {status === "authenticated" && (
                    <Link href="/my-orders" className="text-lg font-semibold flex items-center gap-2" prefetch={false}>
                      <Package className="mr-2 h-5 w-5" /> My Orders
                    </Link>
                  )}
                  {isAdmin && (
                    <Link href="/admin/dashboard" className="text-lg font-semibold" prefetch={false}>
                      Admin
                    </Link>
                  )}
                  {status === "authenticated" ? (
                    <Button variant="ghost" className="justify-start text-lg font-semibold p-0" onClick={handleSignOut}>
                      <LogOut className="mr-2 h-5 w-5" /> Logout
                    </Button>
                  ) : (
                    <Link href="/login" className="text-lg font-semibold" prefetch={false}>
                      Login / Register
                    </Link>
                  )}
                  <Link href="/favorites" className="text-lg font-semibold flex items-center gap-2" prefetch={false}>
                    Favorites
                    {favoriteProductIds.length > 0 && (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                        {favoriteProductIds.length}
                      </span>
                    )}
                  </Link>
                  <Link href="/cart" className="text-lg font-semibold flex items-center gap-2" prefetch={false}>
                    Cart
                    {totalItemsInCart > 0 && (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                        {totalItemsInCart}
                      </span>
                    )}
                  </Link>
                </div>
              </SheetContent>
            </Sheet>

            {/* Brand Name: Visible on both mobile and desktop */}
            <span className="text-smll md:text-2xl font-bold tracking-tight text-primary-foreground">
              Aahaanya  Creatives
            </span>

            {/* Search form: Hidden on mobile, visible on desktop */}
            <form onSubmit={handleSearch} className="relative hidden md:block">
              <Input
                type="search"
                placeholder="Search..."
                className="pl-8 w-[150px] lg:w-[200px] bg-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/70 border-none focus-visible:ring-1 focus-visible:ring-primary-foreground"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button type="submit" variant="ghost" size="icon" className="absolute left-0 top-0 h-full px-2">
                <Search className="h-4 w-4 text-primary-foreground" />
                <span className="sr-only">Search</span>
              </Button>
            </form>
          </div>

          {/* Center Section: Main Navigation Links (Desktop only) */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link href="/" className="hover:underline underline-offset-4" prefetch={false}>
              Home
            </Link>
            <Link href="/female-collection" className="hover:underline underline-offset-4" prefetch={false}>
              Female Collection
            </Link>
            <Link href="/male-collection" className="hover:underline underline-offset-4" prefetch={false}>
              Male Collection
            </Link>
            <Link href="/metal-art" className="hover:underline underline-offset-4" prefetch={false}>
              Metal Art
            </Link>
          </nav>

          {/* Right Section: Icons */}
          <div className="flex items-center gap-2 md:gap-4">
            <Link href="/favorites" className="relative" prefetch={false}>
              <Button variant="ghost" size="icon" className="text-primary-foreground">
                <Heart className="h-5 w-5" />
                <span className="sr-only">Favorites</span>
                {favoriteProductIds.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-300 text-xs text-white">
                    {favoriteProductIds.length}
                  </span>
                )}
              </Button>
            </Link>

            {status === "authenticated" ? (
              <Button variant="ghost" size="icon" onClick={handleSignOut} className="text-primary-foreground">
                <LogOut className="h-5 w-5" />
                <span className="sr-only">Logout</span>
              </Button>
            ) : (
              <Link href="/login" prefetch={false}>
                <Button variant="ghost" size="icon" className="text-primary-foreground">
                  <User className="h-5 w-5" />
                  <span className="sr-only">Login / Register</span>
                </Button>
              </Link>
            )}

            <Link href="/cart" className="relative" prefetch={false}>
              <Button variant="ghost" size="icon" className="text-primary-foreground">
                <ShoppingCart className="h-5 w-5" />
                <span className="sr-only">Shopping Cart</span>
                {totalItemsInCart > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-300 text-xs text-white">
                    {totalItemsInCart}
                  </span>
                )}
              </Button>
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}
