import { NextRequest, NextResponse } from 'next/server';
import { adminDB } from '@/lib/firebaseAdmin';

const COUPONS = adminDB.collection('coupons');

/* ───────────── GET ───────────── */
export async function GET(req: Request) {
  try {
    const code = new URL(req.url).searchParams.get('code');

    // Return single coupon by code
    if (code) {
      const snap = await COUPONS.where('code', '==', code.toUpperCase()).get();
      if (snap.empty) {
        return NextResponse.json({ error: 'Coupon not found or invalid' }, { status: 404 });
      }
      const doc = snap.docs[0];                                     // ✅ first document
      return NextResponse.json({ id: doc.id, ...doc.data() });      // ✅ doc.data()
    }

    // Return all coupons
    const snap = await COUPONS.get();
    const coupons = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return NextResponse.json(coupons);
  } catch (err) {
    console.error('Error fetching coupons:', err);
    return NextResponse.json({ error: 'Failed to fetch coupons' }, { status: 500 });
  }
}

/* ───────────── POST ───────────── */
export async function POST(req: Request) {
  try {
    const { code, type, value, usageLimit, validFrom, validUntil } = await req.json();

    if (!code || !type || value === undefined) {
      return NextResponse.json({ error: 'Code, type, and value are required' }, { status: 400 });
    }
    if (!validFrom || !validUntil) {
      return NextResponse.json({ error: 'validFrom and validUntil are required' }, { status: 400 });
    }
    if (new Date(validFrom) >= new Date(validUntil)) {
      return NextResponse.json({ error: 'validUntil must be after validFrom' }, { status: 400 });
    }

    const existsSnap = await COUPONS.where('code', '==', code.toUpperCase()).get();
    if (!existsSnap.empty) {
      return NextResponse.json({ error: 'Coupon code already exists' }, { status: 409 });
    }

    const docRef = await COUPONS.add({
      code: code.toUpperCase(),
      type,
      value,
      isActive: true,
      usageLimit,
      usedCount: 0,
      validFrom: new Date(validFrom),
      validUntil: new Date(validUntil),
      createdAt: new Date(),
    });

    return NextResponse.json({ id: docRef.id }, { status: 201 });
  } catch (err) {
    console.error('Error adding coupon:', err);
    return NextResponse.json({ error: 'Failed to add coupon' }, { status: 500 });
  }
}

/* ───────────── PATCH ───────────── */
export async function PATCH(req: Request) {
  try {
    const body = await req.json();

    /* ---------- 1. Usage-only update ---------- */
    if (body.id && !body.updateData) {
      const docRef = COUPONS.doc(body.id);
      const snap = await docRef.get();
      if (!snap.exists) return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });

      const data = snap.data()!;                                   // ✅ non-null (exists checked)
      await docRef.update({ usedCount: (data.usedCount || 0) + 1 });
      return NextResponse.json({ message: 'Coupon usage updated' }, { status: 200 });
    }

    /* ---------- 2. General update ---------- */
    const { id, updateData } = body;
    if (!id || !updateData) {
      return NextResponse.json({ error: 'Coupon ID and updateData are required' }, { status: 400 });
    }

    const docRef = COUPONS.doc(id);
    const snap = await docRef.get();
    if (!snap.exists) return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });

    // Date validation (if either date supplied)
    if (updateData.validFrom || updateData.validUntil) {
      const base = snap.data()!;                                   // ✅ non-null (exists checked)
      const validFrom = updateData.validFrom ?? base.validFrom;
      const validUntil = updateData.validUntil ?? base.validUntil;
      if (new Date(validFrom) >= new Date(validUntil)) {
        return NextResponse.json({ error: 'validUntil must be after validFrom' }, { status: 400 });
      }
    }

    await docRef.update({ ...updateData, updatedAt: new Date() });
    return NextResponse.json({ message: 'Coupon updated successfully' }, { status: 200 });
  } catch (err) {
    console.error('Error updating coupon:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/* ───────────── DELETE ───────────── */
export async function DELETE(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Coupon ID is required' }, { status: 400 });

    const docRef = COUPONS.doc(id);
    const snap = await docRef.get();
    if (!snap.exists) return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });

    await docRef.delete();
    return NextResponse.json({ message: 'Coupon deleted' }, { status: 200 });
  } catch (err) {
    console.error('Error deleting coupon:', err);
    return NextResponse.json({ error: 'Failed to delete coupon' }, { status: 500 });
  }
}
