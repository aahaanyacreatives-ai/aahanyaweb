// app/products/[id]/page.tsx - FIXED FOR TYPESCRIPT AND FIREBASE

import { getProductById } from "@/lib/data";
import { notFound } from "next/navigation";
import ProductDetailClient from "./product-detail-client";  // Assuming this is your client component

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const product = await getProductById(params.id);  // Calls the new function from data.ts

  if (!product) {
    notFound();  // Redirect to 404 if not found
  }

  return <ProductDetailClient initialProduct={product} />;
}
