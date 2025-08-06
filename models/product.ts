import mongoose, { Model } from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name:        { type: String,  required: true },
    description: { type: String,  required: true },
    price:       { type: Number,  required: true },
    images:      [{ type: String, required: true }],           // ← ARRAY
    category:    {                                            // enum in caps
      type: String,
      enum: ["MALE", "FEMALE", "METAL_ART", "FEATURED"],
      required: true,
    },
    inStock:   { type: Boolean, default: true },
    quantity:  { type: Number,  default: 0 },
  },
  { timestamps: true }
);

export type ProductType = mongoose.InferSchemaType<typeof productSchema>;

export const Product: Model<ProductType> =
  mongoose.models.Product || mongoose.model("Product", productSchema);
