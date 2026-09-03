import { NextRequest, NextResponse } from 'next/server';
import { verifyOtp } from '@/lib/otp';

export async function POST(req: NextRequest) {
  try {
    const { email, code, purpose } = await req.json();

    if (!email || !code || !purpose) {
      return NextResponse.json({ error: 'email, code, and purpose are required' }, { status: 400 });
    }

    await verifyOtp(email, code, purpose);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'OTP verification failed' },
      { status: 400 }
    );
  }
}
