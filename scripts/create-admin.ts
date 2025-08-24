import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { hash } from 'bcryptjs';

async function createAdminUser() {
  try {
    // Admin credentials
    const email = 'admin@example.com';
    const password = 'secure123';

    // Hash the password
    const hashedPassword = await hash(password, 10);

    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Create user document in Firestore
    const userDoc = doc(db, 'users', user.uid);
    await setDoc(userDoc, {
      email: email,
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
      hashedPassword // Store hashed password in Firestore
    });

    console.log('Admin user created successfully!');
    console.log('UID:', user.uid);
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
}

createAdminUser();
