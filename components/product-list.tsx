"use client"

import type { Product } from "@/lib/types"
import { ProductCard } from "./product-card"
import { useState, useMemo, useEffect } from "react"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Button } from "@/components/ui/button"

interface ProductListProps {
  products: Product[]
}

export function ProductList({ products }: ProductListProps) {
  const [sortOrder, setSortOrder] = useState<"default" | "price-asc" | "price-desc">("default")
  const [windowWidth, setWindowWidth] = useState(0)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    setWindowWidth(window.innerWidth)
    
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Updated to show 2 products in 1 row on mobile
  const getProductsToShow = () => {
    if (showAll) return products.length
    
    if (windowWidth < 640) return 2    // Mobile: 2 products (1 row × 2 cols)
    if (windowWidth < 768) return 4    // Small tablet: 4 products (2 rows × 2 cols)
    if (windowWidth < 1024) return 6   // Tablet: 6 products (2 rows × 3 cols)
    return 4                           // Desktop/PC: 4 products (1 row × 4 cols)
  }

  const sortedProducts = useMemo(() => {
    const sortableProducts = [...products]
    if (sortOrder === "price-asc") {
      sortableProducts.sort((a, b) => a.price - b.price)
    } else if (sortOrder === "price-desc") {
      sortableProducts.sort((a, b) => b.price - a.price)
    }
    return sortableProducts
  }, [products, sortOrder])

  if (!products || products.length === 0) {
    return <p className="text-center text-gray-500">No products found.</p>
  }

  const productsToShow = getProductsToShow()
  const displayedProducts = sortedProducts.slice(0, productsToShow)
  const hasMoreProducts = sortedProducts.length > productsToShow

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Showing {displayedProducts.length} of {products.length} products
        </p>
        <Select
          value={sortOrder}
          onValueChange={(value: "default" | "price-asc" | "price-desc") => setSortOrder(value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default</SelectItem>
            <SelectItem value="price-asc">Price: Low to High</SelectItem>
            <SelectItem value="price-desc">Price: High to Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Updated grid - starts with 2 columns on mobile */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
        {displayedProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {hasMoreProducts && (
        <div className="text-center pt-6">
          <Button 
            onClick={() => setShowAll(true)}
            variant="outline"
            size="lg"
          >
            Show All Products ({sortedProducts.length})
          </Button>
        </div>
      )}

      {showAll && (
        <div className="text-center pt-6">
          <Button 
            onClick={() => setShowAll(false)}
            variant="outline"
            size="lg"
          >
            Show Less
          </Button>
        </div>
      )}
    </div>
  )
}
