import { NextRequest, NextResponse } from 'next/server';
import { adminDB, serverTimestamp } from '@/lib/firebaseAdmin';
import { withAuth } from '@/lib/auth-middleware';

const COUPONS = adminDB.collection('coupons');

/* ───────────── GET ───────────── */
export async function GET(req: NextRequest) {
  return withAuth(req, async (req: NextRequest, token: any) => {
    try {
      const { searchParams } = new URL(req.url);
      const code = searchParams.get('code');
      
      // For public coupon validation (no admin check needed)
      if (code) {
        const snap = await COUPONS.where('code', '==', code.toUpperCase()).get();
        if (snap.empty) {
          return NextResponse.json({ error: 'Coupon not found or invalid' }, { status: 404 });
        }
        
        const doc = snap.docs[0];
        const couponData = doc.data();
        
        // Check if coupon is valid
        const now = new Date();
        const validFrom = couponData.validFrom?.toDate ? couponData.validFrom.toDate() : new Date(couponData.validFrom);
        const validUntil = couponData.validUntil?.toDate ? couponData.validUntil.toDate() : new Date(couponData.validUntil);
        
        if (!couponData.isActive || now < validFrom || now > validUntil) {
          return NextResponse.json({ error: 'Coupon is not valid or has expired' }, { status: 400 });
        }
        
        if (couponData.usageLimit && couponData.usedCount >= couponData.usageLimit) {
          return NextResponse.json({ error: 'Coupon usage limit exceeded' }, { status: 400 });
        }
        
        return NextResponse.json({ 
          id: doc.id, 
          ...couponData,
          validFrom: validFrom.toISOString(),
          validUntil: validUntil.toISOString(),
          createdAt: couponData.createdAt?.toDate?.()?.toISOString() || null
        });
      }
      
      // For admin to get all coupons - require admin role
      const isAdmin = token.role === 'admin' || token.isAdmin === true || token.admin === true;
      if (!isAdmin) {
        return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
      }
      
      const snap = await COUPONS.orderBy('createdAt', 'desc').get();
      const coupons = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          validFrom: data.validFrom?.toDate?.()?.toISOString() || null,
          validUntil: data.validUntil?.toDate?.()?.toISOString() || null,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null
        };
      });
      
      return NextResponse.json({
        success: true,
        coupons
      });
      
    } catch (err) {
      console.error('Error fetching coupons:', err);
      return NextResponse.json({ 
        error: 'Failed to fetch coupons',
        details: err instanceof Error ? err.message : 'Unknown error'
      }, { status: 500 });
    }
  });
}

/* ───────────── POST ───────────── */
export async function POST(req: NextRequest) {
  return withAuth(req, async (req: NextRequest, token: any) => {
    try {
      // Check admin role
      const isAdmin = token.role === 'admin' || token.isAdmin === true || token.admin === true;
      if (!isAdmin) {
        return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
      }
      
      const { code, type, value, usageLimit, validFrom, validUntil, description } = await req.json();
      
      // Validation
      if (!code || !type || value === undefined) {
        return NextResponse.json({ 
          error: 'Code, type, and value are required' 
        }, { status: 400 });
      }
      
      if (!validFrom || !validUntil) {
        return NextResponse.json({ 
          error: 'validFrom and validUntil are required' 
        }, { status: 400 });
      }
      
      if (new Date(validFrom) >= new Date(validUntil)) {
        return NextResponse.json({ 
          error: 'validUntil must be after validFrom' 
        }, { status: 400 });
      }
      
      if (type === 'percentage' && (value < 0 || value > 100)) {
        return NextResponse.json({ 
          error: 'Percentage discount must be between 0 and 100' 
        }, { status: 400 });
      }
      
      if (type === 'fixed' && value < 0) {
        return NextResponse.json({ 
          error: 'Fixed discount must be positive' 
        }, { status: 400 });
      }
      
      // Check if code already exists
      const existsSnap = await COUPONS.where('code', '==', code.toUpperCase()).get();
      if (!existsSnap.empty) {
        return NextResponse.json({ 
          error: 'Coupon code already exists' 
        }, { status: 409 });
      }
      
      // Create coupon
      const couponData = {
        code: code.toUpperCase(),
        type,
        value: Number(value),
        isActive: true,
        usageLimit: usageLimit ? Number(usageLimit) : null,
        usedCount: 0,
        validFrom: new Date(validFrom),
        validUntil: new Date(validUntil),
        description: description || '',
        createdAt: serverTimestamp(),
        createdBy: token.email || token.sub
      };
      
      const docRef = await COUPONS.add(couponData);
      
      return NextResponse.json({ 
        success: true,
        message: 'Coupon created successfully',
        id: docRef.id 
      }, { status: 201 });
      
    } catch (err) {
      console.error('Error adding coupon:', err);
      return NextResponse.json({ 
        error: 'Failed to add coupon',
        details: err instanceof Error ? err.message : 'Unknown error'
      }, { status: 500 });
    }
  }, { requireAdmin: true });
}

