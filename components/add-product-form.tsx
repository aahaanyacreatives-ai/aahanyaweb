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

export function AddProductForm({ onProductAdded }: { onProductAdded?: () => void }) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    category: "female", // default
    images: [] as string[],
    type: "",
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const femaleTypes = ["rings", "earrings", "necklace", "scrunchies", "bracelet"];
  const maleTypes = ["chains", "rings", "bracelet"];
  const metalArtTypes = ["eternal steel art", "metal art"]; // NEW
  
  const catMap = {
    female: "FEMALE",
    male: "MALE",
    "metal-art": "METAL_ART",
    featured: "FEATURED",
  };

  // MULTI upload handler - ALWAYS ENABLED FOR ADMIN
  async function uploadImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    
    // Max 3 only
    if (form.images.length + files.length > 3) {
      toast({ title: "Max 3 images allowed", variant: "destructive" });
      return;
    }
    setUploading(true);

    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) {
        toast({ title: "Upload failed", description: data.error, variant: "destructive" });
      } else {
        // Add uploaded image URL to form.images (prev)
        setForm(prev => ({ ...prev, images: [...prev.images, data.url] }));
        toast({ title: "Image uploaded" });
      }
    }
    setUploading(false);
    // reset input value so you can re-upload same file if you removed it
    e.target.value = "";
  }

  // Remove image from form.images
  function removeImage(idx: number) {
    setForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== idx),
    }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.images.length) {
      return toast({ title: "At least one image required", variant: "destructive" });
    }
    if (form.images.length > 3) {
      return toast({ title: "Max 3 images allowed", variant: "destructive" });
    }
    if ((form.category === "female" || form.category === "male" || form.category === "metal-art") && !form.type) {
      return toast({ title: "Type required", description: "Please select product type.", variant: "destructive" });
    }
    setSaving(true);

    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        price: Number(form.price),
        category: catMap[form.category as keyof typeof catMap],
        type: (form.category === "female" || form.category === "male" || form.category === "metal-art") ? form.type : undefined,
      }),
    });

    setSaving(false);
    if (res.ok) {
      toast({ title: "Product added" });
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
      const { error } = await res.json();
      toast({ title: "Save failed", description: error, variant: "destructive" });
    }
  }

  const showTypeSelector = form.category === "female" || form.category === "male" || form.category === "metal-art";
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
      <Label>Product name</Label>
      <Input
        value={form.name}
        onChange={e => setForm({ ...form, name: e.target.value })}
        required
      />

      <Label>Description</Label>
      <Textarea
        value={form.description}
        onChange={e => setForm({ ...form, description: e.target.value })}
        required
      />

      <Label>Price</Label>
      <Input
        type="number"
        step="0.01"
        value={form.price}
        onChange={e => setForm({ ...form, price: e.target.value })}
        required
      />

      <Label>Category</Label>
      <Select
        value={form.category as any}
        onValueChange={v => setForm(prev => ({
          ...prev,
          category: v,
          type: "",
        }))}
      >
        <SelectTrigger>
          <SelectValue placeholder="Choose" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="female">Female</SelectItem>
          <SelectItem value="male">Male</SelectItem>
          <SelectItem value="metal-art">Metal Art</SelectItem>
          <SelectItem value="featured">Featured</SelectItem>
        </SelectContent>
      </Select>

      {showTypeSelector && (
        <>
          <Label>Product Type</Label>
          <Select
            value={form.type}
            onValueChange={value => setForm({ ...form, type: value })}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose type" />
            </SelectTrigger>
            <SelectContent>
              {currentTypeOptions.map(t => (
                <SelectItem key={t} value={t}>
                  {t[0].toUpperCase() + t.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      )}

      {/* Image Upload - ALWAYS ENABLED FOR ADMIN */}
      <Label>Images (Max 3)</Label>
      <Input
        type="file"
        accept="image/*"
        multiple
        disabled={form.images.length >= 3 || uploading}
        onChange={uploadImages}
        // Removed 'required' to allow submission after uploading and clearing the input
      />
      <div className="flex gap-3 mt-2">
        {form.images.map((url, idx) => (
          <div key={idx} className="relative">
            <img
              src={url}
              alt={`preview-${idx + 1}`}
              className="w-24 h-24 object-cover rounded border"
            />
            <button
              type="button"
              aria-label="Remove image"
              onClick={() => removeImage(idx)}
              className="absolute top-0 right-0 bg-black text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
              style={{ lineHeight: 1 }}
            >×</button>
          </div>
        ))}
      </div>

      <Button disabled={uploading || saving}>
        {saving ? "Saving…" : "Add product"}
      </Button>
    </form>
  );
}
