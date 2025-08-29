import { NextRequest, NextResponse } from 'next/server';
import { adminDB } from '@/lib/firebaseAdmin';
import { withAuth } from '@/lib/auth-middleware';
import { handleFirebaseError } from '@/lib/firebase-utils';

const ORDERS = adminDB.collection('orders');

// GET: Get all orders (requires admin authentication)
export async function GET(req: NextRequest) {
  return withAuth(req, async (req: NextRequest, token: any) => {
    try {
      const timestamp = new Date().toISOString();
      console.log(`[DEBUG ${timestamp}] Token in admin/orders:`, JSON.stringify(token));

      // Verify admin role
      if (token.role !== 'admin') {
        console.log(`[DEBUG ${timestamp}] Access denied - User role:`, token.role);
        return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
      }

      console.log(`[DEBUG ${timestamp}] GET /api/admin/orders called by admin`);
      
      // Get orders, fallback to createdAt if orderDate is not available
      const snap = await ORDERS
        .orderBy('createdAt', 'desc')
        .get();
      
      console.log(`[DEBUG ${timestamp}] Orders found:`, snap.size);
      
      const orders = snap.docs.map(doc => {
        const data = doc.data();
        console.log(`[DEBUG ${timestamp}] Processing order:`, doc.id, JSON.stringify(data));

        // Helper function to safely convert Firestore timestamp to ISO string
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
            console.error(`[DEBUG ${timestamp}] Date conversion error for order ${doc.id}:`, e);
            return null;
          }
        };

        return {
          id: doc.id,
          userId: data.userId,
          items: Array.isArray(data.items) ? data.items : [],
          totalAmount: typeof data.totalAmount === 'number' ? data.totalAmount : 0,
          status: data.status || 'pending',
          orderDate: toISOString(data.orderDate) || toISOString(data.createdAt),
          paymentDetails: data.paymentDetails || {},
          paymentStatus: data.paymentStatus || 'pending',
          shippingInfo: data.shippingInfo || {},
          shippedAt: toISOString(data.shippedAt),
          deliveredAt: toISOString(data.deliveredAt),
          createdAt: toISOString(data.createdAt),
          updatedAt: toISOString(data.updatedAt)
        };
      });
      
      // Log the response for debugging
      console.log(`[DEBUG ${timestamp}] Sending response with ${orders.length} orders`);

      return NextResponse.json(orders);
    } catch (error) {
      console.error('[DEBUG] Admin Orders GET error:', error);
      
      if (error && typeof error === 'object' && 'code' in error && error.code === 9) {
        return NextResponse.json({ 
          error: 'Database index required. Please create composite index for orders collection.',
          details: 'Create index with fields: createdAt (Descending)',
          indexRequired: true
        }, { status: 500 });
      }

      // More detailed error logging
      if (error instanceof Error) {
        console.error('[DEBUG] Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
      
      return NextResponse.json({ 
        error: 'Failed to fetch orders', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
  }, { requireAdmin: true });
}
