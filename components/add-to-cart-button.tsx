"use client"

import { Button } from "@/components/ui/button"
import { useCart } from "@/components/cart-provider"
import { toast } from "@/hooks/use-toast"
import type { Product } from "@/lib/types"
import { useSession } from "next-auth/react" // Import useSession
import { useRouter } from "next/navigation" // Import useRouter

interface AddToCartButtonProps {
  product: Product
}

export function AddToCartButton({ product }: AddToCartButtonProps) {
  const { addItem } = useCart()
  const { data: session, status } = useSession() // Get session status
  const router = useRouter()

  const handleAddToCart = () => {
    if (status !== "authenticated") {
      toast({
        title: "Login Required",
        description: "Please log in to add items to your cart.",
        variant: "destructive",
      })
      router.push("/login") // Redirect to login page
      return
    }

    addItem(product, 1)
    toast({
      title: "Added to cart!",
      description: `${product.name} has been added to your cart.`,
    })
  }

  return (
    <Button onClick={handleAddToCart} size="lg">
      Add to Cart
    </Button>
  )
}
