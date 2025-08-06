import { NextResponse } from "next/server"
import { v2 as cloudinary } from "cloudinary"
import { Buffer } from "buffer"

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
})

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const uploadResult = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "products",
          resource_type: "image",
          quality: "auto",
          transformation: [{ width: 800, crop: "limit" }],
        },
        (error, result) => {
          if (error || !result) {
            console.error("[Cloudinary Error]:", error)
            reject(error)
          } else {
            resolve({
              secure_url: result.secure_url,
              public_id: result.public_id,
            })
          }
        }
      )
      stream.end(buffer)
    })

    return NextResponse.json({
      url: uploadResult.secure_url,
      public_id: uploadResult.public_id,
    })
  } catch (error) {
    console.error("Upload failed:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}