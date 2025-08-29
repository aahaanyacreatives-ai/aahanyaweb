// app/api/cart/validate-stock/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDB } from '@/lib/firebaseAdmin';
import { withAuth } from '@/lib/auth-middleware';

const CART = adminDB.collection('cart');
const PRODUCTS = adminDB.collection('products');

export async function POST(req: NextRequest) {
  return withAuth(req, async (req: NextRequest, token: any) => {
    try {
      const userId = token.sub || token.id;
      
      if (!userId) {
        return NextResponse.json({ error: 'User ID not found in token' }, { status: 400 });
      }

      // Get user's cart
      const cartSnap = await CART.where('userId', '==', userId).get();
      
      if (cartSnap.empty) {
        return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
      }

      const stockIssues: Array<{
        productId: string;
        productName: string;
        available: number;
        requested: number;
      }> = [];

      // Check stock for each cart item
      for (const cartDoc of cartSnap.docs) {
        const cartData = cartDoc.data();
        
        const productSnap = await PRODUCTS.doc(cartData.productId).get();
        
        if (!productSnap.exists) {
          stockIssues.push({
            productId: cartData.productId,
            productName: cartData.name || 'Unknown Product',
            available: 0,
            requested: cartData.quantity
          });
          continue;
        }

        const productData = productSnap.data()!;
        
        // Check stock if product tracks inventory
        if (productData.stock !== undefined && productData.stock < cartData.quantity) {
          stockIssues.push({
            productId: cartData.productId,
            productName: productData.name,
            available: productData.stock,
            requested: cartData.quantity
          });
        }
      }

      if (stockIssues.length > 0) {
        return NextResponse.json({
          error: 'Insufficient stock',
          stockIssues
        }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: 'All items in stock'
      });

    } catch (error) {
      console.error('[DEBUG] Stock validation error:', error);
      return NextResponse.json({
        error: 'Failed to validate stock',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  });
}