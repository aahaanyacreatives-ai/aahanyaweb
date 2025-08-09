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
  const [customImage, setCustomImage] = useState<string | undefined>(undefined)
  const [selectedRingSize, setSelectedRingSize] = useState<string | undefined>(undefined)
  const { addItem } = useCart()
  const { status } = useSession()

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => setCustomImage(reader.result as string)
      reader.readAsDataURL(file)
    } else {
      setCustomImage(undefined)
    }
  }

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
    let imageToPass: string | undefined = undefined

    if (product.category === "METAL_ART" && customSize) {
      sizeToPass = customSize
      imageToPass = customImage
    } else if (product.category === "MALE" || product.category === "FEMALE") {
      sizeToPass = selectedRingSize // optional
    }

    addItem(product, 1, sizeToPass, imageToPass)
    toast({
      title: "Added to cart",
      description: "Product has been added to your cart.",
    })
  }

  if (!product) return null

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

          {/* Custom Size and Image Upload for Metal Art */}
          {product.category === "METAL_ART" && (
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
              <div className="space-y-2">
                <Label htmlFor="custom-image">Upload Custom Image</Label>
                <Input
                  id="custom-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                />
                {customImage && (
                  <div className="relative h-32 w-32">
                    <img
                      src={customImage}
                      alt="Custom design preview"
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <Button
              onClick={handleAddToCart}
              disabled={
                (product.category === "METAL_ART" && !customSize)
              }
            >
              Add to Cart
            </Button>
            <FavoriteButton productId={product.id} productName={product.name} />
          </div>
        </div>
      </div>
    </div>
  )
}
