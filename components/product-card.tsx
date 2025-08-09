"use client"

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import type { Product } from "@/lib/types"
import { useCart } from "@/components/cart-provider"
import { toast } from "@/hooks/use-toast"
import { FavoriteButton } from "@/components/favorite-button"
import { useSession } from "next-auth/react"
import { ToastLoginAction } from "@/components/ToastLoginAction"

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart()
  const { status } = useSession()

  const handleAddToCart = () => {
    if (status !== "authenticated") {
      toast({
        title: "Login Required",
        description: "Please login to add items to your cart.",
        action: <ToastLoginAction />,
        variant: "destructive",
      })
      return
    }

    addItem(product, 1)
    toast({
      title: "Added to cart!",
      description: `${product.name} has been added to your cart.`,
    })
  }

  // Simulate an old price for demonstration, 20% higher than current price
  const oldPrice = (product.price * 1.2).toFixed(2)

  return (
    <div className="group relative overflow-hidden rounded-lg border bg-background shadow-sm">
      <Link href={`/products/${product.id}`} className="absolute inset-0 z-10" prefetch={false}>
        <span className="sr-only">View Product</span>
      </Link>
      <Image
        src={product.images[0] || "/placeholder.svg?height=300&width=300&query=jewelry%20product"}
        alt={product.name}
        width={300}
        height={300}
        className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
      />
      <div className="p-4">
        <h3 className="text-lg font-semibold">{product.name}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
        <div className="flex items-center justify-between mt-2">
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground line-through">₹{oldPrice}</span>
            <span className="text-xl font-bold">₹{product.price.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-0">
            <FavoriteButton productId={product.id} productName={product.name} />
            <Button
              onClick={handleAddToCart}
              size="default"
              className="transition-colors duration-200 ease-in-out"
            >
              Add to Cart
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
