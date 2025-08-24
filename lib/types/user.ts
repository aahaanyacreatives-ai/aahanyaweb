// lib/types/user.ts - UPDATED FOR FIREBASE (SIMPLIFIED, NO MONGOOSE)

// User interface for Firestore documents (no password, handled by Firebase Auth)
export interface IUser {
  id?: string;  // Firestore doc ID
  email: string;
  name?: string;
  role: "admin" | "user";
  createdAt?: any;  // Timestamp or Date (optional, add if needed)
  updatedAt?: any;  // Timestamp or Date (optional)
}

// DTO for API responses or client-side (no sensitive data)
export interface UserDTO {
  id: string;
  email: string;
  name?: string;
  role: "admin" | "user";
}
