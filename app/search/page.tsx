import { ProductList } from "@/components/product-list"
import { searchProducts } from "@/lib/data"
import type { Product } from "@/lib/types"

interface SearchPageProps {
  searchParams: {
    query?: string
  }
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const searchQuery = searchParams.query || ""
  const products: Product[] = await searchProducts(searchQuery)

  return (
    <div className="container mx-auto px-4 py-8 md:px-6 md:py-12">
      <h1 className="text-3xl font-bold mb-8 text-center">Search Results for &quot;{searchQuery}&quot;</h1>
      {products.length > 0 ? (
        <ProductList products={products} />
      ) : (
        <p className="text-center text-gray-500">No products found matching your search.</p>
      )}
    </div>
  )
}
