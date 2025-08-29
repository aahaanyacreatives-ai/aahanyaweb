// app/api/debug/stock/route.ts - CREATE THIS FILE TO DEBUG STOCK ISSUES
import { NextRequest, NextResponse } from 'next/server';
import { adminDB } from '@/lib/firebaseAdmin';
import { withAuth } from '@/lib/auth-middleware';

const CART = adminDB.collection('cart');
const PRODUCTS = adminDB.collection('products');

export async function GET(req: NextRequest) {
  return withAuth(req, async (req: NextRequest, token: any) => {
    try {
      const userId = token.sub || token.id;
      
      if (!userId) {
        return NextResponse.json({ error: 'User ID not found in token' }, { status: 400 });
      }

      console.log('[DEBUG] Checking stock for user:', userId);

      // Get user's cart
      const cartSnap = await CART.where('userId', '==', userId).get();
      
      if (cartSnap.empty) {
        return NextResponse.json({ 
          message: 'Cart is empty',
          cartItems: []
        });
      }

      const debugInfo: any[] = [];

      // Check each cart item
      for (const cartDoc of cartSnap.docs) {
        const cartData = cartDoc.data();
        
        console.log('[DEBUG] Cart item:', cartData);
        
        const productRef = PRODUCTS.doc(cartData.productId);
        const productSnap = await productRef.get();
        
        const itemDebug: any = {
          cartItemId: cartDoc.id,
          productId: cartData.productId,
          requestedQuantity: cartData.quantity,
          cartData: cartData
        };

        if (!productSnap.exists) {
          itemDebug.status = 'PRODUCT_NOT_FOUND';
          itemDebug.error = 'Product does not exist in database';
        } else {
          const productData = productSnap.data()!;
          itemDebug.productData = productData;
          itemDebug.productName = productData.name;
          itemDebug.productPrice = productData.price;
          
          // Check stock field
          if (productData.stock === undefined) {
            itemDebug.status = 'NO_STOCK_TRACKING';
            itemDebug.stockValue = 'undefined';
            itemDebug.message = 'Product does not track stock (unlimited)';
          } else {
            itemDebug.stockValue = productData.stock;
            itemDebug.stockType = typeof productData.stock;
            
            if (productData.stock < cartData.quantity) {
              itemDebug.status = 'INSUFFICIENT_STOCK';
              itemDebug.error = `Not enough stock. Available: ${productData.stock}, Requested: ${cartData.quantity}`;
            } else {
              itemDebug.status = 'STOCK_OK';
              itemDebug.message = `Stock sufficient. Available: ${productData.stock}, Requested: ${cartData.quantity}`;
            }
          }
        }
        
        debugInfo.push(itemDebug);
        console.log('[DEBUG] Item analysis:', itemDebug);
      }

      return NextResponse.json({
        userId,
        cartItemsCount: cartSnap.size,
        debugInfo,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('[DEBUG] Stock debug error:', error);
      return NextResponse.json({
        error: 'Failed to debug stock',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  });
}