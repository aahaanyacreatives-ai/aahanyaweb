// app/api/orders/route.ts - FIXED VERSION WITH ATOMIC STOCK MANAGEMENT
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

interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'pending' | 'completed' | 'cancelled';
  orderDate: Date;
  paymentDetails: Record<string, any>;
  paymentStatus: 'pending' | 'success' | 'failed';
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
        } as Order;
      });
      
      return NextResponse.json(orders);
    } catch (error) {
      console.error('[DEBUG] Orders GET error:', error);
      
      if (error && typeof error === 'object' && 'code' in error && error.code === 9) {
        return NextResponse.json({ 
          error: 'Database index required. Please create composite index for orders collection.',
          details: 'Create index with fields: userId (Ascending), orderDate (Descending)',
          indexRequired: true
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        error: 'Failed to fetch orders', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }, { status: 500 });
    }
  });
}

// POST: Create new order (requires authentication) - FIXED VERSION
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

      // 🔥 CRITICAL FIX: Use transaction to atomically check stock AND create order
      const orderRef = ORDERS.doc();
      let orderData: any;
      
      try {
        await adminDB.runTransaction(async (transaction) => {
          const items: OrderItem[] = [];
          let totalAmount = 0;
          const stockUpdates: { ref: any; currentStock: number; newStock: number; productName: string }[] = [];

          // 1. First, get all cart items and validate products in the transaction
          for (const cartDoc of cartSnap.docs) {
            const cartData = cartDoc.data();
            
            // Get product within transaction to ensure consistent read
            const productRef = PRODUCTS.doc(cartData.productId);
            const productSnap = await transaction.get(productRef);
            
            if (!productSnap.exists) {
              throw new Error(`Product ${cartData.productId} no longer exists`);
            }
            
            const productData = productSnap.data()!;
            
            // 🔥 CRITICAL: Check stock atomically within transaction
            const currentStock = productData.stock;
            const requestedQuantity = cartData.quantity || 1;
            
            // If product tracks stock, validate availability
            if (currentStock !== undefined) {
              if (currentStock < requestedQuantity) {
                throw new Error(`Insufficient stock for "${productData.name}". Available: ${currentStock}, Requested: ${requestedQuantity}`);
              }
              
              // Prepare stock update
              stockUpdates.push({
                ref: productRef,
                currentStock,
                newStock: currentStock - requestedQuantity,
                productName: productData.name
              });
            }

            const orderItem: OrderItem = {
              productId: cartData.productId,
              name: productData.name || cartData.name || 'Unknown Product',
              image: cartData.image || productData.images?.[0] || null,
              price: productData.price || cartData.price || 0,
              quantity: requestedQuantity,
              customSize: cartData.customSize || null,
              customImage: cartData.customImage || null
            };

            items.push(orderItem);
            totalAmount += orderItem.price * orderItem.quantity;
          }

          // 2. Create order data
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
            id: orderRef.id
          };

          // 3. Atomically: Create order + Update stock + Clear cart
          transaction.set(orderRef, orderData);
          
          // Update product stocks
          stockUpdates.forEach(({ ref, newStock }) => {
            transaction.update(ref, {
              stock: newStock,
              updatedAt: new Date()
            });
          });
          
          // Clear cart items
          cartSnap.docs.forEach(doc => {
            transaction.delete(doc.ref);
          });

          console.log('[DEBUG] Transaction completed successfully. Stock updates:', stockUpdates.map(u => `${u.productName}: ${u.currentStock} → ${u.newStock}`));
        });

        console.log('[DEBUG] Order created with ID:', orderRef.id);

        return NextResponse.json({ 
          success: true, 
          message: 'Order created successfully',
          order: orderData
        }, { status: 201 });

      } catch (transactionError) {
        console.error('[DEBUG] Transaction failed:', transactionError);
        
        // Handle specific stock errors
        if (transactionError instanceof Error && transactionError.message.includes('Insufficient stock')) {
          return NextResponse.json({ 
            error: 'Insufficient stock',
            details: transactionError.message
          }, { status: 400 });
        }
        
        throw transactionError; // Re-throw other errors
      }

    } catch (error) {
      console.error('[DEBUG] Order creation error:', error);
      if (error && typeof error === 'object' && 'code' in error) {
        return handleFirebaseError(error);
      }
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

      // Validate required fields
      if (!orderId || !razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
        return NextResponse.json({ 
          error: 'Missing payment verification details',
          required: ['orderId', 'razorpay_payment_id', 'razorpay_order_id', 'razorpay_signature']
        }, { status: 400 });
      }

      // Check if Razorpay secret is configured
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
      
      // Verify order belongs to user
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

      // Get updated order data
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
      if (error && typeof error === 'object' && 'code' in error) {
        return handleFirebaseError(error);
      }
      return NextResponse.json({ 
        error: 'Failed to verify payment',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  });
}

// DELETE: Cancel order (requires authentication, only for pending orders)
export async function DELETE(req: NextRequest) {
  return withAuth(req, async (req: NextRequest, token: any) => {
    try {
      console.log('[DEBUG] DELETE /api/orders called for user:', token.sub || token.id);
      
      const userId = token.sub || token.id;
      const { searchParams } = new URL(req.url);
      const orderId = searchParams.get('orderId');
      
      if (!userId) {
        return NextResponse.json({ error: 'User ID not found in token' }, { status: 400 });
      }
      
      if (!orderId) {
        return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
      }

      // Get order
      const orderRef = ORDERS.doc(orderId);
      const orderSnap = await orderRef.get();
      
      if (!orderSnap.exists) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      const orderData = orderSnap.data();
      
      // Verify order belongs to user
      if (orderData?.userId !== userId) {
        return NextResponse.json({ error: 'Unauthorized access to order' }, { status: 403 });
      }

      // Only allow cancellation of pending orders
      if (orderData?.status !== 'pending') {
        return NextResponse.json({ 
          error: 'Only pending orders can be cancelled',
          currentStatus: orderData?.status 
        }, { status: 400 });
      }

      // Use transaction to restore stock and update order
      await adminDB.runTransaction(async (transaction) => {
        // Update order status
        transaction.update(orderRef, {
          status: 'cancelled',
          updatedAt: new Date(),
          cancelledAt: new Date()
        });

        // Restore product stock if applicable
        if (orderData?.items) {
          for (const item of orderData.items) {
            const productRef = PRODUCTS.doc(item.productId);
            const productSnap = await transaction.get(productRef);
            
            if (productSnap.exists) {
              const productData = productSnap.data()!;
              if (productData.stock !== undefined) {
                transaction.update(productRef, {
                  stock: productData.stock + item.quantity,
                  updatedAt: new Date()
                });
              }
            }
          }
        }
      });

      console.log('[DEBUG] Order cancelled and stock restored:', orderId);

      return NextResponse.json({ 
        success: true, 
        message: 'Order cancelled successfully',
        orderId: orderId
      });

    } catch (error) {
      console.error('[DEBUG] Order cancellation error:', error);
      if (error && typeof error === 'object' && 'code' in error) {
        return handleFirebaseError(error);
      }
      return NextResponse.json({ 
        error: 'Failed to cancel order',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  });
}