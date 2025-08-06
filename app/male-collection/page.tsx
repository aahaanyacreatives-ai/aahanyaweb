// app/male-collection/page.tsx
'use client';

import { useState, useEffect, useMemo } from "react";
import type { Product } from "@/lib/types";
import { ProductList } from "@/components/product-list";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Slider } from "@/components/ui/slider";

export default function MaleCollectionPage() {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 2000]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/products");
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
        const productsData: Product[] = await res.json();
         // 🔍 DEBUG: Log all products and their categories
      console.log("All products:", productsData);
      console.log("Product categories:", productsData.map(p => ({ name: p.name, category: p.category })));
        setAllProducts(productsData);
      } catch (error) {
        console.error("Failed to fetch products:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const maleProducts = useMemo(() => {
    let filtered = allProducts.filter((p) => p.category === "MALE"); // ← UPPERCASE

    // Apply price range filter
    filtered = filtered.filter(
      (p) => p.price >= priceRange[0] && p.price <= priceRange[1]
    );

    return filtered;
  }, [allProducts, priceRange]);

  return (
    <div className="container mx-auto px-4 py-8 md:px-6 md:py-12">
      <h1 className="text-3xl font-bold mb-8 text-center">Male Collection</h1>
      
      <div className="flex justify-between items-center mb-4">
        <span className="text-gray-600">
          {loading ? "Loading..." : `${maleProducts.length} products`}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8">
        {/* Filter Sidebar */}
        <div className="hidden md:block space-y-6">
          <Accordion type="multiple" defaultValue={["price"]}>
            <AccordionItem value="price">
              <AccordionTrigger className="text-lg font-semibold">PRICE</AccordionTrigger>
              <AccordionContent className="pt-4">
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span>₹{priceRange[0]}</span>
                    <span>₹{priceRange[1]}</span>
                  </div>
                  <Slider
                    min={0}
                    max={2000}
                    step={10}
                    value={priceRange}
                    onValueChange={(value) => setPriceRange(value as [number, number])}
                    className="w-full"
                  />
                  <p className="text-sm text-muted-foreground">Adjust the price range.</p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="color">
              <AccordionTrigger className="text-lg font-semibold">COLOUR</AccordionTrigger>
              <AccordionContent className="pt-4">
                <p className="text-sm text-muted-foreground">Color filter coming soon.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="material">
              <AccordionTrigger className="text-lg font-semibold">MATERIAL</AccordionTrigger>
              <AccordionContent className="pt-4">
                <p className="text-sm text-muted-foreground">Material filter coming soon.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="brand">
              <AccordionTrigger className="text-lg font-semibold">BRAND</AccordionTrigger>
              <AccordionContent className="pt-4">
                <p className="text-sm text-muted-foreground">Brand filter coming soon.</p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Product List */}
        <div className="md:col-span-1">
          {loading ? (
            <p className="text-center text-gray-500">Loading products...</p>
          ) : maleProducts.length > 0 ? (
            <ProductList products={maleProducts} />
          ) : (
            <p className="text-center text-gray-500">
              No products found in this collection yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
