// lib/data.ts - SERVER-ONLY FIRESTORE HELPERS
// ⚠️ IMPORTANT: Import only in server components/routes

import { adminDB } from '@/lib/firebaseAdmin';
import type { Product } from "@/lib/types";

const PRODUCTS = adminDB.collection('products');

// ✅ FIXED: GET all products with better error handling and type safety
export async function getProducts(): Promise<Product[]> {
  try {
    console.log('[DEBUG] Fetching all products from Firestore');
    
    const snap = await PRODUCTS.get();
    console.log('[DEBUG] Found', snap.size, 'products');
    
    const products: Product[] = snap.docs.map(doc => {
      const data = doc.data();
      
      return {
        id: doc.id,
        name: data.name || 'Unnamed Product',
        description: data.description || '',
        price: typeof data.price === 'number' ? data.price : 0,
        images: Array.isArray(data.images) ? data.images : [],
        category: data.category || 'FEATURED',
        type: data.type || undefined,
        inStock: typeof data.inStock === 'boolean' ? data.inStock : true,
        quantity: typeof data.quantity === 'number' ? data.quantity : 0,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      };
    });
    
    console.log('[DEBUG] Successfully processed', products.length, 'products');
    return products;
  } catch (error) {
    console.error('[DEBUG] Error fetching products:', error);
    return [];
  }
}

// ✅ FIXED: GET product by ID with enhanced validation
export async function getProductById(id: string): Promise<Product | null> {
  try {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      console.warn('[DEBUG] Invalid product ID provided:', id);
      return null;
    }

    console.log('[DEBUG] Fetching product by ID:', id);
    
    const docRef = PRODUCTS.doc(id.trim());
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      console.log('[DEBUG] Product with ID', id, 'not found');
      return null;
    }

    const data = docSnap.data()!;
    console.log('[DEBUG] Found product:', data.name || 'Unnamed Product');

    const product: Product = {
      id: docSnap.id,
      name: data.name || 'Unnamed Product',
      description: data.description || '',
      price: typeof data.price === 'number' ? data.price : 0,
      images: Array.isArray(data.images) ? data.images : [],
      category: data.category || 'FEATURED',
      type: data.type || undefined,
      inStock: typeof data.inStock === 'boolean' ? data.inStock : true,
      quantity: typeof data.quantity === 'number' ? data.quantity : 0,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };

    return product;
  } catch (error) {
    console.error('[DEBUG] Error fetching product by ID:', error);
    return null;
  }
}

// ✅ NEW: GET products by category with filtering
export async function getProductsByCategory(category: string): Promise<Product[]> {
  try {
    if (!category || typeof category !== 'string') {
      console.warn('[DEBUG] Invalid category provided:', category);
      return [];
    }

    console.log('[DEBUG] Fetching products by category:', category);
    
    const snap = await PRODUCTS.where('category', '==', category.toUpperCase()).get();
    console.log('[DEBUG] Found', snap.size, 'products in category', category);
    
    const products: Product[] = snap.docs.map(doc => {
      const data = doc.data();
      
      return {
        id: doc.id,
        name: data.name || 'Unnamed Product',
        description: data.description || '',
        price: typeof data.price === 'number' ? data.price : 0,
        images: Array.isArray(data.images) ? data.images : [],
        category: data.category || 'FEATURED',
        type: data.type || undefined,
        inStock: typeof data.inStock === 'boolean' ? data.inStock : true,
        quantity: typeof data.quantity === 'number' ? data.quantity : 0,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      };
    });
    
    return products;
  } catch (error) {
    console.error('[DEBUG] Error fetching products by category:', error);
    return [];
  }
}

// ✅ NEW: GET products by type (within a category)
export async function getProductsByType(category: string, type: string): Promise<Product[]> {
  try {
    if (!category || !type || typeof category !== 'string' || typeof type !== 'string') {
      console.warn('[DEBUG] Invalid category or type provided:', { category, type });
      return [];
    }

    console.log('[DEBUG] Fetching products by category:', category, 'and type:', type);
    
    const snap = await PRODUCTS
      .where('category', '==', category.toUpperCase())
      .where('type', '==', type)
      .get();
    
    console.log('[DEBUG] Found', snap.size, 'products for', category, '-', type);
    
    const products: Product[] = snap.docs.map(doc => {
      const data = doc.data();
      
      return {
        id: doc.id,
        name: data.name || 'Unnamed Product',
        description: data.description || '',
        price: typeof data.price === 'number' ? data.price : 0,
        images: Array.isArray(data.images) ? data.images : [],
        category: data.category || 'FEATURED',
        type: data.type || undefined,
        inStock: typeof data.inStock === 'boolean' ? data.inStock : true,
        quantity: typeof data.quantity === 'number' ? data.quantity : 0,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      };
    });
    
    return products;
  } catch (error) {
    console.error('[DEBUG] Error fetching products by type:', error);
    return [];
  }
}

