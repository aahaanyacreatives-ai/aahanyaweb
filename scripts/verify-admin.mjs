import { adminDB } from '../lib/firebaseAdmin.js';

async function checkAdminUser() {
  try {
    const usersCollection = adminDB.collection('users');
    const adminQuery = await usersCollection.where('email', '==', 'admin@example.com').get();

    if (adminQuery.empty) {
      console.log('❌ Admin user not found in database');
      return;
    }

    const adminDoc = adminQuery.docs[0];
    const adminData = adminDoc.data();

    console.log('✅ Admin user found:');
    console.log('ID:', adminDoc.id);
    console.log('Email:', adminData.email);
    console.log('Role:', adminData.role);
    console.log('Has password:', !!adminData.hashedPassword);
    console.log('Full data:', adminData);
  } catch (error) {
    console.error('Error checking admin user:', error);
  }
}

checkAdminUser();
