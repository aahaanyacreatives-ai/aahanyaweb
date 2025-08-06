// lib/data.ts - SERVER-ONLY FUNCTIONS
// ⚠️ IMPORTANT: This file should ONLY be imported in API routes or server components
// DO NOT import this file in client components (files with 'use client')

if (typeof window !== "undefined") {
  throw new Error("❌ data.ts should not be imported on the client side! Use API routes instead.");
}

import { connectToDatabase } from "@/lib/db/mongodb";
import { Product as ProductModel } from "@/models/product";
import Coupon  from "@/models/coupon";
import OrderModel from "@/models/order";
import type { Product, Coupon as CouponType, Order } from "@/lib/types";
import { Types } from "mongoose";
import {  ProductType } from "@/models/product";



type ProductDoc = ProductType & {
  _id: Types.ObjectId;        // already there but we restate for clarity
  createdAt: Date;
  updatedAt: Date;
};

//--------------------------------------------------------------------------
// DTO returned to the rest of the app (no mongoose objects)
//--------------------------------------------------------------------------
export interface ProductDTO {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];                                      // ← ARRAY
  category: "MALE" | "FEMALE" | "METAL_ART" | "FEATURED";
  type?: string; 
  inStock: boolean;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}

//--------------------------------------------------------------------------
// Helper – convert Mongoose doc to plain DTO
//--------------------------------------------------------------------------
function toDTO(p: ProductDoc & { _id: Types.ObjectId }): ProductDTO {
  return {
    id:        p._id.toString(),
    name:      p.name,
    description: p.description,
    price:       p.price,
    images:      p.images,
    category:    p.category as any,
    type:        p.type ?? undefined,
    inStock:     p.inStock,
    quantity:    p.quantity,
    createdAt:   p.createdAt,
    updatedAt:   p.updatedAt,
  };
}

//--------------------------------------------------------------------------
// CRUD FUNCTIONS
//--------------------------------------------------------------------------

// GET all products
export async function getProducts(): Promise<ProductDTO[]> {
  await connectToDatabase();
  const docs = await ProductModel.find().lean();
  console.log("Debug: Fetched products count:", docs.length);
  return docs.map(toDTO);
}

// GET one product by ID
export async function getProductById(id: string): Promise<ProductDTO | null> {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(id)) return null;
  const doc = await ProductModel.findById(id).lean();
  return doc ? toDTO(doc as any) : null;
}

// ADD product
export async function addProduct(data: {
  name: string;
  description: string;
  price: number;
  images: string[];                                     // ← ARRAY
  category: "MALE" | "FEMALE" | "METAL_ART" | "FEATURED";
  type?: string;  
}): Promise<ProductDTO> {
  await connectToDatabase();
  const created = await ProductModel.create(data);
  return toDTO(created as any);
}

// DELETE product
export async function deleteProduct(id: string): Promise<boolean> {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(id)) return false;
  const { deletedCount } = await ProductModel.deleteOne({ _id: id });
  return deletedCount === 1;
}

// SEARCH products (name or description, case-insensitive)
export async function searchProducts(query: string): Promise<ProductDTO[]> {
  if (!query.trim()) return [];

  await connectToDatabase();
  const regex = new RegExp(query, "i");
  const docs = await ProductModel.find({
    $or: [{ name: regex }, { description: regex }],
  }).lean();
  return docs.map(toDTO);
}


// ------- COUPON FUNCTIONS -------

export async function getCoupons(): Promise<CouponType[]> {
  await connectToDatabase();
  const coupons = (await Coupon.find().sort({ createdAt: -1 }).lean()) as any[];

  console.log("Debug: Fetched coupons count:", coupons.length);

  return coupons.map((c) => ({
    id: c._id.toString(),
    code: c.code,
    type: c.type ?? undefined,
    value: c.value, // ✅ Fixed: was c.discount
    validFrom: c.validFrom ?? undefined,
    validUntil: c.validUntil ?? undefined,
    usedCount: c.usedCount,
    usageLimit: c.usageLimit, // ✅ Fixed: was c.maxUses
    isActive: c.isActive,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  } as CouponType));
}

export async function getCouponByCode(code: string): Promise<CouponType | null> {
  await connectToDatabase();

  console.log("Debug: Querying coupon by code:", code);

  const coupon = (await Coupon.findOne({ 
    code: code.toUpperCase(), // ✅ Added: Handle case sensitivity
    isActive: true // ✅ Added: Only get active coupons
  }).lean()) as any;

  if (!coupon) {
    console.log("Debug: Coupon not found for code:", code);
    return null;
  }

  return {
    id: coupon._id.toString(),
    code: coupon.code,
    type: coupon.type ?? undefined,
    value: coupon.value, // ✅ Fixed: was coupon.discount
    validFrom: coupon.validFrom ?? undefined,
    validUntil: coupon.validUntil ?? undefined,
    usedCount: coupon.usedCount,
    usageLimit: coupon.usageLimit, // ✅ Fixed: was coupon.maxUses
    isActive: coupon.isActive,
    createdAt: coupon.createdAt,
    updatedAt: coupon.updatedAt,
  } as CouponType;
}

