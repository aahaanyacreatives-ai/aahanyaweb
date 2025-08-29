// app/api/orders/route.ts - TEMPORARY VERSION WITH STOCK CHECK DISABLED
// ⚠️ WARNING: This temporarily disables stock checking - use only for debugging
import { NextRequest, NextResponse } from 'next/server';
import { adminDB } from '@/lib/firebaseAdmin';
import { withAuth } from '@/lib/auth-middleware';
import { handleFirebaseError } from '@/lib/firebase-utils';
import crypto from 'crypto';

interface CartItem {
  productId: string;
  name: string;
  image?: string | null;
  price: number;
  quantity: number;
  customSize?: string | null;
  customImage?: string | null;
}

interface OrderItem extends CartItem {
  name: string;
}

const ORDERS = adminDB.collection('orders');
const CART = adminDB.collection('cart');
const PRODUCTS = adminDB.collection('products');

// GET: Get user's orders (requires authentication)
export async function GET(req: NextRequest) {
  return withAuth(req, async (req: NextRequest, token: any) => {
    try {
      console.log('[DEBUG] GET /api/orders called for user:', token.sub || token.id);
      
      const userId = token.sub || token.id;
      
      if (!userId) {
        return NextResponse.json({ error: 'User ID not found in token' }, { status: 400 });
      }
      
      const snap = await ORDERS.where('userId', '==', userId)
                              .orderBy('orderDate', 'desc')
                              .get();
      
      console.log('[DEBUG] Orders found:', snap.size);
      
      const orders = snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          items: data.items || [],
          totalAmount: data.totalAmount || 0,
          status: data.status || 'pending',
          orderDate: data.orderDate || data.createdAt,
          paymentDetails: data.paymentDetails || {},
          paymentStatus: data.paymentStatus || 'pending',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          shippingInfo: data.shippingInfo || {}
        };
      });
      
      return NextResponse.json(orders);
    } catch (error) {
      console.error('[DEBUG] Orders GET error:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch orders', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }, { status: 500 });
    }
  });
}

