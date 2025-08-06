import { NextResponse } from "next/server"
import { registerUser, getUserByEmail } from "@/lib/user-data"
 // Using in-memory data for demo

export async function POST(req: Request) {

   
  try {
    const { name, email, password } = await req.json()
     /*  DEBUG —–––––––––––––––––––––––––––––––––– */
  console.log("[DEBUG REGISTER-API] raw email:", email);
  console.log("[DEBUG REGISTER-API] raw password:", password);

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(email)
    if (existingUser) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 409 })
    }

    // In a real app, you would hash the password before saving
   const newUser = await registerUser({
  name,
  email,
  password,
  role: "user",  // add this required field
});

    if (newUser) {
      // Do not return password in response
      const { password: _, ...userWithoutPassword } = newUser
      return NextResponse.json(userWithoutPassword, { status: 201 })
    } else {
      return NextResponse.json({ error: "Failed to register user" }, { status: 500 })
    }
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
