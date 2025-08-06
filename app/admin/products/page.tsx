//admin/products/page.tsx
'use client';
import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import Image from "next/image";

interface Product {
  id: string;
  name: string;
  price: number;
  images: string[];
  category: string;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Failed to fetch products");
      const data = await res.json();
      setProducts(data.data || data);
    } catch (err) {
      setError("Error loading products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  const deleteProduct = async (id: string) => {
    try {
      const res = await fetch(`/api/products?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
      } else {
        alert("Failed to delete product");
      }
    } catch {
      alert("Product delete failed");
    }
  };

  if (loading) return <div>Loading products...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="grid gap-6">
      <h1 className="text-3xl font-bold">Products Management</h1>
      <div className="border rounded-lg overflow-x-auto mt-8">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  <Image
                    src={product.images?.[0] || "/placeholder.jpg"}
                    alt={product.name}
                    width={50}
                    height={50}
                    className="rounded"
                  />
                </TableCell>
                <TableCell>{product.name}</TableCell>
                <TableCell>{product.category}</TableCell>
                <TableCell>₹{product.price}</TableCell>
                <TableCell className="text-center">
                  <Button
                    variant="destructive"
                    onClick={() => deleteProduct(product.id)}
                  >
                    Delete
                  </Button>
                  {/* Edit functionality yahan add kar sakte ho */}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}