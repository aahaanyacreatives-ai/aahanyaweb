"use client";
import {
  createContext, useContext, useState, useEffect, type ReactNode,
  Dispatch, SetStateAction
} from "react";
import { useSession } from "next-auth/react";

export interface FavoritesContextType {
  favoriteProductIds: string[];
  addFavorite: (productId: string) => void;
  removeFavorite: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
  setFavoriteProductIds: Dispatch<SetStateAction<string[]>>;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favoriteProductIds, setFavoriteProductIds] = useState<string[]>([]);
  const { status } = useSession();

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/favorites")
        .then(res => res.json())
        .then(data => {
          setFavoriteProductIds(
            Array.isArray(data.favorites)
              ? data.favorites.map(
                  (fav: { product: { _id: string } }) => fav.product?._id ?? ""  // NOT "id", use "_id"
                ).filter(Boolean)
              : []
          );
        }).catch(() => setFavoriteProductIds([]));
    } else {
      // For guests/unauthenticated
      const stored = localStorage.getItem("aahaanya_favorites");
      setFavoriteProductIds(stored ? JSON.parse(stored) : []);
    }
  }, [status]);

  useEffect(() => {
    if (status !== "authenticated") {
      localStorage.setItem("aahaanya_favorites", JSON.stringify(favoriteProductIds));
    }
  }, [favoriteProductIds, status]);

  const addFavorite = async (productId: string) => {
    if (status === "authenticated") {
      await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      // Always re-sync
      const res = await fetch("/api/favorites");
      const data = await res.json();
      setFavoriteProductIds(
        Array.isArray(data.favorites)
          ? data.favorites.map(
              (fav: { product: { _id: string } }) => fav.product?._id ?? ""
            ).filter(Boolean)
          : []
      );
    } else {
      setFavoriteProductIds(prev =>
        prev.includes(productId) ? prev : [...prev, productId]
      );
    }
  };

  const removeFavorite = async (productId: string) => {
    if (status === "authenticated") {
      await fetch(`/api/favorites?productId=${productId}`, { method: "DELETE" });
      const res = await fetch("/api/favorites");
      const data = await res.json();
      setFavoriteProductIds(
        Array.isArray(data.favorites)
          ? data.favorites.map(
              (fav: { product: { _id: string } }) => fav.product?._id ?? ""
            ).filter(Boolean)
          : []
      );
    } else {
      setFavoriteProductIds(prev => prev.filter(id => id !== productId));
    }
  };

  const isFavorite = (productId: string) => favoriteProductIds.includes(productId);

  return (
    <FavoritesContext.Provider
      value={{
        favoriteProductIds,
        addFavorite,
        removeFavorite,
        isFavorite,
        setFavoriteProductIds,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}


export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within a FavoritesProvider");
  return ctx;
}
