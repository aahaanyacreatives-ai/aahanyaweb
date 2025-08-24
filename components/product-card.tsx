// components/product-card.tsx - CLEANED UP WITH MINOR FIXES (e.g., TypeScript, optional chaining)

'use client';

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Product } from "@/lib/types";
import { useCart } from "@/components/cart-provider";
import { toast } from "@/hooks/use-toast";
import { useSession } from "next-auth/react";
import { ToastLoginAction } from "@/components/ToastLoginAction";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart();
  const { status } = useSession();

  const handleAddToCart = () => {
    if (status !== "authenticated") {
      toast({
        title: "Login Required",
        description: "Please login to add items to your cart.",
        action: <ToastLoginAction />,
        variant: "destructive",
      });
      return;
    }

    addItem(product, 1);
    toast({
      title: "Added to cart!",
      description: `${product.name} has been added to your cart.`,
    });
  };

  // Simulate an old price for demonstration, 20% higher than current price
  const oldPrice = (product.price * 1.2).toFixed(2);

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
      <div className="p-3 sm:p-4 space-y-3">
        {/* Product Info */}
        <div className="space-y-1">
          <h3 className="text-base sm:text-lg font-semibold line-clamp-1">{product.name}</h3>
          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{product.description}</p>
        </div>
        
        {/* Price Section */}
        <div className="space-y-0.5">
          <span className="text-xs sm:text-sm text-muted-foreground line-through">₹{oldPrice}</span>
          <div className="text-lg sm:text-xl font-bold text-primary">₹{product.price.toFixed(2)}</div>
        </div>
        
        {/* Add to Cart Button - Clean & Centered */}
        <div className="pt-2">
          <Button
            onClick={handleAddToCart}
            className="
              w-full 
              relative z-20 
              px-4 py-2 
              text-sm sm:text-base 
              font-medium 
              transition-all duration-200 
              hover:shadow-md
            "
            size="default"
          >
            Add to Cart
          </Button>
        </div>
      </div>
    </div>
  );
}