/* ───────────── PATCH ───────────── */
export async function PATCH(req: NextRequest) {
  return withAuth(req, async (req: NextRequest, token: any) => {
    try {
      const body = await req.json();
      
      /* ---------- 1. Usage-only update (for checkout) ---------- */
      if (body.id && !body.updateData) {
        const docRef = COUPONS.doc(body.id);
        const snap = await docRef.get();
        
        if (!snap.exists) {
          return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
        }
        
        const data = snap.data()!;
        await docRef.update({ 
          usedCount: (data.usedCount || 0) + 1,
          updatedAt: serverTimestamp()
        });
        
        return NextResponse.json({ 
          success: true,
          message: 'Coupon usage updated' 
        });
      }
      
      /* ---------- 2. Admin update ---------- */
      const isAdmin = token.role === 'admin' || token.isAdmin === true || token.admin === true;
      if (!isAdmin) {
        return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
      }
      
      const { id, updateData } = body;
      if (!id || !updateData) {
        return NextResponse.json({ 
          error: 'Coupon ID and updateData are required' 
        }, { status: 400 });
      }
      
      const docRef = COUPONS.doc(id);
      const snap = await docRef.get();
      
      if (!snap.exists) {
        return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
      }
      
      // Date validation
      if (updateData.validFrom || updateData.validUntil) {
        const currentData = snap.data()!;
        const validFrom = updateData.validFrom ? new Date(updateData.validFrom) : currentData.validFrom?.toDate?.() || currentData.validFrom;
        const validUntil = updateData.validUntil ? new Date(updateData.validUntil) : currentData.validUntil?.toDate?.() || currentData.validUntil;
        
        if (validFrom >= validUntil) {
          return NextResponse.json({ 
            error: 'validUntil must be after validFrom' 
          }, { status: 400 });
        }
      }
      
      // Convert dates if provided
      const finalUpdateData = { ...updateData };
      if (updateData.validFrom) finalUpdateData.validFrom = new Date(updateData.validFrom);
      if (updateData.validUntil) finalUpdateData.validUntil = new Date(updateData.validUntil);
      
      await docRef.update({ 
        ...finalUpdateData, 
        updatedAt: serverTimestamp(),
        updatedBy: token.email || token.sub
      });
      
      return NextResponse.json({ 
        success: true,
        message: 'Coupon updated successfully' 
      });
      
    } catch (err) {
      console.error('Error updating coupon:', err);
      return NextResponse.json({ 
        error: 'Failed to update coupon',
        details: err instanceof Error ? err.message : 'Unknown error'
      }, { status: 500 });
    }
  });
}

/* ───────────── DELETE ───────────── */
export async function DELETE(req: NextRequest) {
  return withAuth(req, async (req: NextRequest, token: any) => {
    try {
      // Check admin role
      const isAdmin = token.role === 'admin' || token.isAdmin === true || token.admin === true;
      if (!isAdmin) {
        return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
      }
      
      const { searchParams } = new URL(req.url);
      const id = searchParams.get('id');
      
      if (!id) {
        return NextResponse.json({ error: 'Coupon ID is required' }, { status: 400 });
      }
      
      const docRef = COUPONS.doc(id);
      const snap = await docRef.get();
      
      if (!snap.exists) {
        return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
      }
      
      await docRef.delete();
      
      return NextResponse.json({ 
        success: true,
        message: 'Coupon deleted successfully' 
      });
      
    } catch (err) {
      console.error('Error deleting coupon:', err);
      return NextResponse.json({ 
        error: 'Failed to delete coupon',
        details: err instanceof Error ? err.message : 'Unknown error'
      }, { status: 500 });
    }
  }, { requireAdmin: true });
}
