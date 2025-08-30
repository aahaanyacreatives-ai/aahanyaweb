// lib/razorpay.ts - UPDATED WITH ERROR HANDLING
import Razorpay from 'razorpay';

// Validate environment variables
if (!process.env.RAZORPAY_KEY_ID) {
  throw new Error('RAZORPAY_KEY_ID environment variable is not set');
}

if (!process.env.RAZORPAY_KEY_SECRET) {
  throw new Error('RAZORPAY_KEY_SECRET environment variable is not set');
}

console.log('[DEBUG] Initializing Razorpay with Key ID:', process.env.RAZORPAY_KEY_ID?.substring(0, 8) + '...');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Test the instance
razorpay.orders.all({ count: 1 })
  .then(() => console.log('[DEBUG] Razorpay instance initialized successfully'))
  .catch((error) => console.error('[DEBUG] Razorpay initialization test failed:', error));

export default razorpay;
