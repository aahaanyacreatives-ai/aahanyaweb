import { NextResponse } from 'next/server';

export function successResponse(data: any, message = 'Success') {
  return NextResponse.json({
    success: true,
    message,
    data,
  });
}

export function errorResponse(message: string, status = 400) {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    { status }
  );
}
