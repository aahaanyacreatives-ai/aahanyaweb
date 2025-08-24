// app/api/auth/register/route.ts - COMPLETE FIXED VERSION
import { NextResponse } from "next/server";
import { adminDB } from "@/lib/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";
import { hash } from "bcryptjs";

export async function POST(req: Request) {
  try {
    console.log('[DEBUG] Registration API called');
    
    const { name, email, password } = await req.json();

    // Validate input
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    console.log('[DEBUG] Registration attempt for:', email);

    const auth = getAuth();
    
    // Check if user already exists in Firestore
    const usersCollection = adminDB.collection("users");
    const existingUserSnap = await usersCollection.where("email", "==", email).get();
    
    if (!existingUserSnap.empty) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    try {
      // Create user in Firebase Auth
      const userRecord = await auth.createUser({
        email: email,
        password: password,
        displayName: name,
        emailVerified: false,
      });

      console.log('[DEBUG] Firebase Auth user created:', userRecord.uid);

      // Hash password for credentials provider compatibility
      const hashedPassword = await hash(password, 10);

      // Create user document in Firestore
      await usersCollection.doc(userRecord.uid).set({
        name,
        email,
        role: "user",
        hashedPassword, // For credentials provider
        createdAt: new Date(),
        updatedAt: new Date(),
        provider: 'email'
      });

      console.log('[DEBUG] User profile created in Firestore');

      return NextResponse.json(
        { 
          success: true,
          message: "User created successfully",
          user: { id: userRecord.uid, name, email, role: "user" }
        },
        { status: 201 }
      );

    } catch (authError: any) {
      console.error('[DEBUG] Firebase Auth error:', authError);
      
      if (authError.code === 'auth/email-already-exists') {
        return NextResponse.json(
          { error: "User with this email already exists" },
          { status: 409 }
        );
      } else if (authError.code === 'auth/invalid-email') {
        return NextResponse.json(
          { error: "Invalid email format" },
          { status: 400 }
        );
      } else if (authError.code === 'auth/weak-password') {
        return NextResponse.json(
          { error: "Password is too weak" },
          { status: 400 }
        );
      }
      
      throw authError;
    }

  } catch (error) {
    console.error("[DEBUG] Registration error:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
