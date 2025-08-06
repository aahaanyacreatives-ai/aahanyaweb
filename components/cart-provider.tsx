"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { CartItem, Product } from "@/lib/types"

interface CartContextType {
  cartItems: CartItem[]
  addItem: (product: Product, quantity: number, customSize?: string, customImage?: string) => void // Updated signature
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([])

  // Load cart from localStorage on initial render
  useEffect(() => {
    const storedCart = localStorage.getItem("aahaanya_cart")
    if (storedCart) {
      setCartItems(JSON.parse(storedCart))
    }
  }, [])

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("aahaanya_cart", JSON.stringify(cartItems))
  }, [cartItems])

  const addItem = (product: Product, quantity: number, customSize?: string, customImage?: string) => {
    setCartItems((prevItems) => {
      // For customizable items, we treat each customization as a unique cart item
      // To avoid merging different customizations of the same product
      const existingItem = prevItems.find(
        (item) => item.product.id === product.id && item.customSize === customSize && item.customImage === customImage,
      )

      if (existingItem) {
        return prevItems.map((item) =>
          item.product.id === product.id && item.customSize === customSize && item.customImage === customImage
            ? { ...item, quantity: item.quantity + quantity }
            : item,
        )
      } else {
        return [...prevItems, { product, quantity, customSize, customImage }]
      }
    })
  }

  const removeItem = (productId: string) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.product.id !== productId))
  }

  const updateQuantity = (productId: string, quantity: number) => {
    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.product.id === productId
          ? { ...item, quantity: Math.max(1, quantity) } // Ensure quantity is at least 1
          : item,
      ),
    )
  }

  const clearCart = () => {
    setCartItems([])
  }

  return (
    <CartContext.Provider value={{ cartItems, addItem, removeItem, updateQuantity, clearCart }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}
