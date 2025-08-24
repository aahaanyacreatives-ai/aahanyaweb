"use client";

import { useFavorites } from "@/components/favorites-provider";
import { ProductList } from "@/components/product-list";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import type { Product } from "@/lib/types";

export default function FavoritesPage() {
  const { favoriteProductIds, isLoading: favoritesLoading } = useFavorites();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);

  useEffect(() => {
    const fetchAllProducts = async () => {
      try {
        setProductsLoading(true);
        const res = await fetch("/api/products");
        const data = await res.json();
        setAllProducts(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching products:', error);
        setAllProducts([]);
      } finally {
        setProductsLoading(false);
      }
    };

    fetchAllProducts();
  }, []);

  // ✅ Filter products that are in favorites
  const favoriteProducts = allProducts.filter(product =>
    favoriteProductIds.includes(product.id)
  );

  const isLoading = favoritesLoading || productsLoading;

  return (
    <div className="container mx-auto px-4 py-8 md:px-6 md:py-12">
      <h1 className="text-3xl font-bold mb-8 text-center">Your Favorite Products</h1>
      
      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">
          Loading your favorites...
        </div>
      ) : favoriteProducts.length === 0 ? (
        <div className="text-center space-y-4">
          <p className="text-lg text-gray-500">
            You haven't added any products to your favorites yet.
          </p>
          <Link href="/" passHref>
            <Button>Start Browsing</Button>
          </Link>
        </div>
      ) : (
        <>
          <p className="text-center mb-6 text-muted-foreground">
            {favoriteProducts.length} favorite product{favoriteProducts.length !== 1 ? 's' : ''}
          </p>
          <ProductList products={favoriteProducts} />
        </>
      )}
    </div>
  );
}
