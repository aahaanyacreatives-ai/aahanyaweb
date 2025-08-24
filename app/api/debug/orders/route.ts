// app/api/debug/orders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDB } from '@/lib/firebaseAdmin';

export async function GET(req: NextRequest) {
  try {
    console.log('[DEBUG] Testing orders collection access...');
    
    const ordersRef = adminDB.collection('orders');
    const snapshot = await ordersRef.limit(5).get();
    
    console.log('[DEBUG] Orders collection test - found:', snapshot.size, 'documents');
    
    const orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({
      success: true,
      message: 'Orders collection access successful',
      ordersCount: snapshot.size,
      orders: orders
    });

  } catch (error) {
    console.error('[DEBUG] Orders debug error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Check your Firebase Admin configuration'
    }, { status: 500 });
  }
}
