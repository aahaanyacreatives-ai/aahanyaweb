// app/api/admin/orders/route.ts - NEW ADMIN ORDERS API
import { NextRequest, NextResponse } from 'next/server';
import { adminDB, serverTimestamp } from '@/lib/firebaseAdmin';
import { withAuth } from '@/lib/auth-middleware';
import { handleFirebaseError } from '@/lib/firebase-utils';

const ORDERS = adminDB.collection('orders');
const USERS = adminDB.collection('users');
const PRODUCTS = adminDB.collection('products');

// Helper function to safely convert Firestore timestamps
const toISOString = (timestamp: any) => {
  try {
    if (!timestamp) return null;
    if (typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toISOString();
    }
    if (timestamp instanceof Date) {
      return timestamp.toISOString();
    }
    return null;
  } catch (e) {
    console.error('Date conversion error:', e);
    return null;
  }
};

// GET: Fetch all orders (Admin only)
export async function GET(req: NextRequest) {
  return withAuth(req, async (req: NextRequest, token: any) => {
    try {
      const isAdmin = token.role === 'admin' || token.isAdmin === true;
      
      if (!isAdmin) {
        return NextResponse.json({ 
          error: 'Access denied. Admin privileges required.' 
        }, { status: 403 });
      }

      console.log('[DEBUG] Admin fetching all orders...');

      // Get URL parameters for filtering/pagination
      const { searchParams } = new URL(req.url);
      const status = searchParams.get('status');
      const limit = parseInt(searchParams.get('limit') || '100');
      const offset = parseInt(searchParams.get('offset') || '0');

      // Build query
      let query = ORDERS.orderBy('orderDate', 'desc');
      
      if (status && status !== 'all') {
        query = query.where('status', '==', status);
      }

      // Apply limit and offset
      if (offset > 0) {
        const offsetSnapshot = await ORDERS.orderBy('orderDate', 'desc')
          .limit(offset)
          .get();
        
        if (!offsetSnapshot.empty) {
          const lastDoc = offsetSnapshot.docs[offsetSnapshot.docs.length - 1];
          query = query.startAfter(lastDoc);
        }
      }
      
      query = query.limit(limit);

      const ordersSnapshot = await query.get();

      if (ordersSnapshot.empty) {
        return NextResponse.json({
          success: true,
          orders: [],
          stats: {
            total: 0,
            pending: 0,
            completed: 0,
            shipped: 0,
            delivered: 0,
            cancelled: 0,
            totalRevenue: 0
          }
        });
      }

      // Process orders and enhance with user data
      const orders = await Promise.all(
        ordersSnapshot.docs.map(async (doc) => {
          const orderData = doc.data();
          
          // Try to get additional user details if not already present
          let enhancedUserDetails = orderData.userDetails || {};
          
          if (orderData.userId && (!enhancedUserDetails.email || !enhancedUserDetails.name)) {
            try {
              const userDoc = await USERS.doc(orderData.userId).get();
              if (userDoc.exists) {
                const userData = userDoc.data();
                enhancedUserDetails = {
                  email: enhancedUserDetails.email || userData?.email || 'Unknown',
                  name: enhancedUserDetails.name || userData?.name || userData?.displayName || 'Unknown User',
                  phone: enhancedUserDetails.phone || userData?.phone || orderData.shippingInfo?.phone || 'N/A'
                };
              }
            } catch (userError) {
              console.warn(`[DEBUG] Could not fetch user ${orderData.userId}:`, userError);
            }
          }

          // Fallback to shipping info if user details are still incomplete
          if (!enhancedUserDetails.name || enhancedUserDetails.name === 'Unknown User') {
            const shippingName = orderData.shippingInfo?.name || 
              `${orderData.shippingInfo?.firstName || ''} ${orderData.shippingInfo?.lastName || ''}`.trim();
            if (shippingName) {
              enhancedUserDetails.name = shippingName;
            }
          }

          if (!enhancedUserDetails.email || enhancedUserDetails.email === 'Unknown') {
            if (orderData.shippingInfo?.email) {
              enhancedUserDetails.email = orderData.shippingInfo.email;
            }
          }

          return {
            id: doc.id,
            userId: orderData.userId || 'Unknown',
            userDetails: enhancedUserDetails,
            items: Array.isArray(orderData.items) ? orderData.items : [],
            totalAmount: typeof orderData.totalAmount === 'number' ? orderData.totalAmount : 0,
            subtotal: typeof orderData.subtotal === 'number' ? orderData.subtotal : 0,
            shipping: typeof orderData.shipping === 'number' ? orderData.shipping : 0,
            appliedCoupon: orderData.appliedCoupon || null,
            status: orderData.status || 'pending',
            paymentStatus: orderData.paymentStatus || 'pending',
            paymentDetails: orderData.paymentDetails || {},
            shippingInfo: orderData.shippingInfo || {},
            orderDate: toISOString(orderData.orderDate) || toISOString(orderData.createdAt),
            createdAt: toISOString(orderData.createdAt),
            updatedAt: toISOString(orderData.updatedAt),
            shippedAt: toISOString(orderData.shippedAt),
            deliveredAt: toISOString(orderData.deliveredAt),
            cancelledAt: toISOString(orderData.cancelledAt),
            trackingNumber: orderData.trackingNumber,
            adminNotes: orderData.adminNotes
          };
        })
      );

      // Calculate stats
      const stats = {
        total: orders.length,
        pending: orders.filter(o => o.status === 'pending').length,
        completed: orders.filter(o => o.status === 'completed').length,
        shipped: orders.filter(o => o.status === 'shipped').length,
        delivered: orders.filter(o => o.status === 'delivered').length,
        cancelled: orders.filter(o => o.status === 'cancelled').length,
        totalRevenue: orders
          .filter(o => o.status !== 'cancelled')
          .reduce((sum, o) => sum + o.totalAmount, 0)
      };

      console.log('[DEBUG] Fetched orders:', {
        count: orders.length,
        stats
      });

      return NextResponse.json({
        success: true,
        orders,
        stats
      });

    } catch (error) {
      console.error('[DEBUG] Admin orders fetch error:', error);
      return NextResponse.json({
        error: 'Failed to fetch orders',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  });
}

// PATCH: Update order status (Admin only)
export async function PATCH(req: NextRequest) {
  return withAuth(req, async (req: NextRequest, token: any) => {
    try {
      const isAdmin = token.role === 'admin' || token.isAdmin === true;
      
      if (!isAdmin) {
        return NextResponse.json({ 
          error: 'Access denied. Admin privileges required.' 
        }, { status: 403 });
      }

      const { orderId, status, action, trackingNumber, adminNotes } = await req.json();

      if (!orderId) {
        return NextResponse.json({ 
          error: 'Order ID is required' 
        }, { status: 400 });
      }

      console.log('[DEBUG] Admin updating order:', {
        orderId,
        status,
        action,
        trackingNumber,
        adminNotes
      });

      const orderRef = ORDERS.doc(orderId);
      const orderDoc = await orderRef.get();

      if (!orderDoc.exists) {
        return NextResponse.json({ 
          error: 'Order not found' 
        }, { status: 404 });
      }

      const orderData = orderDoc.data();

      // Validate status
      const validStatuses = ['pending', 'completed', 'shipped', 'delivered', 'cancelled'];
      if (status && !validStatuses.includes(status)) {
        return NextResponse.json({ 
          error: 'Invalid status' 
        }, { status: 400 });
      }

      // Prepare update data
      const updateData: any = {
        updatedAt: serverTimestamp()
      };

      if (status) {
        updateData.status = status;
        
        // Add status-specific timestamps
        const now = serverTimestamp();
        if (status === 'shipped') {
          updateData.shippedAt = now;
        } else if (status === 'delivered') {
          updateData.deliveredAt = now;
          if (!orderData?.shippedAt) {
            updateData.shippedAt = now;
          }
        } else if (status === 'cancelled') {
          updateData.cancelledAt = now;
        } else if (status === 'completed') {
          updateData.completedAt = now;
        }
      }

      if (trackingNumber) {
        updateData.trackingNumber = trackingNumber;
      }

      if (adminNotes !== undefined) {
        updateData.adminNotes = adminNotes;
      }

      // Use transaction for cancellation to restore stock
      if (status === 'cancelled' && orderData?.status !== 'cancelled') {
        await adminDB.runTransaction(async (transaction: any) => {
          transaction.update(orderRef, updateData);

          // Restore stock if order was pending
          if (orderData?.status === 'pending' && orderData?.items) {
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
      } else {
        // Regular update
        await orderRef.update(updateData);
      }

      // Get updated order
      const updatedOrderDoc = await orderRef.get();
      const updatedOrder = updatedOrderDoc.data();

      console.log('[DEBUG] Order updated successfully:', orderId);

      return NextResponse.json({
        success: true,
        message: 'Order updated successfully',
        order: {
          id: orderId,
          ...updatedOrder,
          orderDate: toISOString(updatedOrder?.orderDate) || toISOString(updatedOrder?.createdAt),
          createdAt: toISOString(updatedOrder?.createdAt),
          updatedAt: toISOString(updatedOrder?.updatedAt),
          shippedAt: toISOString(updatedOrder?.shippedAt),
          deliveredAt: toISOString(updatedOrder?.deliveredAt),
          cancelledAt: toISOString(updatedOrder?.cancelledAt)
        }
      });

    } catch (error) {
      console.error('[DEBUG] Admin order update error:', error);
      if (error && typeof error === 'object' && 'code' in error) {
        return handleFirebaseError(error);
      }
      return NextResponse.json({
        error: 'Failed to update order',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  });
}

// DELETE: Delete order (Admin only)
export async function DELETE(req: NextRequest) {
  return withAuth(req, async (req: NextRequest, token: any) => {
    try {
      const isAdmin = token.role === 'admin' || token.isAdmin === true;
      
      if (!isAdmin) {
        return NextResponse.json({ 
          error: 'Access denied. Admin privileges required.' 
        }, { status: 403 });
      }

      const { searchParams } = new URL(req.url);
      const orderId = searchParams.get('orderId');

      if (!orderId) {
        return NextResponse.json({ 
          error: 'Order ID is required' 
        }, { status: 400 });
      }

      console.log('[DEBUG] Admin deleting order:', orderId);

      const orderRef = ORDERS.doc(orderId);
      const orderDoc = await orderRef.get();

      if (!orderDoc.exists) {
        return NextResponse.json({ 
          error: 'Order not found' 
        }, { status: 404 });
      }

      const orderData = orderDoc.data();

      // Use transaction to delete and restore stock
      await adminDB.runTransaction(async (transaction: any) => {
        transaction.delete(orderRef);

        // Restore stock if it was a pending order
        if (orderData?.status === 'pending' && orderData?.items) {
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

      console.log('[DEBUG] Order deleted successfully:', orderId);

      return NextResponse.json({
        success: true,
        message: 'Order deleted successfully',
        orderId
      });

    } catch (error) {
      console.error('[DEBUG] Admin order deletion error:', error);
      if (error && typeof error === 'object' && 'code' in error) {
        return handleFirebaseError(error);
      }
      return NextResponse.json({
        error: 'Failed to delete order',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  });
}