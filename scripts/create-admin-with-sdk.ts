// scripts/create-admin-with-sdk.ts - FIXED TYPESCRIPT ERRORS
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { cert, initializeApp, getApps, type App } from 'firebase-admin/app';
import { hash } from 'bcryptjs';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// ✅ FIXED: Explicitly type the app variable as App
let app: App;
if (getApps().length === 0) {
  app = initializeApp({
    credential: cert({
      projectId: process.env.AUTH_FIREBASE_PROJECT_ID!,
      clientEmail: process.env.AUTH_FIREBASE_CLIENT_EMAIL!,
      privateKey: process.env.AUTH_FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    }),
  });
} else {
  app = getApps()[0];
}

async function createAdminUser(): Promise<void> {
  try {
    console.log('🚀 Starting admin user creation process...');
    
    // Verify environment variables
    if (!process.env.AUTH_FIREBASE_PROJECT_ID || 
        !process.env.AUTH_FIREBASE_CLIENT_EMAIL || 
        !process.env.AUTH_FIREBASE_PRIVATE_KEY) {
      throw new Error('❌ Missing required Firebase environment variables. Check your .env.local file.');
    }

    // ✅ FIXED: Use the properly typed app variable
    const auth = getAuth(app);
    const db = getFirestore(app);
    
    // Admin credentials - CHANGE THESE FOR PRODUCTION
    const email = 'admin@example.com';
    const password = 'admin123'; // ⚠️ Change this in production!
    const displayName = 'Admin User';
    
    console.log(`📧 Creating admin user: ${email}`);
    
    // Hash the password for Firestore storage (for credentials provider)
    const hashedPassword = await hash(password, 10);

    try {
      // Step 1: Create user in Firebase Auth
      console.log('🔐 Creating user in Firebase Auth...');
      const userRecord = await auth.createUser({
        email: email,
        password: password,
        displayName: displayName,
        emailVerified: true,
      });

      console.log('✅ Firebase Auth user created with UID:', userRecord.uid);

      // Step 2: Create user document in Firestore
      console.log('📝 Creating user document in Firestore...');
      await db.collection('users').doc(userRecord.uid).set({
        email: email,
        role: 'admin',
        name: displayName,
        hashedPassword, // Store hashed password for credentials provider
        createdAt: new Date(),
        updatedAt: new Date(),
        provider: 'admin-script'
      });

      console.log('🎉 Admin user created successfully!');
      console.log('📋 User Details:');
      console.log('   - User ID:', userRecord.uid);
      console.log('   - Email:', email);
      console.log('   - Password:', password);
      console.log('   - Role: admin');
      console.log('');
      console.log('🚨 IMPORTANT: Change the password after first login!');
      
    } catch (createError: any) {
      if (createError.code === 'auth/email-already-exists') {
        console.log('👤 User already exists in Firebase Auth, updating role...');
        
        try {
          // Get existing user
          const existingUser = await auth.getUserByEmail(email);
          console.log('📋 Found existing user with UID:', existingUser.uid);
          
          // Update user document in Firestore
          await db.collection('users').doc(existingUser.uid).set({
            email: email,
            role: 'admin',
            name: displayName,
            hashedPassword, // Update password hash
            updatedAt: new Date(),
            provider: 'admin-script-update'
          }, { merge: true });
          
          // Update password in Firebase Auth
          await auth.updateUser(existingUser.uid, {
            password: password,
            displayName: displayName
          });
          
          console.log('✅ Existing user updated with admin role');
          console.log('📋 Updated Details:');
          console.log('   - User ID:', existingUser.uid);
          console.log('   - Email:', email);
          console.log('   - Password:', password, '(updated)');
          console.log('   - Role: admin');
          
        } catch (updateError) {
          console.error('❌ Error updating existing user:', updateError);
          throw updateError;
        }
      } else {
        console.error('❌ Error creating user in Firebase Auth:', createError);
        throw createError;
      }
    }

    // Step 3: Verify the setup
    console.log('🔍 Verifying admin user setup...');
    const adminSnap = await db.collection('users')
      .where('email', '==', email)
      .where('role', '==', 'admin')
      .get();
    
    if (!adminSnap.empty) {
      console.log('✅ Admin user verification successful!');
      console.log('📊 Total admin users found:', adminSnap.size);
    } else {
      console.log('⚠️ Warning: Admin user not found in verification step');
    }

  } catch (error: any) {
    console.error('❌ Fatal error during admin user creation:', error);
    console.error('🔧 Troubleshooting tips:');
    console.error('   1. Check your Firebase project settings');
    console.error('   2. Verify service account permissions');
    console.error('   3. Ensure .env.local file has correct values');
    console.error('   4. Make sure Firebase project exists and is active');
    throw error;
  }
}

// Run the script
console.log('🏁 Admin User Creation Script Starting...');
console.log('📍 Project ID:', process.env.AUTH_FIREBASE_PROJECT_ID || 'NOT SET');
console.log('📧 Service Account:', process.env.AUTH_FIREBASE_CLIENT_EMAIL || 'NOT SET');
console.log('🔑 Private Key:', process.env.AUTH_FIREBASE_PRIVATE_KEY ? 'SET' : 'NOT SET');
console.log('');

createAdminUser()
  .then(() => {
    console.log('');
    console.log('🎊 Script completed successfully!');
    console.log('🚀 You can now login at: http://localhost:3000/login');
    console.log('');
    process.exit(0);
  })
  .catch((error) => {
    console.error('');
    console.error('💥 Script failed:', error.message);
    console.error('');
    process.exit(1);
  });
