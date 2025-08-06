import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import Order from '@/models/order';
import { Cart } from '@/models/cart';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withAuth } from '@/lib/auth-middleware';
import crypto from 'crypto'; // For Razorpay signature verification

// Get user's orders
export async function GET(req: NextRequest) {
  return withAuth(req, async (req: NextRequest, token: any) => {
    try {
      await connectToDatabase();
      const orders = await Order.find({ user: token.sub })
        .populate('items.product')
        .sort({ createdAt: -1 })
        .exec();

      return successResponse(orders);
    } catch (error) {
      console.error('Orders GET error:', error);
      return errorResponse('Failed to fetch orders');
    }
  });
}

// Create a new order
export async function POST(req: NextRequest) {
  return withAuth(req, async (req: NextRequest, token: any) => {
    try {
      await connectToDatabase();
      const { shippingInfo } = await req.json();

      // Get cart items
      const cartItems = await Cart.find({ user: token.sub })
        .populate('product')
        .exec();

      if (!cartItems.length) {
        return errorResponse('Cart is empty');
      }

      // Calculate total amount and prepare order items
      const items = cartItems.map((item: any) => ({
        product: item.product._id,
        quantity: item.quantity,
        price: item.product.price
      }));

      const totalAmount = items.reduce(
        (total: number, item: any) => total + (item.price * item.quantity),
        0
      );

      // Create order (status: 'pending')
      const order = await Order.create({
        user: token.sub,
        items,
        totalAmount,
        shippingInfo,
      });

      // Clear cart
      await Cart.deleteMany({ user: token.sub });

      return successResponse(order, 'Order created successfully');
    } catch (error) {
      console.error('Order creation error:', error);
      return errorResponse('Failed to create order');
    }
  });
}

// PATCH to verify payment and update order status
export async function PATCH(req: NextRequest) {
  return withAuth(req, async (req: NextRequest, token: any) => {
    try {
      await connectToDatabase();
      const { orderId, razorpay_payment_id, razorpay_order_id, razorpay_signature } = await req.json();

      if (!orderId || !razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
        return errorResponse('Missing payment verification details', 400);
      }

      // Verify Razorpay signature (use your secret key)
      const generatedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (generatedSignature !== razorpay_signature) {
        return errorResponse('Payment verification failed', 400);
      }

      // Update order status to 'completed' and add payment details
      const updatedOrder = await Order.findByIdAndUpdate(
        orderId,
        {
          status: 'completed',
          paymentStatus: 'success',
          paymentDetails: {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
          },
        },
        { new: true }
      );

      if (!updatedOrder) {
        return errorResponse('Order not found', 404);
      }

      // --- Socket.io code was here, removed ---

      return successResponse(updatedOrder, 'Payment verified and order updated');
    } catch (error) {
      console.error('Payment verification error:', error);
      return errorResponse('Failed to verify payment');
    }
  });
}
