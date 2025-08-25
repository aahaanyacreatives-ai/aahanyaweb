// lib/data.ts - SERVER-ONLY FIRESTORE HELPERS
// ⚠️ IMPORTANT: Import only in server components/routes

import { adminDB } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import type { Product, Order } from "@/lib/types";

const PRODUCTS = adminDB.collection('products');
const ORDERS = adminDB.collection('orders');

// ===== PRODUCT FUNCTIONS =====

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

// ===== ORDER FUNCTIONS =====

// ✅ ADD ORDER - Create new order in Firestore
export async function addOrder(orderData: Omit<Order, "id" | "orderDate">): Promise<Order> {
  try {
    console.log('[DEBUG] Creating new order for user:', orderData.userId);
    
    // Create order with server timestamp
    const orderToAdd = {
      ...orderData,
      orderDate: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    
    // Add to Firestore
    const docRef = await ORDERS.add(orderToAdd);
    console.log('[DEBUG] Order created with ID:', docRef.id);
    
    // Get the created document to return with proper timestamps
    const createdDoc = await docRef.get();
    const createdData = createdDoc.data()!;
    
    const order: Order = {
      id: docRef.id,
      userId: createdData.userId,
      items: createdData.items,
      totalAmount: createdData.totalAmount,
      status: createdData.status || 'pending',
      orderDate: createdData.orderDate?.toDate() || new Date(),
      paymentDetails: createdData.paymentDetails,
      paymentStatus: createdData.paymentStatus || 'pending',
    };
    
    console.log('[DEBUG] Order successfully created:', order.id);
    return order;
    
  } catch (error) {
    console.error('[DEBUG] Error creating order:', error);
    throw new Error('Failed to create order');
  }
}

// ✅ GET ORDER BY ID
export async function getOrderById(orderId: string): Promise<Order | null> {
  try {
    if (!orderId || typeof orderId !== 'string' || orderId.trim() === '') {
      console.warn('[DEBUG] Invalid order ID provided:', orderId);
      return null;
    }

    console.log('[DEBUG] Fetching order by ID:', orderId);
    
    const docRef = ORDERS.doc(orderId.trim());
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      console.log('[DEBUG] Order with ID', orderId, 'not found');
      return null;
    }

    const data = docSnap.data()!;
    console.log('[DEBUG] Found order for user:', data.userId);

    const order: Order = {
      id: docSnap.id,
      userId: data.userId,
      items: data.items || [],
      totalAmount: typeof data.totalAmount === 'number' ? data.totalAmount : 0,
      status: data.status || 'pending',
      orderDate: data.orderDate?.toDate() || new Date(),
      paymentDetails: data.paymentDetails,
      paymentStatus: data.paymentStatus || 'pending',
    };

    return order;
  } catch (error) {
    console.error('[DEBUG] Error fetching order by ID:', error);
    return null;
  }
}

// ✅ GET ORDERS BY USER ID
export async function getOrdersByUserId(userId: string): Promise<Order[]> {
  try {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      console.warn('[DEBUG] Invalid user ID provided:', userId);
      return [];
    }

    console.log('[DEBUG] Fetching orders for user:', userId);
    
    const snap = await ORDERS
      .where('userId', '==', userId.trim())
      .orderBy('orderDate', 'desc')
      .get();
    
    console.log('[DEBUG] Found', snap.size, 'orders for user');
    
    const orders: Order[] = snap.docs.map(doc => {
      const data = doc.data();
      
      return {
        id: doc.id,
        userId: data.userId,
        items: data.items || [],
        totalAmount: typeof data.totalAmount === 'number' ? data.totalAmount : 0,
        status: data.status || 'pending',
        orderDate: data.orderDate?.toDate() || new Date(),
        paymentDetails: data.paymentDetails,
        paymentStatus: data.paymentStatus || 'pending',
      };
    });
    
    return orders;
  } catch (error) {
    console.error('[DEBUG] Error fetching orders by user ID:', error);
    return [];
  }
}

