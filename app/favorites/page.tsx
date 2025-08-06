"use client"

import { ProductList } from "@/components/product-list"
import { useFavorites } from "@/components/favorites-provider"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function FavoritesPage() {
  const { favoriteProducts } = useFavorites()

  return (
    <div className="container mx-auto px-4 py-8 md:px-6 md:py-12">
      <h1 className="text-3xl font-bold mb-8 text-center">Your Favorite Products</h1>
      {favoriteProducts.length === 0 ? (
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
