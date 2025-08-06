import { getProductById } from "@/lib/data"
import { notFound } from "next/navigation"
import ProductDetailClient from "./product-detail-client"

export default async function ProductDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const product = await getProductById(params.id);

  if (!product) {
    notFound();
  }

  return <ProductDetailClient initialProduct={product} />;
}

