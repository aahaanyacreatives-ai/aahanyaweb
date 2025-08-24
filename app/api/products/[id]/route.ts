import { NextRequest } from 'next/server';
import { adminDB } from '@/lib/firebaseAdmin';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withAuth } from '@/lib/auth-middleware';

const PRODUCTS = adminDB.collection('products');

// GET: Get single product
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const snap = await PRODUCTS.doc(params.id).get();
    if (!snap.exists) return errorResponse('Product not found', 404);
    return successResponse({ id: snap.id, ...snap.data() });
  } catch (error) {
    console.error('Product GET error:', error);
    return errorResponse('Failed to fetch product');
  }
}

// PUT: Update product (admin only)
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(req, async (req: NextRequest) => {
    try {
      const data = await req.json();
      await PRODUCTS.doc(params.id).update({ ...data, updatedAt: new Date() });
      const updatedSnap = await PRODUCTS.doc(params.id).get();
      if (!updatedSnap.exists) return errorResponse('Product not found', 404);
      return successResponse({ id: updatedSnap.id, ...updatedSnap.data() }, 'Product updated successfully');
    } catch (error) {
      console.error('Product update error:', error);
      return errorResponse('Failed to update product');
    }
  }, { requireAdmin: true });
}

// DELETE: Delete product (admin only)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(req, async (req: NextRequest) => {
    try {
      const snap = await PRODUCTS.doc(params.id).get();
      if (!snap.exists) return errorResponse('Product not found', 404);
      await PRODUCTS.doc(params.id).delete();
      return successResponse(null, 'Product deleted successfully');
    } catch (error) {
      console.error('Product deletion error:', error);
      return errorResponse('Failed to delete product');
    }
  }, { requireAdmin: true });
}
