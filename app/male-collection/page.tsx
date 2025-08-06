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

// Yeh rahā MALE product type (category) filter list 👇
const MALE_TYPES = [
  "all",
  "chains",
  "rings",
  "bracelet",
];

export default function MaleCollectionPage() {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 2000]);
  const [loading, setLoading] = useState<boolean>(false);

  // Product fetch
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

  // Filtering logic: Only MALE, then type, then price
  const maleProducts = useMemo(() => {
    let filtered = allProducts.filter(
      (p) => (p.category || "").toString().toUpperCase() === "MALE"
    );
    if (selectedType !== "all") {
      filtered = filtered.filter(
        (p) => (p.type || "").toLowerCase() === selectedType.toLowerCase()
      );
    }
    filtered = filtered.filter(
      (p) => p.price >= priceRange[0] && p.price <= priceRange[1]
    );
    return filtered;
  }, [allProducts, selectedType, priceRange]);

  return (
    <div className="container mx-auto px-4 py-8 md:px-6 md:py-12">
      <h1 className="text-3xl font-bold mb-8 text-center">
        Male Collection
      </h1>

      {/* Top Filter Dropdown */}
      <div className="flex justify-between items-center mb-4">
        <span className="text-gray-600">
          {loading ? "Loading..." : `${maleProducts.length} products`}
        </span>
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            {MALE_TYPES.map((type) => (
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
                  {MALE_TYPES.map((type) => (
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
