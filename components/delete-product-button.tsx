"use client"

import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface DeleteProductButtonProps {
  productId: string
}

export function DeleteProductButton({ productId }: DeleteProductButtonProps) {
  const router = useRouter()
  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this product?")) {
      return
    }

    const response = await fetch(`/api/products?id=${productId}`, {
      method: "DELETE",
    })

    if (response.ok) {
      toast({
        title: "Product Deleted!",
        description: "The product has been successfully removed.",
      })
      router.refresh() // Revalidate data to update product list
    } else {
      const data = await response.json()
      toast({
        title: "Failed to Delete Product",
        description: data.error || "Something went wrong.",
        variant: "destructive",
      })
    }
  }

  return (
    <Button variant="destructive" size="icon" onClick={handleDelete}>
      <Trash2 className="h-4 w-4" />
      <span className="sr-only">Delete Product</span>
    </Button>
  )
}
