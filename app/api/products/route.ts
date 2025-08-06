// app/api/products/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  getProducts,
  getProductById,
  addProduct,
  deleteProduct,
} from "@/lib/data";

import { v2 as cloudinary } from "cloudinary";


// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const product = await getProductById(id);
      if (product) {
        return NextResponse.json(product);
      } else {
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }
    }

    const products = await getProducts();
    return NextResponse.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

// app/api/products/route.ts - Fix the POST method
export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("🔍 DEBUG: Full request body:", body);

    // Add `type` here
    const { name, description, price, images, category, type } = body;
    console.log("🔍 DEBUG: Destructured:", { name, description, price, images, category, type });

    if (!name || !description || !price || !images?.length || !category) {
      return NextResponse.json(
        { error: "Name, description, price, images, and category are required" },
        { status: 400 }
      );
    }

    const productData = {
      name,
      description,
      price,
      images,
      category,
      type, // <-- IMPORTANT!
    };

    console.log("🔍 DEBUG: Sending to addProduct:", productData);

    const newProduct = await addProduct(productData);
    return NextResponse.json(newProduct, { status: 201 });
  } catch (error) {
    console.error("Error adding product:", error);
    return NextResponse.json({
      error: "Failed to add product",
     details: (error instanceof Error ? error.message : String(error)),
    }, { status: 500 });
  }
}




export async function DELETE(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    // 1️⃣ First, get the product to extract image public_id
    const product = await getProductById(id);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // 2️⃣ Extract public_id from Cloudinary URL
    const imagePublicIds: string[] = [];
    
    if (product.images && product.images.length > 0) {
      product.images.forEach((imageUrl: string) => {
        try {
          // Extract public_id from Cloudinary URL
          // URL format: https://res.cloudinary.com/your_cloud/image/upload/v1234567890/folder/filename.jpg
          const urlParts = imageUrl.split('/');
          const uploadIndex = urlParts.indexOf('upload');
          
          if (uploadIndex !== -1 && uploadIndex + 2 < urlParts.length) {
            // Skip version number if present (v1234567890)
            let publicIdPart = urlParts.slice(uploadIndex + 2).join('/');
            
            // Remove file extension
            const publicId = publicIdPart.replace(/\.[^/.]+$/, "");
            imagePublicIds.push(publicId);
          }
        } catch (error) {
          console.error("Error extracting public_id from URL:", imageUrl, error);
        }
      });
    }

    // 3️⃣ Delete from MongoDB first
    const mongoDeleted = await deleteProduct(id);
    if (!mongoDeleted) {
      return NextResponse.json({ error: "Failed to delete from database" }, { status: 500 });
    }

    // 4️⃣ Delete images from Cloudinary
    const cloudinaryResults = [];
    for (const publicId of imagePublicIds) {
      try {
        console.log(`Attempting to delete image with public_id: ${publicId}`);
        const result = await cloudinary.uploader.destroy(publicId);
        cloudinaryResults.push({ publicId, result });
        console.log(`Cloudinary delete result for ${publicId}:`, result);
      } catch (error) {
        console.error(`Failed to delete image ${publicId} from Cloudinary:`, error);
        cloudinaryResults.push({ publicId, error: error instanceof Error ? error.message : String(error), });
      }
    }

    return NextResponse.json({ 
      message: "Product deleted successfully",
      mongoDeleted: true,
      cloudinaryResults
    });

  } catch (err) {
    console.error("DELETE /api/products error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}