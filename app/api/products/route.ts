// app/api/products/route.ts - Updated for Google Cloud Storage
import { NextRequest, NextResponse } from 'next/server';
import { adminDB } from '@/lib/firebaseAdmin';
import { withAuth } from '@/lib/auth-middleware';
import { handleFirebaseError } from '@/lib/firebase-utils';
import { bucket, extractFilenameFromGCSUrl } from '@/lib/gcs-utils';
import { z } from 'zod';

// ✅ Updated schema to match your form data
const ProductSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  price: z.number().positive("Price must be positive"),
  images: z.array(z.string().url()).min(1, "At least one image is required"),
  category: z.string().min(1, "Category is required"),
  type: z.string().optional(), // Product type for female/male/metal-art
  stock: z.number().int().min(0, "Stock cannot be negative").optional().default(0),
  customizable: z.boolean().optional().default(false),
  customizationOptions: z.array(z.string()).optional().default([])
});

type ProductUpdate = {
  id: string;
  data: Partial<z.infer<typeof ProductSchema>>;
};

const PRODUCTS = adminDB.collection('products');

// GET: Fetch all products or single product by ID
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      const snap = await PRODUCTS.doc(id).get();
      if (!snap.exists) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }
      return NextResponse.json({ id: snap.id, ...snap.data() });
    }

    const snap = await PRODUCTS.get();
    const products = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

// POST: Add new product (admin only)
export async function POST(req: NextRequest) {
  return withAuth(req, async (req: NextRequest, token: any) => {
    try {
      console.log('[DEBUG] POST /api/products called for user:', token.sub || token.id);
      
      if (token.role !== 'admin') {
        return NextResponse.json({ error: "Admin access required" }, { status: 403 });
      }

      const data = await req.json();
      console.log('[DEBUG] Received product data:', JSON.stringify(data, null, 2));
      
      // Validate product data
      const validationResult = ProductSchema.safeParse(data);
      if (!validationResult.success) {
        console.error('[DEBUG] Validation errors:', validationResult.error.errors);
        return NextResponse.json({ 
          error: "Invalid product data", 
          details: validationResult.error.errors 
        }, { status: 400 });
      }

      // Add product with validated data
      const productRef = PRODUCTS.doc();
      const productData = {
        ...validationResult.data,
        id: productRef.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        storageProvider: 'gcs' // Track that this uses Google Cloud Storage
      };

      await productRef.set(productData);
      console.log('[DEBUG] Product created successfully with ID:', productRef.id);

      return NextResponse.json({
        success: true,
        message: "Product created successfully",
        product: productData
      }, { status: 201 });

    } catch (error) {
      console.error('[DEBUG] Product creation error:', error);
      return NextResponse.json({
        error: "Failed to create product",
        details: error instanceof Error ? error.message : "Unknown error"
      }, { status: 500 });
    }
  });
}

// PUT: Update product(s) (admin only)
export async function PUT(req: NextRequest) {
  return withAuth(req, async (req: NextRequest, token: any) => {
    try {
      if (token.role !== 'admin') {
        return NextResponse.json({ error: "Admin access required" }, { status: 403 });
      }

      const updates = await req.json();
      const updateArray = Array.isArray(updates) ? updates : [updates];
      
      const validatedUpdates: ProductUpdate[] = [];
      for (const update of updateArray) {
        const { id, ...data } = update;
        if (!id || typeof id !== 'string') {
          return NextResponse.json({ error: "Valid product ID required" }, { status: 400 });
        }
        
        const validationResult = ProductSchema.partial().safeParse(data);
        if (!validationResult.success) {
          return NextResponse.json({
            error: `Invalid data for product ${id}`,
            details: validationResult.error.errors
          }, { status: 400 });
        }
        
        validatedUpdates.push({ id, data: validationResult.data });
      }

      // Update products in batch
      const batch = adminDB.batch();
      validatedUpdates.forEach(({ id, data }) => {
        const ref = PRODUCTS.doc(id);
        batch.update(ref, { 
          ...data, 
          updatedAt: new Date(),
          storageProvider: 'gcs' // Mark as using GCS
        });
      });
      await batch.commit();

      return NextResponse.json({
        success: true,
        message: `Successfully updated ${validatedUpdates.length} product(s)`
      });

    } catch (error) {
      console.error('[DEBUG] Product update error:', error);
      return handleFirebaseError(error);
    }
  });
}

// DELETE: Delete product and its images from Google Cloud Storage (admin only)
export async function DELETE(req: NextRequest) {
  return withAuth(req, async (req: NextRequest, token: any) => {
    try {
      if (token.role !== 'admin') {
        return NextResponse.json({ error: "Admin access required" }, { status: 403 });
      }

      const id = new URL(req.url).searchParams.get('id');
      if (!id) {
        return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
      }

      // Get product data first
      const snap = await PRODUCTS.doc(id).get();
      if (!snap.exists) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }

      const data = snap.data();
      if (!data) {
        return NextResponse.json({ error: "No product data found" }, { status: 404 });
      }

      // Extract filenames from GCS URLs
      const imageFilenames: string[] = [];
      if (data.images && Array.isArray(data.images)) {
        for (const url of data.images) {
          const filename = extractFilenameFromGCSUrl(url);
          if (filename) {
            imageFilenames.push(filename);
          }
        }
      }

      // Delete from Firestore first
      await PRODUCTS.doc(id).delete();
      console.log(`✅ Product ${id} deleted from Firestore`);

      // Delete images from Google Cloud Storage
      const gcsResults = [];
      if (imageFilenames.length > 0) {
        console.log(`🗑️ Deleting ${imageFilenames.length} images from GCS...`);
        
        for (const filename of imageFilenames) {
          try {
            const file = bucket.file(filename);
            
            // Check if file exists before attempting to delete
            const [exists] = await file.exists();
            if (exists) {
              await file.delete();
              gcsResults.push({ filename, result: 'deleted' });
              console.log(`✅ GCS file deleted: ${filename}`);
            } else {
              gcsResults.push({ filename, result: 'not_found' });
              console.log(`⚠️ GCS file not found: ${filename}`);
            }
          } catch (err) {
            console.error(`❌ Error deleting GCS file ${filename}:`, err);
            gcsResults.push({ 
              filename, 
              error: err instanceof Error ? err.message : 'Unknown error'
            });
          }
        }
      }

      return NextResponse.json({ 
        success: true,
        message: "Product deleted successfully",
        deletedImages: gcsResults.length,
        gcsResults
      });

    } catch (error) {
      console.error('[DEBUG] Product deletion error:', error);
      return NextResponse.json({ 
        error: "Failed to delete product",
        details: error instanceof Error ? error.message : "Unknown error"
      }, { status: 500 });
    }
  });
}
