import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req });
    console.log('[DEBUG] Token in admin check:', token);

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (token.role !== 'admin') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    return NextResponse.json({ success: true, role: token.role });
  } catch (error) {
    console.error('[DEBUG] Admin check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
