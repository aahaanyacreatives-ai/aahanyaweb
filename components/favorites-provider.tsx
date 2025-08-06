"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import type { Product } from "@/lib/types";

interface FavoritesContextType {
  favoriteProductIds: string[];
  favoriteProducts: Product[];
  addFavorite: (productId: string) => void;
  removeFavorite: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(
  undefined
);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favoriteProductIds, setFavoriteProductIds] = useState<string[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Load favorite IDs from localStorage on initial render
  useEffect(() => {
    const storedFavorites = localStorage.getItem("aahaanya_favorites");
    if (storedFavorites) {
      setFavoriteProductIds(JSON.parse(storedFavorites));
    }
  }, []);

  // Fetch all products via the API route to resolve favorite product details
  useEffect(() => {
    const fetchAllProducts = async () => {
      setLoadingProducts(true);
      try {
        const res = await fetch("/api/products");
        if (!res.ok) {
          throw new Error(`Failed to fetch products: ${res.status}`);
        }
        const productsData: Product[] = await res.json();
        setAllProducts(productsData);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchAllProducts();
  }, []);

  // Save favorite IDs to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("aahaanya_favorites", JSON.stringify(favoriteProductIds));
  }, [favoriteProductIds]);

  const addFavorite = (productId: string) => {
    setFavoriteProductIds((prevIds) => {
      if (!prevIds.includes(productId)) {
        return [...prevIds, productId];
      }
      return prevIds;
    });
  };

  const removeFavorite = (productId: string) => {
    setFavoriteProductIds((prevIds) => prevIds.filter((id) => id !== productId));
  };

  const isFavorite = (productId: string) => {
    return favoriteProductIds.includes(productId);
  };

  const favoriteProducts = allProducts.filter((product) =>
    favoriteProductIds.includes(product.id)
  );

  return (
    <FavoritesContext.Provider
      value={{
        favoriteProductIds,
        favoriteProducts,
        addFavorite,
        removeFavorite,
        isFavorite,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }
  return context;
}
