import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userToken = authHeader.replace('Bearer ', '');

    const body = await req.json();
    const { planId, userId } = body;

    if (!planId || !userId) {
      return NextResponse.json(
        { error: 'planId and userId are required' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!razorpayKeyId || !razorpayKeySecret) {
      return NextResponse.json(
        { error: 'Razorpay keys not configured. Add NEXT_PUBLIC_RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env' },
        { status: 500 }
      );
    }

    // Use anon key as apikey, user's JWT as Authorization (RLS allows authenticated to read plans)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      apikey: anonKey,
      Authorization: `Bearer ${userToken}`,
    };

    const planRes = await fetch(
      `${supabaseUrl}/rest/v1/subscription_plans?id=eq.${planId}&select=price,currency,name,duration_days`,
      { headers }
    );

    if (!planRes.ok) {
      const errText = await planRes.text();
      return NextResponse.json(
        { error: `Failed to fetch plan (${planRes.status}): ${errText}` },
        { status: 500 }
      );
    }

    const plans = await planRes.json();
    if (!Array.isArray(plans) || plans.length === 0) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }
    const plan = plans[0];

    if (!plan || plan.price == null) {
      return NextResponse.json({ error: 'Plan data is incomplete' }, { status: 500 });
    }

    const amountInPaise = Math.round(Number(plan.price) * 100);
    const razorpayAuth = `Basic ${Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString('base64')}`;

    // Proxy through Supabase edge function to avoid network restrictions
    const proxyRes = await fetch(`${supabaseUrl}/functions/v1/razorpay-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({
        method: 'POST',
        url: 'https://api.razorpay.com/v1/orders',
        authHeader: razorpayAuth,
        body: {
          amount: amountInPaise,
          currency: plan.currency || 'INR',
          notes: {
            user_id: userId,
            plan_id: planId,
          },
        },
      }),
    });

    if (!proxyRes.ok) {
      const errBody = await proxyRes.text();
      return NextResponse.json(
        { error: `Razorpay order creation failed (${proxyRes.status}): ${errBody}` },
        { status: 502 }
      );
    }

    const order = await proxyRes.json();

    return NextResponse.json({
      orderId: order.id,
      amount: amountInPaise,
      currency: plan.currency || 'INR',
      razorpayKeyId,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
