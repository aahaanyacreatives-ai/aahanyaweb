"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import type { CartItem, Product } from "@/lib/types";

interface CartContextType {
  cartItems: CartItem[];
  addItem: (product: Product, quantity: number, customSize?: string, customImage?: string) => Promise<void>;
  removeItem: (productId: string, customSize?: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number, customSize?: string) => Promise<void>;
  clearCart: () => Promise<void>;
  setCartItems: React.Dispatch<React.SetStateAction<CartItem[]>>; // for rare edge cases
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const { status } = useSession();

  // Helper function to normalize cart data safely
  const normalizeCartItems = (data: any): CartItem[] => {
    if (!Array.isArray(data.cart)) return [];

    return data.cart
      .filter((it: any) => it.product != null) // Skip items with null/undefined product
      .map((it: any) => ({
        product: {
          ...it.product,
          id: it.product?._id?.toString?.() ?? it.product?.id ?? '', // Safe access with fallback
        },
        quantity: it.quantity,
        customSize: it.customSize,
        customImage: it.customImage,
      }));
  };

  // Sync cart from backend/localStorage on mount or login/logout
  useEffect(() => {
    if (status === "authenticated") {
      // 🟢 Fetch from server
      fetch("/api/cart")
        .then((res) => res.json())
        .then((data) => {
          setCartItems(normalizeCartItems(data));
        })
        .catch((error) => {
          console.error("Failed to fetch cart:", error);
          setCartItems([]);
        });
    } else {
      // 🟡 Guest: get from localStorage
      const storedCart = localStorage.getItem("aahaanya_cart");
      setCartItems(storedCart ? JSON.parse(storedCart) : []);
    }
  }, [status]);

  // Save to localStorage for guests only
  useEffect(() => {
    if (status !== "authenticated") {
      localStorage.setItem("aahaanya_cart", JSON.stringify(cartItems));
    }
  }, [cartItems, status]);

  // Core methods -- all now sync with backend if logged in

  const addItem: CartContextType["addItem"] = async (product, quantity, customSize, customImage) => {
    if (status === "authenticated") {
      await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          quantity,
          customSize,
          customImage,
        }),
      });
      // Re-fetch cart from backend
      const res = await fetch("/api/cart");
      const data = await res.json();
      setCartItems(normalizeCartItems(data));
    } else {
      // Guest: just update local state
      setCartItems((prev) => {
        const existingItem = prev.find(
          (item) =>
            item.product.id === product.id &&
            item.customSize === customSize &&
            item.customImage === customImage
        );
        if (existingItem) {
          return prev.map((item) =>
            item.product.id === product.id &&
            item.customSize === customSize &&
            item.customImage === customImage
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
        } else {
          return [...prev, { product, quantity, customSize, customImage }];
        }
      });
    }
  };

  const removeItem: CartContextType["removeItem"] = async (productId, customSize) => {
    if (status === "authenticated") {
      const url = `/api/cart?productId=${productId}` + (customSize ? `&customSize=${encodeURIComponent(customSize)}` : "");
      await fetch(url, { method: "DELETE" });
      // Re-sync
      const res = await fetch("/api/cart");
      const data = await res.json();
      setCartItems(normalizeCartItems(data));
    } else {
      setCartItems((prev) =>
        prev.filter(
          (item) =>
            !(item.product.id === productId && (!customSize || item.customSize === customSize))
        )
      );
    }
  };

  const updateQuantity: CartContextType["updateQuantity"] = async (productId, quantity, customSize) => {
    if (status === "authenticated") {
      await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          quantity,
          customSize,
        }),
      });
      // Re-sync
      const res = await fetch("/api/cart");
      const data = await res.json();
      setCartItems(normalizeCartItems(data));
    } else {
      setCartItems((prev) =>
        prev.map((item) =>
          item.product.id === productId && (!customSize || item.customSize === customSize)
            ? { ...item, quantity: Math.max(1, quantity) }
            : item
        )
      );
    }
  };

  const clearCart: CartContextType["clearCart"] = async () => {
    if (status === "authenticated") {
      // Assuming a DELETE endpoint exists to clear the entire cart; implement if not
      await fetch("/api/cart", { method: "DELETE" });
      setCartItems([]);
    } else {
      setCartItems([]);
    }
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        setCartItems,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
