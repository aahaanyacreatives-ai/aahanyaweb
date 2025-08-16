// C:\Users\Asus\OneDrive\Desktop\Aahanya\models\product.ts
import mongoose, { Model } from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name:        { type: String,  required: true },
    description: { type: String,  required: true },
    price:       { type: Number,  required: true },
    images:      [{ type: String, required: true }], // ← ARRAY
    category:    {
      type: String,
      enum: ["MALE", "FEMALE", "METAL_ART", "FEATURED"],
      required: true,
    },
    type: {           
      type: String,
      required: false,   // optional
      lowercase: true,
      enum: [
        // Female types
        "rings",
        "earrings",
        "necklace",
        "scrunchies",
        "bracelet",
        "mini purse",
        // Male types
        "chains",
        // Metal Art types - NEW
        "eternal steel art",
        "metal art"
      ],
    },
    inStock:   { type: Boolean, default: true },
    quantity:  { type: Number,  default: 0 },
  },
  { timestamps: true }
);

export type ProductType = mongoose.InferSchemaType<typeof productSchema>;

export const Product: Model<ProductType> =
  mongoose.models.Product || mongoose.model("Product", productSchema);
