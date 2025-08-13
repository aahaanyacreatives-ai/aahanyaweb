import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import Order from '@/models/order';
import { Cart } from '@/models/cart';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withAuth } from '@/lib/auth-middleware';
import crypto from 'crypto';

// Get user's orders
export async function GET(req: NextRequest) {
  return withAuth(req, async (req: NextRequest, token: any) => {
    try {
      await connectToDatabase();
      const orders = await Order.find({ user: token.sub })
        .populate('items.product')
        .sort({ createdAt: -1 })
        .exec();

      // Transform orders to match frontend expectations
      const transformedOrders = orders.map((order: any) => ({
        id: order._id.toString(),
        status: order.status,
        orderDate: order.createdAt,
        totalAmount: order.totalAmount,
        items: order.items.map((item: any) => ({
          name: item.product?.name || 'Unknown Product',
          price: item.price,
          quantity: item.quantity,
          image: item.product?.image || item.product?.images?.[0] || null,
          customSize: item.customSize || null,
          customImage: item.customImage || null,
        })),
        shippingInfo: order.shippingInfo,
        paymentStatus: order.paymentStatus,
      }));

      return NextResponse.json(transformedOrders);
    } catch (error) {
      console.error('Orders GET error:', error);
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
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
        return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
      }

      // Calculate total amount and prepare order items
      const items = cartItems.map((item: any) => ({
        product: item.product._id,
        quantity: item.quantity,
        price: item.product.price,
        customSize: item.customSize,
        customImage: item.customImage,
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

      return NextResponse.json({ 
        success: true, 
        order: {
          id: order._id.toString(),
          status: order.status,
          totalAmount: order.totalAmount,
        }
      });
    } catch (error) {
      console.error('Order creation error:', error);
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
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
        return NextResponse.json({ error: 'Missing payment verification details' }, { status: 400 });
      }

      // Verify Razorpay signature
      const generatedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (generatedSignature !== razorpay_signature) {
        return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 });
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
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Payment verified and order updated',
        order: updatedOrder 
      });
    } catch (error) {
      console.error('Payment verification error:', error);
      return NextResponse.json({ error: 'Failed to verify payment' }, { status: 500 });
    }
  });
}
