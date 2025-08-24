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
  setCartItems: React.Dispatch<React.SetStateAction<CartItem[]>>;
  isLoading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { status } = useSession();

  // ✅ FIXED: Enhanced normalize function to fetch product details
  const normalizeCartItems = async (data: any): Promise<CartItem[]> => {
    if (!Array.isArray(data.cart)) return [];

    const validItems = data.cart.filter((it: any) => it.productId != null);
    
    // Fetch product details for each cart item
    const normalizedItems = await Promise.all(
      validItems.map(async (it: any) => {
        let product = null;
        
        try {
          // Fetch product details from API
          const productResponse = await fetch(`/api/products?id=${it.productId}`);
          if (productResponse.ok) {
            product = await productResponse.json();
          }
        } catch (error) {
          console.error(`Error fetching product ${it.productId}:`, error);
        }

        return {
          id: it.id ?? '',
          userId: it.userId ?? 'guest',
          productId: it.productId ?? '',
          quantity: it.quantity ?? 1,
          customSize: it.customSize,
          customImage: it.customImage,
          createdAt: it.createdAt ?? new Date(),
          updatedAt: it.updatedAt ?? new Date(),
          product: product || {
            id: it.productId,
            name: 'Unknown Product',
            price: 0,
            images: [],
            description: '',
            category: '',
            stock: 0
          }
        } as CartItem;
      })
    );

    return normalizedItems;
  };

  // ✅ FIXED: Sync cart with product details
  useEffect(() => {
    const loadCart = async () => {
      setIsLoading(true);
      
      try {
        if (status === "authenticated") {
          // Fetch from server
          const res = await fetch("/api/cart");
          const data = await res.json();
          const normalizedItems = await normalizeCartItems(data);
          setCartItems(normalizedItems);
        } else if (status === "unauthenticated") {
          // Guest: get from localStorage
          const storedCart = localStorage.getItem("aahaanya_cart");
          if (storedCart) {
            const parsedCart = JSON.parse(storedCart);
            const normalizedItems = await normalizeCartItems({ cart: parsedCart });
            setCartItems(normalizedItems);
          } else {
            setCartItems([]);
          }
        }
      } catch (error) {
        console.error("Failed to load cart:", error);
        setCartItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (status !== "loading") {
      loadCart();
    }
  }, [status]);

  // Save to localStorage for guests only
  useEffect(() => {
    if (status === "unauthenticated" && !isLoading) {
      const cartData = cartItems.map(item => ({
        id: item.id,
        userId: item.userId,
        productId: item.productId,
        quantity: item.quantity,
        customSize: item.customSize,
        customImage: item.customImage,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      }));
      localStorage.setItem("aahaanya_cart", JSON.stringify(cartData));
    }
  }, [cartItems, status, isLoading]);

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
      const normalizedItems = await normalizeCartItems(data);
      setCartItems(normalizedItems);
    } else {
      // Guest: update local state with product details
      setCartItems((prev) => {
        const existingItem = prev.find(
          (item) =>
            item.productId === product.id &&
            item.customSize === customSize &&
            item.customImage === customImage
        );
        
        if (existingItem) {
          return prev.map((item) =>
            item.productId === product.id &&
            item.customSize === customSize &&
            item.customImage === customImage
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
        } else {
          const newItem: CartItem = {
            id: Date.now().toString(),
            userId: 'guest',
            productId: product.id,
            quantity,
            customSize,
            customImage,
            createdAt: new Date(),
            updatedAt: new Date(),
            product: product
          };
          return [...prev, newItem];
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
      const normalizedItems = await normalizeCartItems(data);
      setCartItems(normalizedItems);
    } else {
      setCartItems((prev) =>
        prev.filter(
          (item) =>
            !(item.productId === productId && (!customSize || item.customSize === customSize))
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
      const normalizedItems = await normalizeCartItems(data);
      setCartItems(normalizedItems);
    } else {
      setCartItems((prev) =>
        prev.map((item) =>
          item.productId === productId && (!customSize || item.customSize === customSize)
            ? { ...item, quantity: Math.max(1, quantity), updatedAt: new Date() }
            : item
        )
      );
    }
  };

  const clearCart: CartContextType["clearCart"] = async () => {
    if (status === "authenticated") {
      await fetch("/api/cart", { method: "DELETE" });
    }
    setCartItems([]);
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
        isLoading,
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
