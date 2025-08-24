"use client";
import {
  createContext, useContext, useState, useEffect, type ReactNode,
  Dispatch, SetStateAction
} from "react";
import { useSession } from "next-auth/react";
import { toast } from "@/hooks/use-toast";

export interface FavoritesContextType {
  favoriteProductIds: string[];
  addFavorite: (productId: string) => void;
  removeFavorite: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
  setFavoriteProductIds: Dispatch<SetStateAction<string[]>>;
  isLoading: boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favoriteProductIds, setFavoriteProductIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { status } = useSession();

  // ✅ FIXED: Load favorites on mount or auth change
  useEffect(() => {
    const loadFavorites = async () => {
      setIsLoading(true);
      
      try {
        if (status === "authenticated") {
          console.log('[DEBUG] Loading favorites for authenticated user');
          const res = await fetch("/api/favorites");
          const data = await res.json();
          
          console.log('[DEBUG] Favorites API response:', data);
          
          if (res.ok && Array.isArray(data.favorites)) {
            // ✅ FIXED: Extract productId from the simple structure
            const productIds = data.favorites
              .map((fav: any) => fav.productId)
              .filter(Boolean);
            
            console.log('[DEBUG] Extracted favorite product IDs:', productIds);
            setFavoriteProductIds(productIds);
          } else {
            console.error('[DEBUG] Invalid favorites response:', data);
            setFavoriteProductIds([]);
          }
        } else if (status === "unauthenticated") {
          // Guest user - load from localStorage
          console.log('[DEBUG] Loading favorites from localStorage for guest');
          const stored = localStorage.getItem("aahaanya_favorites");
          const parsedFavorites = stored ? JSON.parse(stored) : [];
          setFavoriteProductIds(Array.isArray(parsedFavorites) ? parsedFavorites : []);
        }
      } catch (error) {
        console.error('[DEBUG] Error loading favorites:', error);
        setFavoriteProductIds([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (status !== "loading") {
      loadFavorites();
    }
  }, [status]);

  // ✅ Save to localStorage for guests
  useEffect(() => {
    if (status === "unauthenticated" && !isLoading) {
      localStorage.setItem("aahaanya_favorites", JSON.stringify(favoriteProductIds));
    }
  }, [favoriteProductIds, status, isLoading]);

  // ✅ FIXED: Add favorite with proper error handling
  const addFavorite = async (productId: string) => {
    console.log('[DEBUG] Adding favorite:', productId);
    
    try {
      if (status === "authenticated") {
        const response = await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId }),
        });

        const result = await response.json();
        console.log('[DEBUG] Add favorite response:', result);

        if (response.ok) {
          // ✅ Optimistically update UI first
          setFavoriteProductIds(prev =>
            prev.includes(productId) ? prev : [...prev, productId]
          );
          
          toast({
            title: "Added to Favorites",
            description: "Product added to your favorites successfully.",
          });
        } else {
          throw new Error(result.error || 'Failed to add favorite');
        }
      } else {
        // Guest user
        setFavoriteProductIds(prev =>
          prev.includes(productId) ? prev : [...prev, productId]
        );
        
        toast({
          title: "Added to Favorites",
          description: "Product added to your favorites (stored locally).",
        });
      }
    } catch (error) {
      console.error('[DEBUG] Error adding favorite:', error);
      toast({
        title: "Error",
        description: "Failed to add product to favorites. Please try again.",
        variant: "destructive",
      });
    }
  };

  // ✅ FIXED: Remove favorite with proper error handling
  const removeFavorite = async (productId: string) => {
    console.log('[DEBUG] Removing favorite:', productId);
    
    try {
      if (status === "authenticated") {
        const response = await fetch(`/api/favorites?productId=${productId}`, { 
          method: "DELETE" 
        });

        const result = await response.json();
        console.log('[DEBUG] Remove favorite response:', result);

        if (response.ok) {
          // ✅ Optimistically update UI first
          setFavoriteProductIds(prev => prev.filter(id => id !== productId));
          
          toast({
            title: "Removed from Favorites",
            description: "Product removed from your favorites.",
          });
        } else {
          throw new Error(result.error || 'Failed to remove favorite');
        }
      } else {
        // Guest user
        setFavoriteProductIds(prev => prev.filter(id => id !== productId));
        
        toast({
          title: "Removed from Favorites",
          description: "Product removed from your favorites.",
        });
      }
    } catch (error) {
      console.error('[DEBUG] Error removing favorite:', error);
      toast({
        title: "Error",
        description: "Failed to remove product from favorites. Please try again.",
        variant: "destructive",
      });
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
        isLoading,
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
