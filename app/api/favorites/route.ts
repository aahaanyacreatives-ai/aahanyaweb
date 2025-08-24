// app/api/favorites/route.ts - FIXED WITH PROPER AUTH AND ERROR HANDLING
import { NextRequest, NextResponse } from 'next/server';
import { adminDB } from '@/lib/firebaseAdmin';
import { withAuth } from '@/lib/auth-middleware';

const FAVORITES = adminDB.collection('favorites');

// GET: List user's favorites
export async function GET(req: NextRequest) {
  return withAuth(req, async (req: NextRequest, token: any) => {
    try {
      const userId = token.sub || token.id;
      console.log('[DEBUG] GET favorites for user:', userId);
      
      const snap = await FAVORITES.where('userId', '==', userId).get();
      const favorites = snap.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      
      console.log('[DEBUG] Found favorites:', favorites.length);
      return NextResponse.json({ favorites });
    } catch (error) {
      console.error('[DEBUG] Favorites GET error:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch favorites',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  });
}

// POST: Add to favorites
export async function POST(req: NextRequest) {
  return withAuth(req, async (req: NextRequest, token: any) => {
    try {
      const userId = token.sub || token.id;
      const { productId } = await req.json();
      
      console.log('[DEBUG] POST favorite - userId:', userId, 'productId:', productId);
      
      if (!productId) {
        return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
      }

      // Check if already exists
      const existingSnap = await FAVORITES
        .where('userId', '==', userId)
        .where('productId', '==', productId)
        .get();

      if (existingSnap.empty) {
        const docRef = await FAVORITES.add({
          userId,
          productId,
          createdAt: new Date()
        });
        
        console.log('[DEBUG] Favorite added with ID:', docRef.id);
        return NextResponse.json({ 
          success: true, 
          message: 'Added to favorites',
          favoriteId: docRef.id
        });
      } else {
        console.log('[DEBUG] Favorite already exists');
        return NextResponse.json({ 
          success: true, 
          message: 'Already in favorites' 
        });
      }
    } catch (error) {
      console.error('[DEBUG] Favorites POST error:', error);
      return NextResponse.json({ 
        error: 'Failed to add favorite',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  });
}

// DELETE: Remove from favorites
export async function DELETE(req: NextRequest) {
  return withAuth(req, async (req: NextRequest, token: any) => {
    try {
      const userId = token.sub || token.id;
      const url = new URL(req.url);
      const productId = url.searchParams.get('productId');
      
      console.log('[DEBUG] DELETE favorite - userId:', userId, 'productId:', productId);
      
      if (!productId) {
        return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
      }

      const snap = await FAVORITES
        .where('userId', '==', userId)
        .where('productId', '==', productId)
        .get();

      if (!snap.empty) {
        await snap.docs[0].ref.delete();
        console.log('[DEBUG] Favorite removed');
        return NextResponse.json({ 
          success: true, 
          message: 'Removed from favorites' 
        });
      } else {
        console.log('[DEBUG] Favorite not found to remove');
        return NextResponse.json({ 
          success: true, 
          message: 'Favorite not found' 
        });
      }
    } catch (error) {
      console.error('[DEBUG] Favorites DELETE error:', error);
      return NextResponse.json({ 
        error: 'Failed to remove favorite',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  });
}
