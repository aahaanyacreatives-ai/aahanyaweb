// models/coupon.ts
import mongoose from 'mongoose';

const CouponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true },
  type: { type: String, required: true, enum: ['percentage', 'fixed'] },
  value: { type: Number, required: true },
  isActive: { type: Boolean, default: true },
  usageLimit: { type: Number },
  usedCount: { type: Number, default: 0 },
  validFrom: { type: Date, required: true },
  validUntil: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});

// ✅ Fix the export - don't delete and use in same line
const Coupon = mongoose.models.Coupon || mongoose.model('Coupon', CouponSchema);

export default Coupon;
