"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

export function AddProductForm({ onProductAdded }: { onProductAdded?: () => void }) {
  const [form, setForm] = useState({
    name: "", description: "", price: "", category: "female",
    images: [] as string[],
  });
  const [uploading, setUploading] = useState(false);
  const [saving,    setSaving]    = useState(false);

  const catMap = { female: "FEMALE", male: "MALE", "metal-art": "METAL_ART", featured: "FEATURED" };

  async function uploadImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();

    setUploading(false);
    if (!res.ok) return toast({ title: "Upload failed", description: data.error, variant: "destructive" });

    setForm(f => ({ ...f, images: [data.url] }));
    toast({ title: "Image uploaded" });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.images.length) {
      return toast({ title: "Image required", variant: "destructive" });
    }
    setSaving(true);

    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        price: Number(form.price),
        category: catMap[form.category as keyof typeof catMap],
      }),
    });

    setSaving(false);
    if (res.ok) {
      toast({ title: "Product added" });
      setForm({ name: "", description: "", price: "", category: "female", images: [] });
      onProductAdded?.();
    } else {
      const { error } = await res.json();
      toast({ title: "Save failed", description: error, variant: "destructive" });
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <Label>Product name</Label>
      <Input value={form.name}  onChange={e => setForm({ ...form, name: e.target.value })} required />

      <Label>Description</Label>
      <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required />

      <Label>Price</Label>
      <Input type="number" step="0.01" value={form.price}
             onChange={e => setForm({ ...form, price: e.target.value })} required />

      <Label>Image</Label>
      <Input type="file" accept="image/*" onChange={uploadImage} required />
      {form.images[0] && <img src={form.images[0]} alt="preview" className="w-24 h-24 object-cover mt-2" />}

      <Label>Category</Label>
      <Select value={form.category as any} onValueChange={v => setForm({ ...form, category: v })}>
        <SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="female">Female</SelectItem>
          <SelectItem value="male">Male</SelectItem>
          <SelectItem value="metal-art">Metal Art</SelectItem>
          <SelectItem value="featured">Featured</SelectItem>
        </SelectContent>
      </Select>

      <Button disabled={uploading || saving}>{saving ? "Saving…" : "Add product"}</Button>
    </form>
  );
}