export async function addCoupon(couponData: Partial<CouponType>): Promise<CouponType> {
  await connectToDatabase();

  console.log("Debug: Adding new coupon with code:", couponData.code);

  // ✅ Fixed: Proper field mapping and validation
  const created = await Coupon.create({
    code: couponData.code?.toUpperCase(),
    type: couponData.type,
    value: couponData.value, // ✅ Fixed: was discount
    isActive: couponData.isActive ?? true,
    usageLimit: couponData.usageLimit, // ✅ Fixed: was maxUses
    usedCount: 0,
    validFrom: couponData.validFrom,
    validUntil: couponData.validUntil,
  });

  return {
    id: created._id.toString(),
    code: created.code,
    type: created.type,
    value: created.value, // ✅ Fixed: was created.discount
    validFrom: created.validFrom ?? undefined,
    validUntil: created.validUntil ?? undefined,
    usedCount: created.usedCount,
    usageLimit: created.usageLimit, // ✅ Fixed: was created.maxUses
    isActive: created.isActive,
    createdAt: created.createdAt,
    updatedAt: created.updatedAt,
  } as CouponType;
}

export async function updateCouponUsage(id: string): Promise<boolean> {
  await connectToDatabase();

  if (!Types.ObjectId.isValid(id)) {
    console.log("Debug: Invalid coupon ID for update:", id);
    return false;
  }

  const coupon = await Coupon.findById(id);

  if (!coupon || !coupon.isActive) {
    console.log("Debug: Coupon not found or inactive for ID:", id);
    return false;
  }

  // ✅ Added: Check date validity
  const now = new Date();
  if (coupon.validFrom && now < coupon.validFrom) {
    console.log("Debug: Coupon not yet valid for ID:", id);
    return false;
  }
  
  if (coupon.validUntil && now > coupon.validUntil) {
    console.log("Debug: Coupon expired for ID:", id);
    return false;
  }

  // ✅ Fixed: Check usage limit
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    console.log("Debug: Coupon usage limit reached for ID:", id);
    return false;
  }

  coupon.usedCount += 1;

  // ✅ Fixed: Deactivate when limit reached
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    coupon.isActive = false;
  }

  await coupon.save();

  console.log("Debug: Updated coupon usage for ID:", id, "New usedCount:", coupon.usedCount);

  return true;
}

export async function deleteCoupon(id: string): Promise<boolean> {
  await connectToDatabase();

  if (!Types.ObjectId.isValid(id)) {
    console.log("Debug: Invalid coupon ID for delete:", id);
    return false;
  }

  const result = await Coupon.deleteOne({ _id: id });

  console.log("Debug: Delete coupon result - deletedCount:", result.deletedCount);

  return result.deletedCount === 1;
}

// ------- ORDER FUNCTIONS -------

export async function addOrder(orderData: Omit<Order, "id" | "orderDate">): Promise<Order> {
  await connectToDatabase();

  console.log("Debug: Adding new order for user:", orderData.userId);

  const created = await OrderModel.create({
    ...orderData,
    orderDate: new Date(),
  });

  return {
    id: created._id.toString(),
    userId: created.userId,
    items: created.items.map((item: any) => ({
      productId: item.productId,
      name: item.name,
      image: item.image,
      price: item.price,
      quantity: item.quantity,
      customSize: item.customSize ?? undefined,
      customImage: item.customImage ?? undefined,
    })),
    totalAmount: created.totalAmount,
    status: created.status,
    orderDate: created.orderDate.toISOString(),
    paymentDetails: created.paymentDetails ?? undefined,
  };
}

// NEW: Get orders by user ID - SERVER ONLY
export async function getOrdersByUserId(userId: string): Promise<Order[]> {
  await connectToDatabase();

  console.log("Debug: Fetching orders for user ID:", userId);

  if (!Types.ObjectId.isValid(userId)) {
    console.log("Debug: Invalid user ID:", userId);
    return [];
  }

  const orders = (await OrderModel.find({ userId }).sort({ orderDate: -1 }).lean()) as any[];

  console.log("Debug: Fetched orders count:", orders.length);

  return orders.map((order) => ({
    id: order._id.toString(),
    userId: order.userId,
    items: order.items.map((item: any) => ({
      productId: item.productId,
      name: item.name,
      image: item.image,
      price: item.price,
      quantity: item.quantity,
      customSize: item.customSize ?? undefined,
      customImage: item.customImage ?? undefined,
    })),
    totalAmount: order.totalAmount,
    status: order.status,
    orderDate: order.orderDate.toISOString(),
    paymentDetails: order.paymentDetails ?? undefined,
  }));
}
