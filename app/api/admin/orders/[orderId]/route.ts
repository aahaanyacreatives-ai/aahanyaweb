import { NextRequest, NextResponse } from 'next/server';
import { adminDB } from '@/lib/firebaseAdmin';
import { withAuth } from '@/lib/auth-middleware';
import { handleFirebaseError } from '@/lib/firebase-utils';
import { updateAdminStats } from '@/lib/admin-stats';

const ORDERS = adminDB.collection('orders');

// PATCH: Update order status as admin
export async function PATCH(req: NextRequest, { params }: { params: { orderId: string } }) {
  return withAuth(req, async (req: NextRequest, token: any) => {
    try {
      // Verify admin role
      if (!token.isAdmin) {
        return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
      }

      const { orderId } = params;
      const { status, shippedAt } = await req.json();

      console.log('[DEBUG] PATCH /api/admin/orders called for order:', orderId);

      if (!orderId) {
        return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
      }

      // Get order
      const orderRef = ORDERS.doc(orderId);
      const orderSnap = await orderRef.get();
      
      if (!orderSnap.exists) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      // Update order status
      await orderRef.update({
        status,
        ...(shippedAt ? { shippedAt: new Date(shippedAt) } : {}),
        updatedAt: new Date()
      });

      // Get updated order data
      const updatedSnap = await orderRef.get();
      const updatedData = updatedSnap.data();

      return NextResponse.json({
        success: true,
        message: 'Order updated successfully',
        order: {
          id: orderId,
          ...updatedData,
          orderDate: updatedData?.orderDate?.toDate()?.toISOString(),
          shippedAt: updatedData?.shippedAt?.toDate()?.toISOString(),
          deliveredAt: updatedData?.deliveredAt?.toDate()?.toISOString(),
          createdAt: updatedData?.createdAt?.toDate()?.toISOString(),
          updatedAt: updatedData?.updatedAt?.toDate()?.toISOString()
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

// DELETE: Delete order as admin
export async function DELETE(req: NextRequest, { params }: { params: { orderId: string } }) {
  return withAuth(req, async (req: NextRequest, token: any) => {
    try {
      // Verify admin role
      if (!token.isAdmin) {
        return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
      }

      const { orderId } = params;
      console.log('[DEBUG] DELETE /api/admin/orders called for order:', orderId);

      if (!orderId) {
        return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
      }

      // Get order
      const orderRef = ORDERS.doc(orderId);
      const orderSnap = await orderRef.get();
      
      if (!orderSnap.exists) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      // Delete order
      await orderRef.delete();

      console.log('[DEBUG] Order deleted:', orderId);

      return NextResponse.json({ 
        success: true, 
        message: 'Order deleted successfully',
        orderId: orderId
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
