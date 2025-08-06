import { NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb'
import { Cart } from '@/models/cart';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withAuth } from '@/lib/auth-middleware';

// Get user's cart
export async function GET(req: NextRequest) {
  return withAuth(req, async (req: NextRequest, token: any) => {
    try {
      await connectToDatabase();
      const cartItems = await Cart.find({ user: token.sub })
        .populate('product')
        .exec();
      
      return successResponse(cartItems);
    } catch (error) {
      console.error('Cart GET error:', error);
      return errorResponse('Failed to fetch cart items');
    }
  });
}

// Add item to cart
export async function POST(req: NextRequest) {
  return withAuth(req, async (req: NextRequest, token: any) => {
    try {
      await connectToDatabase();
      const { productId, quantity } = await req.json();
      
      let cartItem = await Cart.findOne({
        user: token.sub,
        product: productId,
      });
      
      if (cartItem) {
        cartItem.quantity += quantity;
        await cartItem.save();
      } else {
        cartItem = await Cart.create({
          user: token.sub,
          product: productId,
          quantity,
        });
      }
      
      return successResponse(cartItem, 'Item added to cart successfully');
    } catch (error) {
      console.error('Cart POST error:', error);
      return errorResponse('Failed to add item to cart');
    }
  });
}

// Update cart item
export async function PUT(req: NextRequest) {
  return withAuth(req, async (req: NextRequest, token: any) => {
    try {
      await connectToDatabase();
      const { productId, quantity } = await req.json();
      
      const cartItem = await Cart.findOneAndUpdate(
        { user: token.sub, product: productId },
        { quantity, updatedAt: new Date() },
        { new: true }
      );
      
      if (!cartItem) {
        return errorResponse('Cart item not found', 404);
      }
      
      return successResponse(cartItem, 'Cart item updated successfully');
    } catch (error) {
      console.error('Cart PUT error:', error);
      return errorResponse('Failed to update cart item');
    }
  });
}

// Remove item from cart
export async function DELETE(req: NextRequest) {
  return withAuth(req, async (req: NextRequest, token: any) => {
    try {
      await connectToDatabase();
      const { searchParams } = new URL(req.url);
      const productId = searchParams.get('productId');
      
      const result = await Cart.findOneAndDelete({
        user: token.sub,
        product: productId,
      });
      
      if (!result) {
        return errorResponse('Cart item not found', 404);
      }
      
      return successResponse(null, 'Item removed from cart successfully');
    } catch (error) {
      console.error('Cart DELETE error:', error);
      return errorResponse('Failed to remove item from cart');
    }
  });
}
