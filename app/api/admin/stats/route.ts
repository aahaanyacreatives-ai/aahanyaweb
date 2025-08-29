// app/api/admin/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDB } from '@/lib/firebaseAdmin';
import { withAuth } from '@/lib/auth-middleware';
import type { AdminStats, DailyStats } from '@/lib/admin-stats';

// GET: Fetch admin statistics
export async function GET(req: NextRequest) {
  return withAuth(req, async (req: NextRequest, token: any) => {
    try {
      // Verify admin role (you should implement proper admin role checking)
      const userId = token.sub || token.id;
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Get overall stats
      const statsRef = adminDB.collection('adminStats').doc('overall');
      const statsSnap = await statsRef.get();
      
      // Get daily stats for the last 30 days
      const today = new Date();
      const dailyStats: DailyStats[] = [];
      
      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        
        const dailyStatsRef = adminDB.collection('dailyStats').doc(dateString);
        const dailyStatsSnap = await dailyStatsRef.get();
        
        if (dailyStatsSnap.exists) {
          dailyStats.push(dailyStatsSnap.data() as DailyStats);
        }
      }

      return NextResponse.json({
        overall: statsSnap.exists ? statsSnap.data() : { totalOrders: 0, totalEarnings: 0 },
        daily: dailyStats
      });

    } catch (error) {
      console.error('[DEBUG] Error fetching admin stats:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch admin statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  });
}
