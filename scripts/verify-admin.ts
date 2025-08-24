import { adminDB } from '../lib/firebaseAdmin';
import { hash } from 'bcryptjs';

async function validateAndFixAdmin() {
  try {
    console.log('🔍 Checking admin user...');
    const usersCollection = adminDB.collection('users');
    const adminQuery = await usersCollection.where('email', '==', 'admin@example.com').get();

    // Function to create/update admin
    async function ensureAdmin(docRef: any) {
      const hashedPassword = await hash('secure123', 10);
      const now = new Date();
      
      const adminData = {
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin',
        hashedPassword,
        updatedAt: now,
        createdAt: now,
      };

      await docRef.set(adminData);
      console.log('✅ Admin user created/updated with password: secure123');
      return adminData;
    }

    if (adminQuery.empty) {
      console.log('❌ Admin user not found, creating...');
      const newAdminRef = usersCollection.doc();
      await ensureAdmin(newAdminRef);
      
      console.log('✨ Admin user created successfully!');
      console.log('ID:', newAdminRef.id);
      return;
    }

    const adminDoc = adminQuery.docs[0];
    const adminData = adminDoc.data();

    console.log('\n📋 Current admin user details:');
    console.log('ID:', adminDoc.id);
    console.log('Email:', adminData.email);
    console.log('Role:', adminData.role);
    console.log('Has password:', !!adminData.hashedPassword);

    // Check if fixes needed
    let needsUpdate = false;
    const reasons = [];

    if (adminData.role !== 'admin') {
      reasons.push('missing admin role');
      needsUpdate = true;
    }
    if (!adminData.hashedPassword) {
      reasons.push('missing password');
      needsUpdate = true;
    }

    if (needsUpdate) {
      console.log('\n🔧 Fixing admin user:', reasons.join(', '));
      await ensureAdmin(adminDoc.ref);
      console.log('✅ Admin user fixed!');
    } else {
      console.log('\n✅ Admin user is properly configured');
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

validateAndFixAdmin();
