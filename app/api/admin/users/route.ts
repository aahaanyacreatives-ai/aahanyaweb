import { NextRequest } from "next/server";
import { adminDB } from "@/lib/firebaseAdmin";        // Firestore (Admin SDK)
import { getAuth } from "firebase-admin/auth";        // For optional Auth deletion
import { withAuth } from "@/lib/auth-middleware";
import { successResponse, errorResponse } from "@/lib/api-response";

/* GET ───────────────────────────────────────────────
   Return every user document (admin-only)            */
export async function GET(req: NextRequest) {
  return withAuth(req, async (_req, token: any) => {
    /* Guard: caller must be admin */
    if (token.role !== "admin") {
      return errorResponse("Unauthorized: Admin access required", 403);
    }

    try {
      const snap = await adminDB
        .collection("users")
        .orderBy("createdAt", "desc")
        .get();

      const users = snap.docs.map((d) => {
        const { password, ...rest } = d.data(); // never expose hashes
        return { id: d.id, ...rest };
      });

      return successResponse(users);
    } catch (err) {
      console.error("Users GET error:", err);
      return errorResponse("Failed to fetch users", 500);
    }
  });
}

/* PUT ───────────────────────────────────────────────
   Update a user’s role (admin-only)                  */
export async function PUT(req: NextRequest) {
  return withAuth(req, async (_req, token: any) => {
    if (token.role !== "admin") {
      return errorResponse("Unauthorized: Admin access required", 403);
    }

    try {
      const { userId, role } = await req.json();

      if (!userId || !role) {
        return errorResponse("userId and role are required", 400);
      }

      const docRef = adminDB.collection("users").doc(userId);
      const snap = await docRef.get();
      if (!snap.exists) return errorResponse("User not found", 404);

      await docRef.update({ role, updatedAt: new Date() });

      const { password, ...updated } = (await docRef.get()).data()!;
      return successResponse({ id: userId, ...updated }, "User role updated successfully");
    } catch (err) {
      console.error("User role update error:", err);
      return errorResponse("Failed to update user role", 500);
    }
  });
}

/* DELETE ────────────────────────────────────────────
   Delete Firestore doc + Auth user (admin-only)      */
export async function DELETE(req: NextRequest) {
  return withAuth(req, async (_req, token: any) => {
    if (token.role !== "admin") {
      return errorResponse("Unauthorized: Admin access required", 403);
    }

    try {
      const userId = new URL(req.url).searchParams.get("userId");
      if (!userId) return errorResponse("userId query param is required", 400);

      const docRef = adminDB.collection("users").doc(userId);
      const snap = await docRef.get();
      if (!snap.exists) return errorResponse("User not found", 404);

      await docRef.delete();
      /* Optional: remove from Firebase Auth as well */
      await getAuth().deleteUser(userId).catch(() => {});

      return successResponse(null, "User deleted successfully");
    } catch (err) {
      console.error("User deletion error:", err);
      return errorResponse("Failed to delete user", 500);
    }
  });
}