// ✅ UPDATE ORDER STATUS
export async function updateOrderStatus(
  orderId: string, 
  status: Order['status'],
  paymentDetails?: Order['paymentDetails'],
  paymentStatus?: Order['paymentStatus']
): Promise<boolean> {
  try {
    if (!orderId || typeof orderId !== 'string' || orderId.trim() === '') {
      console.warn('[DEBUG] Invalid order ID provided:', orderId);
      return false;
    }

    console.log('[DEBUG] Updating order status:', orderId, 'to', status);
    
    const updateData: any = {
      status,
      updatedAt: FieldValue.serverTimestamp(),
    };
    
    if (paymentDetails) {
      updateData.paymentDetails = paymentDetails;
    }
    
    if (paymentStatus) {
      updateData.paymentStatus = paymentStatus;
    }
    
    await ORDERS.doc(orderId.trim()).update(updateData);
    
    console.log('[DEBUG] Order status updated successfully');
    return true;
  } catch (error) {
    console.error('[DEBUG] Error updating order status:', error);
    return false;
  }
}

// ✅ GET ALL ORDERS (for admin)
export async function getAllOrders(): Promise<Order[]> {
  try {
    console.log('[DEBUG] Fetching all orders');
    
    const snap = await ORDERS.orderBy('orderDate', 'desc').get();
    console.log('[DEBUG] Found', snap.size, 'total orders');
    
    const orders: Order[] = snap.docs.map(doc => {
      const data = doc.data();
      
      return {
        id: doc.id,
        userId: data.userId,
        items: data.items || [],
        totalAmount: typeof data.totalAmount === 'number' ? data.totalAmount : 0,
        status: data.status || 'pending',
        orderDate: data.orderDate?.toDate() || new Date(),
        paymentDetails: data.paymentDetails,
        paymentStatus: data.paymentStatus || 'pending',
      };
    });
    
    return orders;
  } catch (error) {
    console.error('[DEBUG] Error fetching all orders:', error);
    return [];
  }
}

// ✅ DELETE ORDER (for admin/cleanup)
export async function deleteOrder(orderId: string): Promise<boolean> {
  try {
    if (!orderId || typeof orderId !== 'string' || orderId.trim() === '') {
      console.warn('[DEBUG] Invalid order ID provided:', orderId);
      return false;
    }

    console.log('[DEBUG] Deleting order:', orderId);
    
    await ORDERS.doc(orderId.trim()).delete();
    
    console.log('[DEBUG] Order deleted successfully');
    return true;
  } catch (error) {
    console.error('[DEBUG] Error deleting order:', error);
    return false;
  }
}

// ✅ GET ORDER COUNT
export async function getOrderCount(): Promise<number> {
  try {
    const snap = await ORDERS.get();
    return snap.size;
  } catch (error) {
    console.error('[DEBUG] Error getting order count:', error);
    return 0;
  }
}

// ✅ GET ORDERS BY STATUS
export async function getOrdersByStatus(status: Order['status']): Promise<Order[]> {
  try {
    console.log('[DEBUG] Fetching orders by status:', status);
    
    const snap = await ORDERS
      .where('status', '==', status)
      .orderBy('orderDate', 'desc')
      .get();
    
    console.log('[DEBUG] Found', snap.size, 'orders with status', status);
    
    const orders: Order[] = snap.docs.map(doc => {
      const data = doc.data();
      
      return {
        id: doc.id,
        userId: data.userId,
        items: data.items || [],
        totalAmount: typeof data.totalAmount === 'number' ? data.totalAmount : 0,
        status: data.status || 'pending',
        orderDate: data.orderDate?.toDate() || new Date(),
        paymentDetails: data.paymentDetails,
        paymentStatus: data.paymentStatus || 'pending',
      };
    });
    
    return orders;
  } catch (error) {
    console.error('[DEBUG] Error fetching orders by status:', error);
    return [];
  }
}