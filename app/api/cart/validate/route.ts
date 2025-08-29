import { NextRequest, NextResponse } from "next/server";
import { adminDB } from "@/lib/firebaseAdmin";
import { withAuth } from "@/lib/auth-middleware";

const CART = adminDB.collection("cart");
const PRODUCTS = adminDB.collection("products");

export async function POST(req: NextRequest) {
  return withAuth(req, async (req: NextRequest, token: any) => {
    try {
      const userId = token.sub || token.id;
      
      if (!userId) {
        return NextResponse.json({ error: "User ID not found in token" }, { status: 400 });
      }

      // Get cart items
      const cartSnap = await CART.where("userId", "==", userId).get();
      if (cartSnap.empty) {
        return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
      }

      // Just verify products exist
      for (const cartDoc of cartSnap.docs) {
        const cartData = cartDoc.data();
        const productSnap = await PRODUCTS.doc(cartData.productId).get();
        
        if (!productSnap.exists) {
          return NextResponse.json({
            error: "Product not available",
            details: `Product ${cartData.productId} no longer exists`
          }, { status: 400 });
        }
      }

      return NextResponse.json({
        success: true,
        message: "Cart validation successful"
      });

    } catch (error) {
      console.error("[DEBUG] Cart validation error:", error);
      return NextResponse.json({
        error: "Failed to validate cart",
        details: error instanceof Error ? error.message : "Unknown error"
      }, { status: 500 });
    }
  });
}
