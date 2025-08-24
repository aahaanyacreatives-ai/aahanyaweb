import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { hash } from 'bcryptjs';

console.log('Environment variables loaded:');
console.log('- Project ID:', process.env.AUTH_FIREBASE_PROJECT_ID);
console.log('- Client Email:', process.env.AUTH_FIREBASE_CLIENT_EMAIL);
console.log('- Private Key present:', !!process.env.AUTH_FIREBASE_PRIVATE_KEY);

const privateKey = process.env.AUTH_FIREBASE_PRIVATE_KEY
  ?.replace(/^["']|["']$/g, '')  // Remove surrounding quotes
  .replace(/\\n/g, '\n');        // Replace \n with actual newlines

// Initialize Firebase Admin
initializeApp({
  credential: cert({
    projectId: process.env.AUTH_FIREBASE_PROJECT_ID,
    clientEmail: process.env.AUTH_FIREBASE_CLIENT_EMAIL,
    privateKey: privateKey,
  }),
});

const db = getFirestore();

async function checkAndUpdateAdmin() {
  try {
    const adminEmail = 'admin@example.com';
    const adminPassword = 'secure123';

    console.log('Checking for admin user...');
    
    const usersCollection = db.collection('users');
    const adminQuery = await usersCollection.where('email', '==', adminEmail).get();

    if (adminQuery.empty) {
      console.log('Admin user not found. Creating...');
      const hashedPassword = await hash(adminPassword, 10);
      const newAdminRef = usersCollection.doc();
      await newAdminRef.set({
        email: adminEmail,
        hashedPassword,
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('Admin user created successfully!');
      console.log('Admin document ID:', newAdminRef.id);
    } else {
      console.log('Admin user found. Updating password...');
      const adminDoc = adminQuery.docs[0];
      const hashedPassword = await hash(adminPassword, 10);
      await adminDoc.ref.update({
        hashedPassword,
        updatedAt: new Date()
      });
      console.log('Admin password updated successfully!');
      console.log('Admin document ID:', adminDoc.id);
    }

    // Verify the user was created/updated
    const verifyQuery = await usersCollection.where('email', '==', adminEmail).get();
    if (!verifyQuery.empty) {
      const adminData = verifyQuery.docs[0].data();
      console.log('Admin user verified:');
      console.log('- Email:', adminData.email);
      console.log('- Role:', adminData.role);
      console.log('- Has password:', !!adminData.hashedPassword);
    }

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAndUpdateAdmin().then(() => process.exit(0));
