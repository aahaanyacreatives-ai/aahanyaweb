// components/add-product-form.tsx - COMPLETE UPDATED VERSION
"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

type Category = "female" | "male" | "metal-art" | "featured";

type FormData = {
  name: string;
  description: string;
  price: string;
  category: Category;
  images: string[];
  type: string;
};

export function AddProductForm({ onProductAdded }: { onProductAdded?: () => void }) {
  const [form, setForm] = useState<FormData>({
    name: "",
    description: "",
    price: "",
    category: "female",
    images: [],
    type: "",
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const femaleTypes = ["rings", "earrings", "necklace", "scrunchies", "bracelet", "mini purse"];
  const maleTypes = ["chains", "rings", "bracelet"];
  const metalArtTypes = ["eternal steel art", "metal art"];
  
  const catMap: Record<Category, string> = {
    female: "FEMALE",
    male: "MALE",
    "metal-art": "METAL_ART",
    featured: "FEATURED",
  };

  // Upload images function
  async function uploadImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    
    if (form.images.length + files.length > 3) {
      toast({ 
        title: "Too many images", 
        description: "Maximum 3 images allowed", 
        variant: "destructive" 
      });
      return;
    }

    setUploading(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const file of files) {
        // File validation
        if (!file.type.startsWith('image/')) {
          toast({ 
            title: "Invalid file", 
            description: `${file.name} is not an image file`, 
            variant: "destructive" 
          });
          failCount++;
          continue;
        }

        if (file.size > 5 * 1024 * 1024) {
          toast({ 
            title: "File too large", 
            description: `${file.name} exceeds 5MB limit`, 
            variant: "destructive" 
          });
          failCount++;
          continue;
        }

        const fd = new FormData();
        fd.append("file", file);
        
        try {
          const res = await fetch("/api/upload", { method: "POST", body: fd });
          const data = await res.json();

          if (!res.ok) {
            throw new Error(data.error || `Failed to upload ${file.name}`);
          }

          setForm(prev => ({ ...prev, images: [...prev.images, data.url] }));
          successCount++;
        } catch (error) {
          console.error(`Upload failed for ${file.name}:`, error);
          toast({ 
            title: "Upload failed", 
            description: `Failed to upload ${file.name}`, 
            variant: "destructive" 
          });
          failCount++;
        }
      }

      if (successCount > 0) {
        toast({ 
          title: "Upload complete", 
          description: `${successCount} image(s) uploaded successfully` 
        });
      }

    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function removeImage(idx: number) {
    setForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== idx),
    }));
    toast({ title: "Image removed" });
  }

  function validateForm(): string | null {
    if (!form.name.trim()) return "Product name is required";
    if (!form.description.trim()) return "Description is required";
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) <= 0) {
      return "Valid price is required";
    }
    if (!form.images.length) return "At least one image is required";
    if (form.images.length > 3) return "Maximum 3 images allowed";
    
    const needsType = ["female", "male", "metal-art"].includes(form.category);
    if (needsType && !form.type) {
      return "Product type is required for this category";
    }
    
    return null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      toast({ title: "Validation Error", description: validationError, variant: "destructive" });
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        category: catMap[form.category],
        images: form.images,
        type: (form.category === "female" || form.category === "male" || form.category === "metal-art") 
          ? form.type 
          : undefined,
      };

      console.log('[DEBUG] Submitting payload:', JSON.stringify(payload, null, 2));

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const responseData = await res.json();
      console.log('[DEBUG] API response:', responseData);

      if (res.ok) {
        toast({ title: "Success", description: "Product added successfully" });
        setForm({
          name: "",
          description: "",
          price: "",
          category: "female",
          images: [],
          type: "",
        });
        onProductAdded?.();
      } else {
        throw new Error(responseData.error || "Failed to save product");
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast({ 
        title: "Save failed", 
        description: error instanceof Error ? error.message : "Unknown error", 
        variant: "destructive" 
      });
    } finally {
      setSaving(false);
    }
  }

  const showTypeSelector = ["female", "male", "metal-art"].includes(form.category);
  const currentTypeOptions =
    form.category === "female"
      ? femaleTypes
      : form.category === "male"
      ? maleTypes
      : form.category === "metal-art"
      ? metalArtTypes
      : [];

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div>
        <Label htmlFor="name">Product name *</Label>
        <Input
          id="name"
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          placeholder="Enter product name"
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
          placeholder="Enter product description"
          required
        />
      </div>

      <div>
        <Label htmlFor="price">Price *</Label>
        <Input
          id="price"
          type="number"
          step="0.01"
          min="0"
          value={form.price}
          onChange={e => setForm({ ...form, price: e.target.value })}
          placeholder="0.00"
          required
        />
      </div>

      <div>
        <Label>Category *</Label>
        <Select
          value={form.category}
          onValueChange={(v: Category) => setForm(prev => ({
            ...prev,
            category: v,
            type: "",
          }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="female">Female</SelectItem>
            <SelectItem value="male">Male</SelectItem>
            <SelectItem value="metal-art">Metal Art</SelectItem>
            <SelectItem value="featured">Featured</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {showTypeSelector && (
        <div>
          <Label>Product Type *</Label>
          <Select
            value={form.type}
            onValueChange={value => setForm({ ...form, type: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose type" />
            </SelectTrigger>
            <SelectContent>
              {currentTypeOptions.map(t => (
                <SelectItem key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <Label>Images * (Max 3)</Label>
        <Input
          type="file"
          accept="image/*"
          multiple
          disabled={form.images.length >= 3 || uploading}
          onChange={uploadImages}
        />
        {uploading && (
          <p className="text-sm text-muted-foreground mt-1">
            Uploading images...
          </p>
        )}
      </div>

      {form.images.length > 0 && (
        <div className="flex gap-3 mt-2">
          {form.images.map((url, idx) => (
            <div key={idx} className="relative">
              <img
                src={url}
                alt={`Product preview ${idx + 1}`}
                className="w-24 h-24 object-cover rounded border"
              />
              <button
                type="button"
                aria-label={`Remove image ${idx + 1}`}
                onClick={() => removeImage(idx)}
                className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <Button type="submit" disabled={uploading || saving} className="mt-4">
        {saving ? "Saving..." : uploading ? "Uploading..." : "Add Product"}
      </Button>
    </form>
  );
}
