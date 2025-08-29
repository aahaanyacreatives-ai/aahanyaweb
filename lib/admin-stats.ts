// lib/admin-stats.ts
import { adminDB } from './firebaseAdmin';

const STATS = adminDB.collection('adminStats');
const DAILY_STATS = adminDB.collection('dailyStats');

export interface AdminStats {
  totalOrders: number;
  totalEarnings: number;
  lastUpdated: Date;
}

export interface DailyStats {
  date: string;
  orders: number;
  earnings: number;
  lastUpdated: Date;
}

export async function updateAdminStats(orderAmount: number) {
  const statsRef = STATS.doc('overall');
  const today = new Date().toISOString().split('T')[0];
  const dailyStatsRef = DAILY_STATS.doc(today);

  await adminDB.runTransaction(async (transaction) => {
    // Update overall stats
    const statsDoc = await transaction.get(statsRef);
    if (!statsDoc.exists) {
      transaction.set(statsRef, {
        totalOrders: 1,
        totalEarnings: orderAmount,
        lastUpdated: new Date()
      });
    } else {
      const currentStats = statsDoc.data() as AdminStats;
      transaction.update(statsRef, {
        totalOrders: currentStats.totalOrders + 1,
        totalEarnings: currentStats.totalEarnings + orderAmount,
        lastUpdated: new Date()
      });
    }

    // Update daily stats
    const dailyStatsDoc = await transaction.get(dailyStatsRef);
    if (!dailyStatsDoc.exists) {
      transaction.set(dailyStatsRef, {
        date: today,
        orders: 1,
        earnings: orderAmount,
        lastUpdated: new Date()
      });
    } else {
      const currentDailyStats = dailyStatsDoc.data() as DailyStats;
      transaction.update(dailyStatsRef, {
        orders: currentDailyStats.orders + 1,
        earnings: currentDailyStats.earnings + orderAmount,
        lastUpdated: new Date()
      });
    }
  });
}
