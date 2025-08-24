import { NextRequest, NextResponse } from 'next/server';
import { adminDB } from '@/lib/firebaseAdmin';
import { withAuth } from '@/lib/auth-middleware';

const CART = adminDB.collection('cart');
const PRODUCTS = adminDB.collection('products');

// GET: Get user's cart with product details
export async function GET(req: NextRequest) {
  return withAuth(req, async (req: NextRequest, token: any) => {
    try {
      const userId = token.sub || token.id;
      
      const snap = await CART.where('userId', '==', userId).get();
      const cartItems = [];

      // ✅ FIXED: Fetch product details for each cart item
      for (const doc of snap.docs) {
        const cartData = doc.data();
        
        // Fetch product details
        const productSnap = await PRODUCTS.doc(cartData.productId).get();
        let product = null;
        
        if (productSnap.exists) {
          product = { id: productSnap.id, ...productSnap.data() };
        }

        cartItems.push({
          id: doc.id,
          ...cartData,
          product
        });
      }

      return NextResponse.json({ cart: cartItems });
    } catch (error) {
      console.error('Cart GET error:', error);
      return NextResponse.json({ error: 'Failed to fetch cart' }, { status: 500 });
    }
  });
}

// POST: Add/update item in cart
export async function POST(req: NextRequest) {
  return withAuth(req, async (req: NextRequest, token: any) => {
    try {
      const userId = token.sub || token.id;
      const { productId, quantity = 1, customSize, customImage } = await req.json();
      
      if (!productId) {
        return NextResponse.json({ error: "Product ID required" }, { status: 400 });
      }

      // Check if product exists
      const productSnap = await PRODUCTS.doc(productId).get();
      if (!productSnap.exists) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }

      const query = CART.where('userId', '==', userId)
                        .where('productId', '==', productId)
                        .where('customSize', '==', customSize || null);
      const snap = await query.get();

      if (!snap.empty) {
        const doc = snap.docs[0];
        const data = doc.data();
        await doc.ref.update({
          quantity: data.quantity + quantity,
          customImage: customImage || data.customImage,
          updatedAt: new Date()
        });
        return NextResponse.json({ success: true, cartItem: doc.id });
      } else {
        const docRef = await CART.add({
          userId,
          productId,
          quantity,
          customSize: customSize || null,
          customImage: customImage || null,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        return NextResponse.json({ success: true, cartItem: docRef.id });
      }
    } catch (error) {
      console.error('Cart POST error:', error);
      return NextResponse.json({ error: 'Failed to add to cart' }, { status: 500 });
    }
  });
}

// DELETE: Remove cart item or clear entire cart
export async function DELETE(req: NextRequest) {
  return withAuth(req, async (req: NextRequest, token: any) => {
    try {
      const userId = token.sub || token.id;
      const url = new URL(req.url);
      const productId = url.searchParams.get('productId');
      const customSize = url.searchParams.get('customSize');

      if (!productId) {
        // Clear entire cart
        const snap = await CART.where('userId', '==', userId).get();
        const batch = adminDB.batch();
        snap.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        return NextResponse.json({ success: true });
      }

      // Remove specific item
      const query = CART.where('userId', '==', userId)
                        .where('productId', '==', productId)
                        .where('customSize', '==', customSize || null);
      const snap = await query.get();

      if (snap.empty) {
        return NextResponse.json({ error: "Cart item not found" }, { status: 404 });
      }

      await snap.docs[0].ref.delete();
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Cart DELETE error:', error);
      return NextResponse.json({ error: 'Failed to remove from cart' }, { status: 500 });
    }
  });
}