// POST: Create new order - TEMPORARY NO STOCK CHECK VERSION
export async function POST(req: NextRequest) {
  return withAuth(req, async (req: NextRequest, token: any) => {
    try {
      console.log('[DEBUG] POST /api/orders called for user:', token.sub || token.id);
      
      const userId = token.sub || token.id;
      
      if (!userId) {
        return NextResponse.json({ error: 'User ID not found in token' }, { status: 400 });
      }
      
      const { shippingInfo } = await req.json();

      // Get cart items
      const cartSnap = await CART.where('userId', '==', userId).get();
      if (cartSnap.empty) {
        return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
      }

      const orderRef = ORDERS.doc();
      let orderData: any;
      
      try {
        await adminDB.runTransaction(async (transaction) => {
          const items: OrderItem[] = [];
          let totalAmount = 0;

          // Process cart items WITHOUT stock checking
          for (const cartDoc of cartSnap.docs) {
            const cartData = cartDoc.data();
            
            console.log('[DEBUG] Processing cart item:', cartData);
            
            // Get product within transaction
            const productRef = PRODUCTS.doc(cartData.productId);
            const productSnap = await transaction.get(productRef);
            
            if (!productSnap.exists) {
              console.log('[DEBUG] Product not found:', cartData.productId);
              throw new Error(`Product ${cartData.productId} no longer exists`);
            }
            
            const productData = productSnap.data()!;
            console.log('[DEBUG] Product data:', productData);

            // ⚠️ TEMPORARILY SKIP STOCK CHECK
            console.log('[DEBUG] SKIPPING STOCK CHECK - TEMPORARY FOR DEBUGGING');

            const orderItem: OrderItem = {
              productId: cartData.productId,
              name: productData.name || cartData.name || 'Unknown Product',
              image: cartData.image || productData.images?.[0] || null,
              price: productData.price || cartData.price || 0,
              quantity: cartData.quantity || 1,
              customSize: cartData.customSize || null,
              customImage: cartData.customImage || null
            };

            items.push(orderItem);
            totalAmount += orderItem.price * orderItem.quantity;
            
            console.log('[DEBUG] Order item created:', orderItem);
          }

          // Create order data
          orderData = {
            userId,
            items,
            totalAmount,
            status: 'pending' as const,
            orderDate: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
            paymentDetails: {},
            paymentStatus: 'pending' as const,
            shippingInfo: shippingInfo || {},
            id: orderRef.id,
            stockCheckDisabled: true // Mark that stock check was disabled
          };

          console.log('[DEBUG] Creating order:', orderData);

          // Create order and clear cart (NO stock updates)
          transaction.set(orderRef, orderData);
          
          // Clear cart items
          cartSnap.docs.forEach(doc => {
            transaction.delete(doc.ref);
          });

          console.log('[DEBUG] Transaction prepared successfully');
        });

        console.log('[DEBUG] Order created with ID:', orderRef.id);

        return NextResponse.json({ 
          success: true, 
          message: 'Order created successfully (stock check disabled)',
          order: orderData,
          warning: 'Stock checking is temporarily disabled'
        }, { status: 201 });

      } catch (transactionError) {
        console.error('[DEBUG] Transaction failed:', transactionError);
        throw transactionError;
      }

    } catch (error) {
      console.error('[DEBUG] Order creation error:', error);
      return NextResponse.json({ 
        error: 'Failed to create order',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  });
}

// PATCH: Verify payment and update order (requires authentication)
export async function PATCH(req: NextRequest) {
  return withAuth(req, async (req: NextRequest, token: any) => {
    try {
      console.log('[DEBUG] PATCH /api/orders called for user:', token.sub || token.id);
      
      const userId = token.sub || token.id;
      
      if (!userId) {
        return NextResponse.json({ error: 'User ID not found in token' }, { status: 400 });
      }
      
      const { orderId, razorpay_payment_id, razorpay_order_id, razorpay_signature } = await req.json();

      if (!orderId || !razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
        return NextResponse.json({ 
          error: 'Missing payment verification details',
          required: ['orderId', 'razorpay_payment_id', 'razorpay_order_id', 'razorpay_signature']
        }, { status: 400 });
      }

      if (!process.env.RAZORPAY_KEY_SECRET) {
        console.error('[DEBUG] RAZORPAY_KEY_SECRET not configured');
        return NextResponse.json({ 
          error: 'Payment gateway not configured' 
        }, { status: 500 });
      }

      // Verify payment signature
      const generatedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (generatedSignature !== razorpay_signature) {
        console.error('[DEBUG] Payment signature verification failed');
        return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 });
      }

      // Get and validate order
      const orderRef = ORDERS.doc(orderId);
      const orderSnap = await orderRef.get();
      
      if (!orderSnap.exists) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      const orderData = orderSnap.data();
      
      if (orderData?.userId !== userId) {
        console.error('[DEBUG] Unauthorized access to order:', orderId, 'by user:', userId);
        return NextResponse.json({ error: 'Unauthorized access to order' }, { status: 403 });
      }

      // Update order with payment details
      const updateData = {
        status: 'completed',
        paymentStatus: 'success',
        paymentDetails: {
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
          verifiedAt: new Date()
        },
        updatedAt: new Date()
      };

      await orderRef.update(updateData);
      console.log('[DEBUG] Order payment verified and updated:', orderId);

      const updatedOrderSnap = await orderRef.get();
      const updatedOrder = updatedOrderSnap.data();

      return NextResponse.json({ 
        success: true, 
        message: 'Payment verified and order updated successfully',
        order: { 
          id: orderId, 
          ...updatedOrder 
        }
      });

    } catch (error) {
      console.error('[DEBUG] Payment verification error:', error);
      return NextResponse.json({ 
        error: 'Failed to verify payment',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  });
}