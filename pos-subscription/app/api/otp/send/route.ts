import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { storeOtp } from '@/lib/otp';

export async function POST(req: NextRequest) {
  try {
    const { email, purpose } = await req.json();

    if (!email || !purpose) {
      return NextResponse.json({ error: 'email and purpose are required' }, { status: 400 });
    }
    if (purpose !== 'signup' && purpose !== 'password_reset') {
      return NextResponse.json({ error: 'Invalid purpose' }, { status: 400 });
    }

    const code = await storeOtp(email, purpose);

    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!user || !pass) {
      return NextResponse.json({ error: 'SMTP not configured' }, { status: 500 });
    }

    const port = Number(process.env.SMTP_PORT || 465);
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const subject = purpose === 'signup'
      ? 'SmartPOS - Verify Your Email'
      : 'SmartPOS - Password Reset Code';

    await transporter.sendMail({
      from: `"SmartPOS" <${user}>`,
      to: email,
      subject,
      text: `Your verification code is: ${code}\n\nThis code expires in 10 minutes.\nIf you did not request this, please ignore this email.`,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Send OTP error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to send OTP' },
      { status: 500 }
    );
  }
}
