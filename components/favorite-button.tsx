"use client";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { useFavorites } from "@/components/favorites-provider";
import { toast } from "@/hooks/use-toast";
import { useSession } from "next-auth/react";
import { ToastLoginAction } from "@/components/ToastLoginAction";

export interface FavoriteButtonProps {
  productId: string;
  productName: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

export function FavoriteButton({
  productId,
  productName,
  variant = "ghost",
  size = "icon",
}: FavoriteButtonProps) {
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();
  const favorited = isFavorite(productId);
  const { status } = useSession();

  const handleToggleFavorite = async () => {
    if (status !== "authenticated") {
      toast({
        title: "Login Required",
        description: "Please login to use favorites.",
        action: <ToastLoginAction />,
        variant: "destructive",
      });
      return;
    }
    try {
      if (favorited) {
        await removeFavorite(productId);
        toast({
          title: "Removed from favorites!",
          description: `${productName} has been removed from your favorites.`,
        });
      } else {
        await addFavorite(productId);
        toast({
          title: "Added to favorites!",
          description: `${productName} has been added to your favorites.`,
        });
      }
    } catch {
      toast({
        title: "Favorite error!",
        description: "Could not update favorites, please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleToggleFavorite}
      aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
      className={favorited ? "text-primary hover:text-primary" : "text-muted-foreground hover:text-primary"}
    >
      <Heart className={favorited ? "fill-current" : ""} />
      <span className="sr-only">
        {favorited ? "Remove from favorites" : "Add to favorites"}
      </span>
    </Button>
  );
}
