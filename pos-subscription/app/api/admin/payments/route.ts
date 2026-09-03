import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userToken = authHeader.replace('Bearer ', '');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      apikey: anonKey,
      Authorization: `Bearer ${userToken}`,
    };

    const paymentsRes = await fetch(
      `${supabaseUrl}/rest/v1/payments?order=created_at.desc&select=id,amount,status,created_at,razorpay_payment_id,user_id,profiles(email)`,
      { headers }
    );
    if (!paymentsRes.ok) {
      const errText = await paymentsRes.text();
      return NextResponse.json({ error: `Failed to fetch payments (${paymentsRes.status}): ${errText}` }, { status: 500 });
    }
    const payments = await paymentsRes.json();

    const result = (payments || []).map((p: any) => ({
      id: p.id,
      amount: p.amount,
      status: p.status,
      created_at: p.created_at,
      user_email: Array.isArray(p.profiles) ? p.profiles[0]?.email : p.profiles?.email,
    }));

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
