import { ProductList } from "@/components/product-list"
import { getProducts } from "@/lib/data"
import type { Product } from "@/lib/types"

export default async function MetalArtPage() {
  const products: Product[] = await getProducts()
  const metalArtProducts = products.filter((p) => p.category === "METAL_ART")

  return (
    <div className="container mx-auto px-4 py-8 md:px-6 md:py-12">
      <h1 className="text-3xl font-bold mb-8 text-center">Metal Art</h1>
      {metalArtProducts.length > 0 ? (
        <ProductList products={metalArtProducts} />
      ) : (
        <p className="text-center text-gray-500">No products found in this collection yet.</p>
      )}
    </div>
  )
}
