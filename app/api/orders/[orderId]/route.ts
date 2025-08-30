// app/api/orders/[orderId]/route.ts - COMPLETE FIXED VERSION
import { NextRequest, NextResponse } from 'next/server';
import { adminDB, serverTimestamp } from '@/lib/firebaseAdmin';
import { withAuth } from '@/lib/auth-middleware';
import { handleFirebaseError } from '@/lib/firebase-utils';

const ORDERS = adminDB.collection('orders');
const PRODUCTS = adminDB.collection('products');

// GET: Get specific order details
export async function GET(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  return withAuth(req, async (req: NextRequest, token: any) => {
    try {
      const { orderId } = params;
      const userId = token.sub || token.id;
      const isAdmin = token.role === 'admin' || token.isAdmin === true;

      if (!orderId) {
        return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
      }

      const orderRef = ORDERS.doc(orderId);
      const orderDoc = await orderRef.get();

      if (!orderDoc.exists) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      const orderData = orderDoc.data();

      // Check authorization - user can only see their own orders, admin can see all
      if (!isAdmin && orderData?.userId !== userId) {
        return NextResponse.json({ error: 'Unauthorized access to order' }, { status: 403 });
      }

      // Helper function to safely convert timestamps
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

      const order = {
        id: orderId,
        userId: orderData?.userId,
        items: Array.isArray(orderData?.items) ? orderData.items : [],
        totalAmount: typeof orderData?.totalAmount === 'number' ? orderData.totalAmount : 0,
        status: orderData?.status || 'pending',
        paymentStatus: orderData?.paymentStatus || 'pending',
        paymentDetails: orderData?.paymentDetails || {},
        shippingInfo: orderData?.shippingInfo || {},
        orderDate: toISOString(orderData?.orderDate) || toISOString(orderData?.createdAt),
        createdAt: toISOString(orderData?.createdAt),
        updatedAt: toISOString(orderData?.updatedAt),
        shippedAt: toISOString(orderData?.shippedAt),
        deliveredAt: toISOString(orderData?.deliveredAt),
        cancelledAt: toISOString(orderData?.cancelledAt),
        trackingNumber: orderData?.trackingNumber,
        adminNotes: orderData?.adminNotes
      };

      return NextResponse.json({
        success: true,
        order
      });

    } catch (error) {
      console.error('[DEBUG] Order GET error:', error);
      return NextResponse.json({
        error: 'Failed to fetch order',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  });
}

// PATCH: Update order (admin can update any field, user can only cancel pending orders)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  return withAuth(req, async (req: NextRequest, token: any) => {
    try {
      const { orderId } = params;
      const userId = token.sub || token.id;
      const isAdmin = token.role === 'admin' || token.isAdmin === true;
      const updateData = await req.json();

      if (!orderId) {
        return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
      }

      const orderRef = ORDERS.doc(orderId);
      const orderDoc = await orderRef.get();

      if (!orderDoc.exists) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      const orderData = orderDoc.data();

      // Authorization check
      if (!isAdmin && orderData?.userId !== userId) {
        return NextResponse.json({ error: 'Unauthorized access to order' }, { status: 403 });
      }

      // Validate update permissions
      if (!isAdmin) {
        // Non-admin users can only cancel their own pending orders
        if (updateData.status && updateData.status !== 'cancelled') {
          return NextResponse.json({ error: 'Users can only cancel orders' }, { status: 403 });
        }
        
        if (orderData?.status !== 'pending') {
          return NextResponse.json({ 
            error: 'Only pending orders can be cancelled',
            currentStatus: orderData?.status 
          }, { status: 400 });
        }
      } else {
        // Admin validations
        if (updateData.status) {
          const validStatuses = ['pending', 'completed', 'shipped', 'delivered', 'cancelled'];
          if (!validStatuses.includes(updateData.status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
          }
        }
      }

      // Prepare update data
      const finalUpdateData: any = {
        ...updateData,
        updatedAt: serverTimestamp()
      };

      // Add status-specific timestamps
      if (updateData.status) {
        const now = serverTimestamp();
        
        if (updateData.status === 'shipped') {
          finalUpdateData.shippedAt = now;
        } else if (updateData.status === 'delivered') {
          finalUpdateData.deliveredAt = now;
          if (!orderData?.shippedAt) {
            finalUpdateData.shippedAt = now;
          }
        } else if (updateData.status === 'cancelled') {
          finalUpdateData.cancelledAt = now;
        }
      }

      // Use transaction for order cancellation to restore stock
      if (updateData.status === 'cancelled' && orderData?.status !== 'cancelled') {
        await adminDB.runTransaction(async (transaction: any) => {
          // Update order
          transaction.update(orderRef, finalUpdateData);

          // Restore stock for pending orders
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
        await orderRef.update(finalUpdateData);
      }

      // Get updated order
      const updatedOrderDoc = await orderRef.get();
      const updatedOrder = updatedOrderDoc.data();

      // Helper function to safely convert timestamps
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
          return null;
        }
      };

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
      console.error('[DEBUG] Order update error:', error);
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

// DELETE: Delete order (admin only, or user for pending orders)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  return withAuth(req, async (req: NextRequest, token: any) => {
    try {
      const { orderId } = params;
      const userId = token.sub || token.id;
      const isAdmin = token.role === 'admin' || token.isAdmin === true;

      if (!orderId) {
        return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
      }

      const orderRef = ORDERS.doc(orderId);
      const orderDoc = await orderRef.get();

      if (!orderDoc.exists) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      const orderData = orderDoc.data();

      // Authorization check
      if (!isAdmin && orderData?.userId !== userId) {
        return NextResponse.json({ error: 'Unauthorized access to order' }, { status: 403 });
      }

      // Non-admin users can only delete pending orders
      if (!isAdmin && orderData?.status !== 'pending') {
        return NextResponse.json({
          error: 'Only pending orders can be deleted',
          currentStatus: orderData?.status
        }, { status: 400 });
      }

      // Use transaction to delete order and restore stock
      await adminDB.runTransaction(async (transaction: any) => {
        // Delete the order
        transaction.delete(orderRef);

        // Restore stock if it was a pending order with items
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

      console.log(`[DEBUG] Order ${orderId} deleted successfully`);

      return NextResponse.json({
        success: true,
        message: 'Order deleted successfully',
        orderId
      });

    } catch (error) {
      console.error('[DEBUG] Order deletion error:', error);
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