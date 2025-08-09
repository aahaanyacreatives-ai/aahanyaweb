"use client";

import { Button } from "@/components/ui/button";
import { useCart } from "@/components/cart-provider";
import { toast } from "@/hooks/use-toast";
import type { Product } from "@/lib/types";
import { useSession } from "next-auth/react";
import { ToastLoginAction } from "@/components/ToastLoginAction";

export function AddToCartButton({ product }: { product: Product }) {
  const { addItem } = useCart();
  const { status } = useSession();

  const handleAddToCart = async () => {
    if (status !== "authenticated") {
      toast({
        title: "Login Required",
        description: "Please login to add items to your cart.",
        action: <ToastLoginAction />,
        variant: "destructive",
      });
      return;
    }
    try {
      await addItem(product, 1);
      toast({
        title: "Added to cart!",
        description: `${product.name} has been added to your cart.`,
      });
    } catch {
      toast({
        title: "Cart error!",
        description: "Unable to add to cart, please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Button onClick={handleAddToCart} size="lg">
      Add to Cart
    </Button>
  );
}
