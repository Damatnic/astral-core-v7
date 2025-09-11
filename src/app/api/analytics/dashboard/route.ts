import { NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      data: { message: 'Analytics dashboard placeholder' }
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}