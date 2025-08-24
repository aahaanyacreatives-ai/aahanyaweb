// app/api/upload/route.ts - COMPLETE FIXED VERSION
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import * as cloudinary from 'cloudinary';

const cloudinaryV2 = cloudinary.v2;

// Configure Cloudinary
cloudinaryV2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export async function POST(req: NextRequest) {
  return withAuth(req, async (req: NextRequest, token: any) => {
    try {
      console.log('[DEBUG] Upload API called for user:', token.sub || token.id);
      
      // Check if user is admin
      if (token.role !== 'admin') {
        return NextResponse.json({ error: "Admin access required" }, { status: 403 });
      }

      // Get the file from form data
      const formData = await req.formData();
      const file = formData.get('file') as File;
      
      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
      }

      // Validate file size (5MB limit)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        return NextResponse.json({ error: "File size must be less than 5MB" }, { status: 400 });
      }

      // Convert file to buffer
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Upload to Cloudinary
      const uploadResponse = await new Promise<any>((resolve, reject) => {
        cloudinaryV2.uploader.upload_stream(
          {
            resource_type: "auto",
            folder: "aahanya-products",
            transformation: [
              { width: 800, height: 800, crop: "limit" },
              { quality: "auto:good" },
              { format: "auto" }
            ]
          },
          (error: any, result: any) => {
            if (error) {
              console.error("Cloudinary upload error:", error);
              reject(error);
            } else {
              resolve(result);
            }
          }
        ).end(buffer);
      });

      console.log(`✅ Image uploaded successfully: ${uploadResponse.secure_url}`);

      return NextResponse.json({
        success: true,
        url: uploadResponse.secure_url,
        public_id: uploadResponse.public_id,
        width: uploadResponse.width,
        height: uploadResponse.height
      });

    } catch (error) {
      console.error("[DEBUG] Upload error:", error);
      return NextResponse.json({
        error: "Upload failed",
        details: error instanceof Error ? error.message : "Unknown error"
      }, { status: 500 });
    }
  });
}