// ✅ NEW: Search products by name (case-insensitive)
export async function searchProducts(searchTerm: string): Promise<Product[]> {
  try {
    if (!searchTerm || typeof searchTerm !== 'string' || searchTerm.trim() === '') {
      console.warn('[DEBUG] Invalid search term provided:', searchTerm);
      return [];
    }

    console.log('[DEBUG] Searching products for term:', searchTerm);
    
    // Note: Firestore doesn't support full-text search natively
    // This is a simple implementation that gets all products and filters client-side
    // For production, consider using Algolia or similar for better search
    const snap = await PRODUCTS.get();
    
    const searchTermLower = searchTerm.trim().toLowerCase();
    const matchingProducts: Product[] = [];
    
    snap.docs.forEach(doc => {
      const data = doc.data();
      const name = (data.name || '').toLowerCase();
      const description = (data.description || '').toLowerCase();
      const type = (data.type || '').toLowerCase();
      
      if (name.includes(searchTermLower) || 
          description.includes(searchTermLower) || 
          type.includes(searchTermLower)) {
        
        matchingProducts.push({
          id: doc.id,
          name: data.name || 'Unnamed Product',
          description: data.description || '',
          price: typeof data.price === 'number' ? data.price : 0,
          images: Array.isArray(data.images) ? data.images : [],
          category: data.category || 'FEATURED',
          type: data.type || undefined,
          inStock: typeof data.inStock === 'boolean' ? data.inStock : true,
          quantity: typeof data.quantity === 'number' ? data.quantity : 0,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        });
      }
    });
    
    console.log('[DEBUG] Found', matchingProducts.length, 'matching products');
    return matchingProducts;
  } catch (error) {
    console.error('[DEBUG] Error searching products:', error);
    return [];
  }
}

// ✅ NEW: Get featured products
export async function getFeaturedProducts(limit: number = 8): Promise<Product[]> {
  try {
    console.log('[DEBUG] Fetching featured products, limit:', limit);
    
    const snap = await PRODUCTS
      .where('category', '==', 'FEATURED')
      .limit(limit)
      .get();
    
    console.log('[DEBUG] Found', snap.size, 'featured products');
    
    const products: Product[] = snap.docs.map(doc => {
      const data = doc.data();
      
      return {
        id: doc.id,
        name: data.name || 'Unnamed Product',
        description: data.description || '',
        price: typeof data.price === 'number' ? data.price : 0,
        images: Array.isArray(data.images) ? data.images : [],
        category: data.category || 'FEATURED',
        type: data.type || undefined,
        inStock: typeof data.inStock === 'boolean' ? data.inStock : true,
        quantity: typeof data.quantity === 'number' ? data.quantity : 0,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      };
    });
    
    return products;
  } catch (error) {
    console.error('[DEBUG] Error fetching featured products:', error);
    return [];
  }
}

// ✅ NEW: Get products with pagination
export async function getProductsWithPagination(
  limit: number = 10,
  lastProductId?: string
): Promise<{ products: Product[]; hasMore: boolean; lastProductId?: string }> {
  try {
    console.log('[DEBUG] Fetching products with pagination, limit:', limit, 'after:', lastProductId);
    
    let query = PRODUCTS.orderBy('createdAt', 'desc').limit(limit + 1);
    
    if (lastProductId) {
      const lastDoc = await PRODUCTS.doc(lastProductId).get();
      if (lastDoc.exists) {
        query = query.startAfter(lastDoc);
      }
    }
    
    const snap = await query.get();
    const hasMore = snap.size > limit;
    const docs = hasMore ? snap.docs.slice(0, -1) : snap.docs;
    
    const products: Product[] = docs.map(doc => {
      const data = doc.data();
      
      return {
        id: doc.id,
        name: data.name || 'Unnamed Product',
        description: data.description || '',
        price: typeof data.price === 'number' ? data.price : 0,
        images: Array.isArray(data.images) ? data.images : [],
        category: data.category || 'FEATURED',
        type: data.type || undefined,
        inStock: typeof data.inStock === 'boolean' ? data.inStock : true,
        quantity: typeof data.quantity === 'number' ? data.quantity : 0,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      };
    });
    
    const result = {
      products,
      hasMore,
      lastProductId: products.length > 0 ? products[products.length - 1].id : undefined
    };
    
    console.log('[DEBUG] Returning', products.length, 'products, hasMore:', hasMore);
    return result;
  } catch (error) {
    console.error('[DEBUG] Error fetching products with pagination:', error);
    return { products: [], hasMore: false };
  }
}

// ✅ NEW: Check if product exists
export async function productExists(productId: string): Promise<boolean> {
  try {
    if (!productId || typeof productId !== 'string' || productId.trim() === '') {
      return false;
    }
    
    const docSnap = await PRODUCTS.doc(productId.trim()).get();
    return docSnap.exists;
  } catch (error) {
    console.error('[DEBUG] Error checking if product exists:', error);
    return false;
  }
}

// ✅ NEW: Get product count
export async function getProductCount(): Promise<number> {
  try {
    const snap = await PRODUCTS.get();
    return snap.size;
  } catch (error) {
    console.error('[DEBUG] Error getting product count:', error);
    return 0;
  }
}

// ✅ NEW: Get products by price range
export async function getProductsByPriceRange(
  minPrice: number, 
  maxPrice: number
): Promise<Product[]> {
  try {
    if (minPrice < 0 || maxPrice < 0 || minPrice > maxPrice) {
      console.warn('[DEBUG] Invalid price range:', { minPrice, maxPrice });
      return [];
    }

    console.log('[DEBUG] Fetching products in price range:', minPrice, '-', maxPrice);
    
    const snap = await PRODUCTS
      .where('price', '>=', minPrice)
      .where('price', '<=', maxPrice)
      .get();
    
    const products: Product[] = snap.docs.map(doc => {
      const data = doc.data();
      
      return {
        id: doc.id,
        name: data.name || 'Unnamed Product',
        description: data.description || '',
        price: typeof data.price === 'number' ? data.price : 0,
        images: Array.isArray(data.images) ? data.images : [],
        category: data.category || 'FEATURED',
        type: data.type || undefined,
        inStock: typeof data.inStock === 'boolean' ? data.inStock : true,
        quantity: typeof data.quantity === 'number' ? data.quantity : 0,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      };
    });
    
    console.log('[DEBUG] Found', products.length, 'products in price range');
    return products;
  } catch (error) {
    console.error('[DEBUG] Error fetching products by price range:', error);
    return [];
  }
}
