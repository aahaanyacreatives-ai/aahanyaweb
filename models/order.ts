// models/order.ts
import mongoose, { Schema } from 'mongoose';
import type { Order } from '@/lib/types';  // Import your Order type for reference

const OrderSchema = new Schema({
  userId: { type: String, required: true },
  items: [
    {
      productId: { type: String, required: true },
      name: { type: String, required: true },
      image: { type: String, required: true },
      price: { type: Number, required: true },
      quantity: { type: Number, required: true },
      customSize: { type: String, default: null },
      customImage: { type: String, default: null },
    }
  ],
  totalAmount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'completed', 'cancelled'], default: 'pending' },  // Kept your enum; 'completed' implies paid
  orderDate: { type: Date, default: Date.now },
  paymentDetails: {
    razorpay_order_id: { type: String, default: null },
    razorpay_payment_id: { type: String, default: null },
    razorpay_signature: { type: String, default: null },
  },
  paymentStatus: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },  // Added for explicit payment tracking (optional; remove if not needed)
});

export default mongoose.models.Order || mongoose.model<Order>('Order', OrderSchema);
