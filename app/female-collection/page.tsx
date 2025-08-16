// C:\Users\Asus\OneDrive\Desktop\Aahanya\app\female-collection\page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import type { Product } from "@/lib/types";
import { ProductList } from "@/components/product-list";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

const FEMALE_TYPES = [
  "all",
  "rings",
  "earrings",
  "necklace",
  "scrunchies",
  "bracelet",
  "mini purse",
];

export default function FemaleCollectionPage() {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 2000]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/products");
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
        const productsData: Product[] = await res.json();
        setAllProducts(productsData);
      } catch (error) {
        console.error("Failed to fetch products:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // Core Filtering logic (with console.log for debug)
  const femaleProducts = useMemo(() => {
    // 1. Filter only FEMALE products (case-insensitive)
    let filtered = allProducts.filter(
      (p) => (p.category || "").toString().toLowerCase() === "female"
    );

    // 2. Filter by product type if selectedType !== "all"
    if (selectedType !== "all") {
      filtered = filtered.filter((p) =>
        (p.type || "").toLowerCase() === selectedType.toLowerCase()
      );
    }

    // 3. Price filter
    filtered = filtered.filter(
      (p) => p.price >= priceRange[0] && p.price <= priceRange[1]
    );

    return filtered;
  }, [allProducts, selectedType, priceRange]);

  return (
    <div className="container mx-auto px-4 py-8 md:px-6 md:py-12">
      <h1 className="text-3xl font-bold mb-8 text-center">
        Female Collection
      </h1>

      {/* Top Filter Dropdown */}
      <div className="flex justify-between items-center mb-4">
        <span className="text-gray-600">
          {loading ? "Loading..." : `${femaleProducts.length} products`}
        </span>
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            {FEMALE_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type[0].toUpperCase() + type.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8">
        {/* Sidebar Filter */}
        <div className="hidden md:block space-y-6">
          <Accordion type="multiple" defaultValue={["price", "category"]}>
            {/* Price Filter */}
            <AccordionItem value="price">
              <AccordionTrigger className="text-lg font-semibold">
                PRICE
              </AccordionTrigger>
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
                    onValueChange={(value) =>
                      setPriceRange(value as [number, number])
                    }
                    className="w-full"
                  />
                  <p className="text-sm text-muted-foreground">
                    Adjust the price range.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
            {/* Product Category/Type Filter */}
            <AccordionItem value="category">
              <AccordionTrigger className="text-lg font-semibold">
                PRODUCT CATEGORY
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <div className="space-y-2">
                  {FEMALE_TYPES.map((type) => (
                    <div key={type} className="flex items-center">
                      <input
                        type="radio"
                        id={`type-${type}`}
                        name="product-type"
                        value={type}
                        checked={selectedType === type}
                        onChange={() => setSelectedType(type)}
                        className="mr-2 accent-primary"
                      />
                      <Label htmlFor={`type-${type}`}>
                        {type === "all"
                          ? "All"
                          : type[0].toUpperCase() + type.slice(1)}
                      </Label>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Product List */}
        <div>
          {loading ? (
            <p className="text-center text-gray-500">Loading products...</p>
          ) : femaleProducts.length > 0 ? (
            <ProductList products={femaleProducts} />
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
