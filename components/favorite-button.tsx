"use client"

import { Button } from "@/components/ui/button"
import { Heart } from "lucide-react"
import { useFavorites } from "@/components/favorites-provider"
import { toast } from "@/hooks/use-toast"

interface FavoriteButtonProps {
  productId: string
  productName: string
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | null | undefined
  size?: "default" | "sm" | "lg" | "icon" | null | undefined
}

export function FavoriteButton({ productId, productName, variant = "ghost", size = "icon" }: FavoriteButtonProps) {
  const { isFavorite, addFavorite, removeFavorite } = useFavorites()
  const favorited = isFavorite(productId)

  const handleToggleFavorite = () => {
    if (favorited) {
      removeFavorite(productId)
      toast({
        title: "Removed from favorites!",
        description: `${productName} has been removed from your favorites.`,
      })
    } else {
      addFavorite(productId)
      toast({
        title: "Added to favorites!",
        description: `${productName} has been added to your favorites.`,
      })
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleToggleFavorite}
      aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
      className={favorited ? "text-primary hover:text-primary" : "text-muted-foreground hover:text-primary"}
    >
      <Heart className={favorited ? "fill-current" : ""} />
      <span className="sr-only">{favorited ? "Remove from favorites" : "Add to favorites"}</span>
    </Button>
  )
}
