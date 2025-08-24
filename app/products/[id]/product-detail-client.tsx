// C:\Users\Asus\OneDrive\Desktop\Aahanya\app\products\[id]\product-detail-client.tsx
"use client";
import type React from "react";
import { useCart } from "@/components/cart-provider";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FavoriteButton } from "@/components/favorite-button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useSession } from "next-auth/react";
import { ToastLoginAction } from "@/components/ToastLoginAction";
import type { Product } from "@/lib/types";
import { ProductCarousel } from "@/components/product-carousel";

interface ProductDetailClientProps {
  initialProduct: Product;
}

export default function ProductDetailClient({ initialProduct }: ProductDetailClientProps) {
  const [product] = useState(initialProduct)
  const [customSize, setCustomSize] = useState("")
  const [selectedRingSize, setSelectedRingSize] = useState<string | undefined>(undefined)
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
    if (!product) return;

    let sizeToPass: string | undefined = undefined

    if (product.category === "METAL_ART" && product.type === "metal art" && customSize) {
      sizeToPass = customSize
    } else if (product.category === "MALE" || product.category === "FEMALE") {
      sizeToPass = selectedRingSize // optional
    }

    addItem(product, 1, sizeToPass, undefined) // No image passing from client side
    toast({
      title: "Added to cart",
      description: "Product has been added to your cart.",
    })
  }

  // Handle WhatsApp redirect for Eternal Steel Art
  const handleWhatsAppRedirect = () => {
    const phoneNumber = "919930536206"; // Indian number format
    const message = `Hi! I'm interested in ${product.name} - ${product.description}. Price: ₹${product.price}`;
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  }

  if (!product) return null

  // Check if this is Eternal Steel Art
  const isEternalSteelArt = product.category === "METAL_ART" && product.type === "eternal steel art";
  const isRegularMetalArt = product.category === "METAL_ART" && product.type === "metal art";

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid gap-8 md:grid-cols-2">
        {/* Product Images Carousel */}
        <div className="space-y-4">
          <ProductCarousel images={product.images} alt={product.name} />
        </div>

        {/* Product Details */}
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">{product.name}</h1>
            <p className="text-2xl font-semibold">₹{product.price.toFixed(2)}</p>
          </div>

          <p className="text-gray-600">{product.description}</p>

          {/* Only Custom Size for Regular Metal Art - NO IMAGE UPLOAD */}
          {isRegularMetalArt && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="custom-size">Custom Size (in inches)</Label>
                <Input
                  id="custom-size"
                  placeholder="e.g., 12x24"
                  value={customSize}
                  onChange={(e) => setCustomSize(e.target.value)}
                />
              </div>
            </div>
          )}

          
          <div className="flex gap-4">
            {/* Conditional Button Rendering */}
            {isEternalSteelArt ? (
              // Click to Buy button for Eternal Steel Art
              <Button
                onClick={handleWhatsAppRedirect}
                className="bg-green-600 hover:bg-green-700"
              >
                Click to Buy
              </Button>
            ) : (
              // Regular Add to Cart button for all other products
              <Button
                onClick={handleAddToCart}
                disabled={
                  (isRegularMetalArt && !customSize)
                }
              >
                Add to Cart
              </Button>
            )}
            <FavoriteButton productId={product.id} productName={product.name} />
          </div>
        </div>
      </div>
    </div>
  )
}
