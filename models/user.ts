// models/user.ts
import mongoose, { Model } from 'mongoose';
import type { IUser } from '@/lib/types/user';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },  // Lowercase
  phoneNumber: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Pre-save hook to hash password with debug
userSchema.pre('save', async function (next) {
  const timestamp = new Date().toISOString();
  if (!this.isModified('password')) {
    console.log(`[DEBUG ${timestamp}] Pre-save: Password not modified, skipping hash`);
    return next();
  }

  try {
    console.log(`[DEBUG ${timestamp}] Pre-save: Hashing password for user: ${this.email}`);
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    console.log(`[DEBUG ${timestamp}] Pre-save: Password hashed successfully`);
    next();
  } catch (err) {
    console.error(`[DEBUG ${timestamp}] Pre-save error:`, JSON.stringify(err));
    next(err as Error);
  }
});

// Method to compare passwords with debug
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  const timestamp = new Date().toISOString();
  console.log(`[DEBUG ${timestamp}] Comparing password for user: ${this.email}`);
  const isMatch = await bcrypt.compare(candidatePassword, this.password);
  console.log(`[DEBUG ${timestamp}] Comparison result: ${isMatch}`);
  return isMatch;
};

// Fix for reusing the model in dev
let User: Model<IUser>;
try {
  User = mongoose.model<IUser>('User');
} catch {
  User = mongoose.model<IUser>('User', userSchema);
}

export { User };
