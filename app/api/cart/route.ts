import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb'
import { Cart } from '@/models/cart';
import { getServerSession } from "next-auth";
import authOptions from "@/auth.config"; // Default export!

// GET: Get user's cart (populated)
export async function GET() {
  await connectToDatabase();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Login required" }, { status: 401 });
  const cart = await Cart.find({ user: session.user.id }).populate('product').lean();
  return NextResponse.json({ cart });
}

// POST: Add/update item in cart
export async function POST(req: NextRequest) {
  await connectToDatabase();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Login required" }, { status: 401 });
  const { productId, quantity = 1, customSize, customImage } = await req.json();
  if (!productId) return NextResponse.json({ error: "Product ID required" }, { status: 400 });

  let cartItem = await Cart.findOne({ user: session.user.id, product: productId, customSize: customSize || null });
  if (cartItem) {
    cartItem.quantity += quantity;
    cartItem.customImage = customImage || cartItem.customImage;
    await cartItem.save();
  } else {
    cartItem = await Cart.create({ user: session.user.id, product: productId, quantity, customSize, customImage });
  }
  return NextResponse.json({ success: true, cartItem });
}

// DELETE: Remove cart item (by productId, customSize)
export async function DELETE(req: NextRequest) {
  await connectToDatabase();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Login required" }, { status: 401 });
  const url = new URL(req.url);
  const productId = url.searchParams.get('productId');
  const customSize = url.searchParams.get('customSize');
  if (!productId) return NextResponse.json({ error: "Product ID required" }, { status: 400 });

  const removeQuery: any = { user: session.user.id, product: productId };
  if (customSize) removeQuery.customSize = customSize;
  const result = await Cart.findOneAndDelete(removeQuery);

  if (!result) return NextResponse.json({ error: "Cart item not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
