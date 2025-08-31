import { NextRequest, NextResponse } from 'next/server';
import { adminDB, serverTimestamp, Timestamp } from '@/lib/firebaseAdmin';
import { withAuth } from '@/lib/auth-middleware';
import { handleFirebaseError } from '@/lib/firebase-utils';

const ORDERS = adminDB.collection('orders');
const USERS = adminDB.collection('users');

// GET: Get all orders (requires admin authentication)
export async function GET(req: NextRequest) {
  return withAuth(req, async (req: NextRequest, token: any) => {
    try {
      const timestamp = new Date().toISOString();
      console.log(`[DEBUG ${timestamp}] Token in admin/orders:`, JSON.stringify(token));

      const isAdmin = token.role === 'admin' || 
                      token.isAdmin === true || 
                      token.admin === true ||
                      token.email === 'admin@yourdomain.com'; // adjust as needed

      if (!isAdmin) {
        console.log(`[DEBUG ${timestamp}] Access denied - User role:`, token.role, 'isAdmin:', token.isAdmin);
        return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
      }

      console.log(`[DEBUG ${timestamp}] GET /api/admin/orders called by admin`);

      const { searchParams } = new URL(req.url);
      const showShippedOnly = searchParams.get('shipped') === 'true';
      const status = searchParams.get('status');
      const limit = parseInt(searchParams.get('limit') || '50');
      const page = parseInt(searchParams.get('page') || '1');

      let query = ORDERS.orderBy('createdAt', 'desc');

      if (showShippedOnly) {
        query = query.where('status', '==', 'shipped');
      } else if (status && ['pending', 'completed', 'shipped', 'delivered', 'cancelled'].includes(status)) {
        query = query.where('status', '==', status);
      }

      if (page > 1) {
        const offset = (page - 1) * limit;
        query = query.offset(offset);
      }
      query = query.limit(limit);

      const snap = await query.get();
      console.log(`[DEBUG ${timestamp}] Orders found:`, snap.size);

      const orders = [];
      const userCache = new Map();

      // Helper to convert Firestore timestamps safely
      const toISOString = (timestamp: any) => {
        try {
          if (!timestamp) return null;
          if (typeof timestamp.toDate === 'function') return timestamp.toDate().toISOString();
          if (timestamp instanceof Date) return timestamp.toISOString();
          if (typeof timestamp === 'string') return new Date(timestamp).toISOString();
          return null;
        } catch {
          return null;
        }
      };

      for (const doc of snap.docs) {
        const data = doc.data();

        if (data.userId && !userCache.has(data.userId)) {
          try {
            const userSnap = await USERS.doc(data.userId).get();
            if (userSnap.exists) {
              const userData = userSnap.data();
              userCache.set(data.userId, {
                email: userData?.email || 'Unknown',
                name: userData?.name || userData?.displayName || 'Unknown User',
                phone: userData?.phone || null
              });
            } else {
              userCache.set(data.userId, { email: 'Unknown', name: 'Unknown User', phone: null });
            }
          } catch {
            userCache.set(data.userId, { email: 'Unknown', name: 'Unknown User', phone: null });
          }
        }

        const userDetails = userCache.get(data.userId) || { email: 'Unknown', name: 'Unknown User', phone: null };

        orders.push({
          id: doc.id,
          userId: data.userId || 'unknown',
          userDetails,
          items: Array.isArray(data.items) ? data.items.map((item: any) => ({
            productId: item.productId || '',
            name: item.name || 'Unknown Product',
            image: item.image || null,
            price: typeof item.price === 'number' ? item.price : 0,
            quantity: typeof item.quantity === 'number' ? item.quantity : 1,
            customSize: item.customSize || null,
            customImage: item.customImage || null
          })) : [],
          totalAmount: typeof data.totalAmount === 'number' ? data.totalAmount : 0,
          status: data.status || 'pending',
          paymentStatus: data.paymentStatus || 'pending',
          paymentDetails: data.paymentDetails || {},
          shippingInfo: data.shippingInfo || {},
          orderDate: toISOString(data.orderDate) || toISOString(data.createdAt) || new Date().toISOString(),
          createdAt: toISOString(data.createdAt) || new Date().toISOString(),
          updatedAt: toISOString(data.updatedAt) || toISOString(data.createdAt) || new Date().toISOString(),
          shippedAt: toISOString(data.shippedAt),
          deliveredAt: toISOString(data.deliveredAt),
          cancelledAt: toISOString(data.cancelledAt)
        });
      }

      const totalQuery = ORDERS.select();
      const totalSnap = await totalQuery.get();
      const total = totalSnap.size;

      const stats = {
        total: orders.length,
        pending: orders.filter(o => o.status === 'pending').length,
        completed: orders.filter(o => o.status === 'completed').length,
        shipped: orders.filter(o => o.status === 'shipped').length,
        delivered: orders.filter(o => o.status === 'delivered').length,
        cancelled: orders.filter(o => o.status === 'cancelled').length,
        totalRevenue: orders
          .filter(o => ['completed', 'shipped', 'delivered'].includes(o.status))
          .reduce((sum, o) => sum + o.totalAmount, 0)
      };

      console.log(`[DEBUG ${timestamp}] Sending response with ${orders.length} orders`);
      console.log(`[DEBUG ${timestamp}] Stats:`, stats);

      return NextResponse.json({
        success: true,
        orders,
        stats,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: page * limit < total
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('[DEBUG] Admin Orders GET error:', error);
      if (error && typeof error === 'object' && 'code' in error && error.code === 9) {
        return NextResponse.json({
          error: 'Database index required. Please create composite index for orders collection.',
          details: 'Create index with fields: createdAt (Descending), status (Ascending)',
          indexRequired: true
        }, { status: 500 });
      }

      return NextResponse.json({
        success: false,
        error: 'Failed to fetch orders',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
  }, { requireAdmin: true });
}


// PATCH: Update order status (mark as shipped/delivered)
export async function PATCH(req: NextRequest) {
  return withAuth(req, async (req: NextRequest, token: any) => {
    try {
      const timestamp = new Date().toISOString();

      const isAdmin = token.role === 'admin' ||
                      token.isAdmin === true ||
                      token.admin === true;

      if (!isAdmin) {
        console.log(`[DEBUG ${timestamp}] Access denied - User role:`, token.role);
        return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
      }

      const { orderId, status, action, trackingNumber, notes } = await req.json();

      if (!orderId) {
        return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
      }

      // Determine the status to set
      let newStatus = status;
      if (action) {
        if (!['shipped', 'delivered', 'cancelled', 'completed'].includes(action)) {
          return NextResponse.json({ error: 'Invalid action. Must be shipped, delivered, cancelled, or completed' }, { status: 400 });
        }
        newStatus = action;
      }

      if (!newStatus || !['pending', 'completed', 'shipped', 'delivered', 'cancelled'].includes(newStatus)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }

      const orderRef = ORDERS.doc(orderId);
      const orderSnap = await orderRef.get();

      if (!orderSnap.exists) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      const now = serverTimestamp();
      const updateData: any = {
        status: newStatus,
        updatedAt: now
      };

      if (newStatus === 'shipped') {
        updateData.shippedAt = now;
        if (trackingNumber) updateData.trackingNumber = trackingNumber;
      } else if (newStatus === 'delivered') {
        updateData.deliveredAt = now;
        if (!orderSnap.data()?.shippedAt) {
          updateData.shippedAt = now; // Set shipped date if not already set
        }
      } else if (newStatus === 'cancelled') {
        updateData.cancelledAt = now;
      } else if (newStatus === 'completed') {
        // Optional: add completedAt timestamp if you want
        updateData.completedAt = now;
      }

      if (notes) {
        updateData.adminNotes = notes;
      }

      await orderRef.update(updateData);

      console.log(`[DEBUG ${timestamp}] Order ${orderId} updated to ${newStatus}`);

      const updatedOrderSnap = await orderRef.get();
      const updatedOrder = updatedOrderSnap.data();

      return NextResponse.json({
        success: true,
        message: `Order ${newStatus} successfully`,
        order: {
          id: orderId,
          ...updatedOrder,
          orderDate: updatedOrder?.orderDate?.toDate?.()?.toISOString?.(),
          createdAt: updatedOrder?.createdAt?.toDate?.()?.toISOString?.(),
          updatedAt: updatedOrder?.updatedAt?.toDate?.()?.toISOString?.(),
          shippedAt: updatedOrder?.shippedAt?.toDate?.()?.toISOString?.(),
          deliveredAt: updatedOrder?.deliveredAt?.toDate?.()?.toISOString?.(),
          cancelledAt: updatedOrder?.cancelledAt?.toDate?.()?.toISOString?.(),
          completedAt: updatedOrder?.completedAt?.toDate?.()?.toISOString?.()
        }
      });

    } catch (error) {
      console.error('[DEBUG] Admin Orders PATCH error:', error);
      if (error && typeof error === 'object' && 'code' in error) {
        return handleFirebaseError(error);
      }
      return NextResponse.json({
        success: false,
        error: 'Failed to update order status',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
  }, { requireAdmin: true });
}

// DELETE: Delete order (admin only)
export async function DELETE(req: NextRequest) {
  return withAuth(req, async (req: NextRequest, token: any) => {
    try {
      const timestamp = new Date().toISOString();

      const isAdmin = token.role === 'admin' ||
                      token.isAdmin === true ||
                      token.admin === true;

      if (!isAdmin) {
        console.log(`[DEBUG ${timestamp}] Access denied - User role:`, token.role);
        return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
      }

      const { searchParams } = new URL(req.url);
      const orderId = searchParams.get('orderId');

      if (!orderId) {
        return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
      }

      const orderRef = ORDERS.doc(orderId);
      const orderSnap = await orderRef.get();

      if (!orderSnap.exists) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      await adminDB.runTransaction(async (transaction: any) => {
        transaction.delete(orderRef);

        if (orderSnap.data()?.status === 'pending' && orderSnap.data()?.items) {
          const PRODUCTS = adminDB.collection('products');

          for (const item of orderSnap.data()?.items || []) {
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

      console.log(`[DEBUG ${timestamp}] Order ${orderId} deleted by admin`);

      return NextResponse.json({
        success: true,
        message: 'Order deleted successfully',
        orderId: orderId
      });

    } catch (error) {
      console.error('[DEBUG] Admin Orders DELETE error:', error);
      if (error && typeof error === 'object' && 'code' in error) {
        return handleFirebaseError(error);
      }
      return NextResponse.json({
        success: false,
        error: 'Failed to delete order',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
  }, { requireAdmin: true });
}
