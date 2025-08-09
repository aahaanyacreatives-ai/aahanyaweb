import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { Favorite } from '@/models/favourite';
import { getServerSession } from "next-auth";
import authOptions from "@/auth.config";

// GET: List user's favorites (populates product)
export async function GET() {
  await connectToDatabase();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Login required" }, { status: 401 });
  const favorites = await Favorite.find({ user: session.user.id }).populate('product').lean();
  // Ensure product._id is string
  const formatted = favorites.map(fav => ({
    ...fav,
    product: fav.product ? { ...fav.product, _id: String(fav.product._id) } : null
  }));
  return NextResponse.json({ favorites: formatted });
}


// POST: Add to favorites
export async function POST(req: NextRequest) {
  await connectToDatabase();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Login required" }, { status: 401 });
  const { productId } = await req.json();
  if (!productId) return NextResponse.json({ error: "No productId" }, { status: 400 });
  const exists = await Favorite.findOne({ user: session.user.id, product: productId });
  if (!exists) await Favorite.create({ user: session.user.id, product: productId });
  return NextResponse.json({ success: true });
}


// DELETE: Remove from favorites
export async function DELETE(req: NextRequest) {
  await connectToDatabase();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Login required" }, { status: 401 });
  const url = new URL(req.url);
  const productId = url.searchParams.get('productId');
  if (!productId) return NextResponse.json({ error: "No productId" }, { status: 400 });
  await Favorite.findOneAndDelete({ user: session.user.id, product: productId });
  return NextResponse.json({ success: true });
}
