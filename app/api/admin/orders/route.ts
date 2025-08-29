import { NextRequest, NextResponse } from 'next/server';
import { adminDB } from '@/lib/firebaseAdmin';
import { withAuth } from '@/lib/auth-middleware';
import { handleFirebaseError } from '@/lib/firebase-utils';

const ORDERS = adminDB.collection('orders');

// GET: Get all orders (requires admin authentication)
export async function GET(req: NextRequest) {
  return withAuth(req, async (req: NextRequest, token: any) => {
    try {
      // Verify admin role
      if (!token.isAdmin) {
        return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
      }

      console.log('[DEBUG] GET /api/admin/orders called by admin');
      
      const snap = await ORDERS
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
          orderDate: data.orderDate?.toDate()?.toISOString() || data.createdAt?.toDate()?.toISOString(),
          paymentDetails: data.paymentDetails || {},
          paymentStatus: data.paymentStatus || 'pending',
          shippingInfo: data.shippingInfo || {},
          shippedAt: data.shippedAt?.toDate()?.toISOString(),
          deliveredAt: data.deliveredAt?.toDate()?.toISOString(),
          createdAt: data.createdAt?.toDate()?.toISOString(),
          updatedAt: data.updatedAt?.toDate()?.toISOString()
        };
      });
      
      return NextResponse.json(orders);
    } catch (error) {
      console.error('[DEBUG] Admin Orders GET error:', error);
      
      if (error && typeof error === 'object' && 'code' in error && error.code === 9) {
        return NextResponse.json({ 
          error: 'Database index required. Please create composite index for orders collection.',
          details: 'Create index with fields: orderDate (Descending)',
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
