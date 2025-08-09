"use client"

import { useFavorites } from "@/components/favorites-provider"
import { ProductList } from "@/components/product-list"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import type { Product } from "@/lib/types"

export default function FavoritesPage() {
  // Get only IDs from context!
  const { favoriteProductIds } = useFavorites()

  // Load all products on mount (or use SWR if you have)
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAllProducts() {
      setLoading(true)
      const res = await fetch("/api/products")
      const data = await res.json()
      setAllProducts(data)
      setLoading(false)
    }
    fetchAllProducts()
  }, [])

  // Resolve only the favorite ones
  const favoriteProducts = allProducts.filter(p =>
    favoriteProductIds.includes(p.id)
  )

  // UI:
  return (
    <div className="container mx-auto px-4 py-8 md:px-6 md:py-12">
      <h1 className="text-3xl font-bold mb-8 text-center">Your Favorite Products</h1>
      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Loading...</div>
      ) : favoriteProducts.length === 0 ? (
        <div className="text-center space-y-4">
          <p className="text-lg text-gray-500">You haven't added any products to your favorites yet.</p>
          <Link href="/" passHref>
            <Button>Start Browsing</Button>
          </Link>
        </div>
      ) : (
        <ProductList products={favoriteProducts} />
      )}
    </div>
  )
}
