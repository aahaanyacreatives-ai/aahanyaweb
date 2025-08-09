"use client";
import { useSession } from "next-auth/react";
import { useCart } from "@/components/cart-provider";
import { useFavorites } from "@/components/favorites-provider";
import { useEffect } from "react";

export function SyncUserCartFavorites() {
  const { data: session } = useSession();
  const { setCartItems } = useCart();
  const { setFavoriteProductIds } = useFavorites();

  useEffect(() => {
    if (!session?.user?.id) {
      setCartItems([]);
      setFavoriteProductIds([]);
      return;
    }

    fetch("/api/cart")
      .then(res => res.json())
      .then(data => setCartItems(Array.isArray(data.cart) ? data.cart : []))
      .catch(() => setCartItems([]));

    fetch("/api/favorites")
      .then(res => res.json())
      .then(data =>
        setFavoriteProductIds(
          Array.isArray(data.favorites)
            ? data.favorites.map((fav: { product: { id: string } }) => fav.product?.id ?? "").filter(Boolean)
            : []
        ))
      .catch(() => setFavoriteProductIds([]));
  }, [session?.user?.id, setCartItems, setFavoriteProductIds]);

  return null;
}
