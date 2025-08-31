// app/api/orders/route.ts - FIXED VERSION
import { NextRequest, NextResponse } from 'next/server';
import { adminDB, serverTimestamp, Timestamp } from '@/lib/firebaseAdmin';
import { withAuth } from '@/lib/auth-middleware';
import { handleFirebaseError } from '@/lib/firebase-utils';
import { updateAdminStats } from '@/lib/admin-stats';
import crypto from 'crypto';

const ORDERS = adminDB.collection('orders');
const CART = adminDB.collection('cart');
const PRODUCTS = adminDB.collection('products');
const USERS = adminDB.collection('users'); // Add users collection

export async function GET(req: NextRequest) {
  return withAuth(req, async (req: NextRequest, token: any) => {
    try {
      const userId = token.sub || token.id;
      if (!userId) {
        return NextResponse.json({ error: 'User ID not found in token' }, { status: 400 });
      }
      const snap = await ORDERS.where('userId', '==', userId)
        .orderBy('orderDate', 'desc')
        .get();

      const orders = snap.docs.map((doc: any) => {
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

export async function POST(req: NextRequest) {
  return withAuth(req, async (req: NextRequest, token: any) => {
    try {
      const userId = token.sub || token.id;
      if (!userId) {
        return NextResponse.json({ error: 'User ID not found in token' }, { status: 400 });
      }
      
      // ✅ FIXED: Get both shippingInfo and cartItems from request
      const { 
        shippingInfo, 
        cartItems, 
        subtotal, 
        shipping, 
        totalAmount, 
        appliedCoupon 
      } = await req.json();

      console.log('[DEBUG] Order creation request:', {
        userId,
        shippingInfo,
        cartItemsCount: cartItems?.length,
        totalAmount
      });

      // ✅ FIXED: Use cartItems from request instead of fetching from cart collection
      if (!cartItems || cartItems.length === 0) {
        return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
      }

      // ✅ FIXED: Get user details for better customer information
      interface UserDetails {
        email?: string;
        name?: string;
        phone?: string;
      }

      let userDetails: UserDetails = {};
      try {
        const userDoc = await USERS.doc(userId).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          userDetails = {
            email: userData?.email || '',
            name: userData?.name || userData?.displayName || '',
            phone: userData?.phone || ''
          };
        }
      } catch (userError) {
        console.warn('[DEBUG] Could not fetch user details:', userError);
      }

      const orderRef = ORDERS.doc();
      let orderData: any;

      try {
        await adminDB.runTransaction(async (transaction: any) => {
          const items: any[] = [];

          // ✅ FIXED: Process cartItems directly from request
          for (const cartItem of cartItems) {
            const product = cartItem.product;
            
            // Verify product still exists
            const productRef = PRODUCTS.doc(product.id);
            const productSnap = await transaction.get(productRef);
            
            if (!productSnap.exists) {
              throw new Error(`Product ${product.id} no longer exists`);
            }
            
            const productData = productSnap.data()!;

            const orderItem = {
              productId: product.id,
              name: product.name || productData.name || 'Unknown Product',
              image: product.images?.[0] || productData.images?.[0] || null,
              price: product.price || productData.price || 0,
              quantity: cartItem.quantity || 1,
              customSize: cartItem.customSize || null,
              customImage: cartItem.customImage || null
            };
            
            items.push(orderItem);
          }

          const now = Timestamp.now();
          
          // ✅ FIXED: Enhanced order data with complete customer information
          orderData = {
            userId,
            items,
            totalAmount: totalAmount || 0,
            subtotal: subtotal || 0,
            shipping: shipping || 0,
            appliedCoupon: appliedCoupon || null,
            status: 'pending',
            orderDate: now,
            createdAt: now,
            updatedAt: now,
            paymentDetails: {},
            paymentStatus: 'pending',
            
            // ✅ FIXED: Complete shipping information with proper mapping
            shippingInfo: {
              firstName: shippingInfo?.firstName || '',
              lastName: shippingInfo?.lastName || '',
              name: `${shippingInfo?.firstName || ''} ${shippingInfo?.lastName || ''}`.trim() || userDetails.name || '',
              email: userDetails.email || shippingInfo?.email || '',
              phone: shippingInfo?.phone || userDetails.phone || '',
              address: shippingInfo?.address || '',
              city: shippingInfo?.city || '',
              state: shippingInfo?.state || '',
              zip: shippingInfo?.zip || '',
              pinCode: shippingInfo?.zip || '',
              notes: shippingInfo?.notes || ''
            },
            
            // ✅ FIXED: Store user details separately for admin panel
            userDetails: {
              email: userDetails.email || shippingInfo?.firstName + '@example.com',
              name: userDetails.name || `${shippingInfo?.firstName || ''} ${shippingInfo?.lastName || ''}`.trim() || 'Unknown User',
              phone: shippingInfo?.phone || userDetails.phone || 'N/A'
            },
            
            id: orderRef.id
          };

          console.log('[DEBUG] Creating order with data:', {
            orderId: orderRef.id,
            userId,
            itemsCount: items.length,
            shippingInfo: orderData.shippingInfo,
            userDetails: orderData.userDetails
          });

          transaction.set(orderRef, orderData);
        });

        console.log('[DEBUG] Order created successfully:', orderRef.id);

        return NextResponse.json({
          success: true,
          message: 'Order created successfully',
          order: orderData
        }, { status: 201 });

      } catch (transactionError) {
        console.error('[DEBUG] Transaction error:', transactionError);
        if (transactionError instanceof Error && transactionError.message.includes('Insufficient stock')) {
          return NextResponse.json({
            error: 'Insufficient stock',
            details: transactionError.message
          }, { status: 400 });
        }
        throw transactionError;
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

export async function PATCH(req: NextRequest) {
  return withAuth(req, async (req: NextRequest, token: any) => {
    try {
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
        return NextResponse.json({
          error: 'Payment gateway not configured'
        }, { status: 500 });
      }

      const generatedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (generatedSignature !== razorpay_signature) {
        return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 });
      }

      const orderRef = ORDERS.doc(orderId);
      const orderSnap = await orderRef.get();

      if (!orderSnap.exists) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      const orderData = orderSnap.data();

      if (orderData?.userId !== userId) {
        return NextResponse.json({ error: 'Unauthorized access to order' }, { status: 403 });
      }

      const updateData = {
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

      if (orderData && typeof orderData.totalAmount === 'number') {
        await updateAdminStats(orderData.totalAmount);
      }

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

export async function DELETE(req: NextRequest) {
  return withAuth(req, async (req: NextRequest, token: any) => {
    try {
      const userId = token.sub || token.id;
      const { searchParams } = new URL(req.url);
      const orderId = searchParams.get('orderId');

      if (!userId) {
        return NextResponse.json({ error: 'User ID not found in token' }, { status: 400 });
      }
      if (!orderId) {
        return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
      }
      const orderRef = ORDERS.doc(orderId);
      const orderSnap = await orderRef.get();
      if (!orderSnap.exists) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }
      const orderData = orderSnap.data();
      if (orderData?.userId !== userId) {
        return NextResponse.json({ error: 'Unauthorized access to order' }, { status: 403 });
      }
      if (orderData?.status !== 'pending') {
        return NextResponse.json({
          error: 'Only pending orders can be cancelled',
          currentStatus: orderData?.status
        }, { status: 400 });
      }

      await adminDB.runTransaction(async (transaction: any) => {
        transaction.update(orderRef, {
          status: 'cancelled',
          updatedAt: new Date(),
          cancelledAt: new Date()
        });

        if (orderData?.items) {
          for (const item of orderData.items) {
            const productRef = PRODUCTS.doc(item.productId);
            const productSnap = await transaction.get(productRef);
            if (productSnap.exists) {
              const productData = productSnap.data()!;
              if (productData.stock !== undefined) {
                transaction.update(productRef, {
                  stock: productData.stock + item.quantity,
                  updatedAt: serverTimestamp()
                });
              }
            }
          }
        }
      });

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