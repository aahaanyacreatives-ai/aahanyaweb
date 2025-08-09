import { NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { Product } from '@/models/product';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withAuth } from '@/lib/auth-middleware';

// Get a single product
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    const product = await Product.findById(params.id);
    
    if (!product) {
      return errorResponse('Product not found', 404);
    }
    
    return successResponse(product);
  } catch (error) {
    console.error('Product GET error:', error);
    return errorResponse('Failed to fetch product');
  }
}

// Update a product (admin only)
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(req, async (req: NextRequest) => {
    try {
      await connectToDatabase();
      const data = await req.json();
      
      const product = await Product.findByIdAndUpdate(
        params.id,
        { ...data, updatedAt: new Date() },
        { new: true }
      );
      
      if (!product) {
        return errorResponse('Product not found', 404);
      }
      
      return successResponse(product, 'Product updated successfully');
    } catch (error) {
      console.error('Product update error:', error);
      return errorResponse('Failed to update product');
    }
  }, { requireAdmin: true });
}

// Delete a product (admin only)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(req, async (req: NextRequest) => {
    try {
      await connectToDatabase();
      const product = await Product.findByIdAndDelete(params.id);
      
      if (!product) {
        return errorResponse('Product not found', 404);
      }
      
      return successResponse(null, 'Product deleted successfully');
    } catch (error) {
      console.error('Product deletion error:', error);
      return errorResponse('Failed to delete product');
    }
  }, { requireAdmin: true });
}
