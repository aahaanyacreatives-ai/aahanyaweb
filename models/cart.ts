import mongoose from 'mongoose';

const cartSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, default: 1 },
  customSize: { type: String },
  customImage: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
cartSchema.index({ user: 1, product: 1, customSize: 1 }, { unique: true });

export const Cart = mongoose.models.Cart || mongoose.model('Cart', cartSchema);
