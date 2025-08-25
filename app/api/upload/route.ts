// app/api/upload/route.ts - Updated for Google Cloud Storage
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { bucket, getPublicUrl } from '@/lib/gcs-utils';
import { v4 as uuidv4 } from 'uuid';

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
      const maxSize = 25 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        return NextResponse.json({ error: "File size must be less than 25MB" }, { status: 400 });
      }

      // Convert file to buffer
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Generate unique filename with proper extension
      const fileExtension = file.name.split('.').pop() || 'jpg';
      const fileName = `aahanya-products/${uuidv4()}.${fileExtension}`;

      // Create a reference to the file in GCS
      const gcsFile = bucket.file(fileName);
      
      // Upload to Google Cloud Storage
      const uploadResponse = await new Promise<any>((resolve, reject) => {
        const stream = gcsFile.createWriteStream({
          metadata: {
            contentType: file.type,
            cacheControl: 'public, max-age=31536000', // 1 year cache
          },
          public: true, // Make file publicly accessible
          validation: 'md5',
          resumable: false, // For smaller files, disable resumable upload
        });

        stream.on('error', (error) => {
          console.error('GCS upload error:', error);
          reject(error);
        });

        stream.on('finish', async () => {
          try {
            // Make the file public (redundant but ensures access)
            await gcsFile.makePublic();
            
            // Get file metadata
            const [metadata] = await gcsFile.getMetadata();
            
            const publicUrl = getPublicUrl(fileName);
            console.log(`✅ Image uploaded successfully: ${publicUrl}`);
            
            resolve({
              url: publicUrl,
              fileName: fileName,
              size: file.size,
              contentType: file.type,
              etag: metadata.etag,
              timeCreated: metadata.timeCreated
            });
          } catch (error) {
            console.error('Error making file public:', error);
            reject(error);
          }
        });

        // Write the buffer to the stream
        stream.end(buffer);
      });

      return NextResponse.json({
        success: true,
        url: uploadResponse.url,
        fileName: uploadResponse.fileName,
        size: uploadResponse.size,
        contentType: uploadResponse.contentType,
        etag: uploadResponse.etag,
        timeCreated: uploadResponse.timeCreated
      });

    } catch (error) {
      console.error("[DEBUG] GCS Upload error:", error);
      return NextResponse.json({
        error: "Upload failed",
        details: error instanceof Error ? error.message : "Unknown error"
      }, { status: 500 });
    }
  });
}

// Optional: Add a DELETE endpoint for individual file deletion
export async function DELETE(req: NextRequest) {
  return withAuth(req, async (req: NextRequest, token: any) => {
    try {
      if (token.role !== 'admin') {
        return NextResponse.json({ error: "Admin access required" }, { status: 403 });
      }

      const { searchParams } = new URL(req.url);
      const fileName = searchParams.get('fileName');
      
      if (!fileName) {
        return NextResponse.json({ error: "File name is required" }, { status: 400 });
      }

      // Delete file from GCS
      const file = bucket.file(fileName);
      await file.delete();

      console.log(`✅ File deleted successfully: ${fileName}`);

      return NextResponse.json({
        success: true,
        message: "File deleted successfully",
        fileName: fileName
      });

    } catch (error) {
      console.error("[DEBUG] GCS Delete error:", error);
      return NextResponse.json({
        error: "Delete failed",
        details: error instanceof Error ? error.message : "Unknown error"
      }, { status: 500 });
    }
  });
}
