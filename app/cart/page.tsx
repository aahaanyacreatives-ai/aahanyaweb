"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCart } from "@/components/cart-provider";
import { Trash2 } from "lucide-react";

export default function CartPage() {
  const { cartItems, removeItem, updateQuantity, clearCart, isLoading } = useCart();

  // ✅ FIXED: Safe total calculation with optional chaining
  const subtotal = cartItems?.reduce((sum, item) => {
    const price = item?.product?.price ?? 0;
    const quantity = item?.quantity ?? 1;
    return sum + (price * quantity);
  }, 0) ?? 0;

  const shipping = 50.0;
  const total = subtotal + shipping;

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 md:px-6 md:py-12">
        <h1 className="text-3xl font-bold mb-8 text-center">Your Shopping Cart</h1>
        <div className="text-center">
          <p>Loading cart...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:px-6 md:py-12">
      <h1 className="text-3xl font-bold mb-8 text-center">Your Shopping Cart</h1>
      {!cartItems || cartItems.length === 0 ? (
        <div className="text-center space-y-4">
          <p className="text-lg text-gray-500">Your cart is empty.</p>
          <Link href="/" passHref>
            <Button>Continue Shopping</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px] hidden sm:table-cell">Image</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-center">Quantity</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cartItems.map((item) => (
                  <TableRow key={`${item.productId}-${item.customSize || ''}-${item.customImage || ''}`}>
                    <TableCell className="hidden sm:table-cell">
                      <Image
                        src={
                          item.customImage ||
                          (item?.product?.images && item.product.images.length > 0 
                            ? item.product.images[0] 
                            : "/placeholder.svg?height=64&width=64&query=jewelry%20cart%20item"
                          )
                        }
                        width={64}
                        height={64}
                        alt={item?.product?.name ?? "Product"}
                        className="aspect-square rounded-md object-cover"
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link 
                        href={`/products/${item.productId}`} 
                        className="hover:underline" 
                        prefetch={false}
                      >
                        {item?.product?.name ?? "Unknown Product"}
                      </Link>
                      {item.customSize && (
                        <p className="text-xs text-muted-foreground">Size: {item.customSize}</p>
                      )}
                      {item.customImage && (
                        <p className="text-xs text-muted-foreground">Custom Image Added</p>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => {
                          const newQuantity = parseInt(e.target.value) || 1;
                          updateQuantity(item.productId, newQuantity, item.customSize);
                        }}
                        className="w-20 text-center"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      ₹{item?.product?.price?.toFixed(2) ?? "0.00"}
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeItem(item.productId, item.customSize)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Remove</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="space-y-4">
            <div className="border rounded-lg p-6 space-y-4">
              <h2 className="text-2xl font-bold">Order Summary</h2>
              <div className="flex justify-between">
                <span>Subtotal ({cartItems.length} items)</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>₹{shipping.toFixed(2)}</span>
              </div>
              <div className="border-t pt-4 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
              <Link href="/checkout" passHref>
                <Button className="w-full">Proceed to Checkout</Button>
              </Link>
              <Button variant="outline" className="w-full bg-transparent" onClick={clearCart}>
                Clear Cart
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
