import { NextRequest, NextResponse } from 'next/server';
import { adminDB } from '@/lib/firebaseAdmin';
import { withAuth } from '@/lib/auth-middleware';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  return withAuth(req, async (req: NextRequest) => {
    try {
      const { orderId } = params;
      const orderRef = adminDB.collection('orders').doc(orderId);
      const orderDoc = await orderRef.get();

      if (!orderDoc.exists) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      const updateData = await req.json();
      
      // Validate status updates
      if (updateData.status) {
        const validStatuses = ['pending', 'shipped', 'delivered', 'cancelled'];
        if (!validStatuses.includes(updateData.status)) {
          return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }
      }

      // Update order
      await orderRef.update({
        ...updateData,
        updatedAt: new Date()
      });

      // Get updated order
      const updatedOrderDoc = await orderRef.get();
      const updatedOrder = updatedOrderDoc.data();

      return NextResponse.json({
        success: true,
        message: 'Order updated successfully',
        order: {
          id: orderId,
          ...updatedOrder
        }
      });

    } catch (error) {
      console.error('[DEBUG] Order update error:', error);
      return NextResponse.json({
        error: 'Failed to update order',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  return withAuth(req, async (req: NextRequest) => {
    try {
      const { orderId } = params;
      const orderRef = adminDB.collection('orders').doc(orderId);
      const orderDoc = await orderRef.get();

      if (!orderDoc.exists) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      // Only allow deletion of pending orders
      const orderData = orderDoc.data();
      if (orderData?.status !== 'pending') {
        return NextResponse.json({
          error: 'Only pending orders can be deleted',
          currentStatus: orderData?.status
        }, { status: 400 });
      }

      // Delete the order
      await orderRef.delete();

      return NextResponse.json({
        success: true,
        message: 'Order deleted successfully',
        orderId
      });

    } catch (error) {
      console.error('[DEBUG] Order deletion error:', error);
      return NextResponse.json({
        error: 'Failed to delete order',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  });
}
