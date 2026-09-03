import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getServiceClient(): any {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error('Supabase service role credentials not configured');
  }
  return createClient(url, serviceRoleKey, {
    global: {
      fetch: (input: any, init?: any) =>
        fetch(input, { ...init, cache: 'no-store' }),
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const { amount, restaurantId } = await req.json();

    // Order payments are created with the restaurant's own Razorpay key/secret so
    // the money settles to that restaurant's Razorpay account. Restaurants that
    // haven't set theirs up yet fall back to the platform env-configured merchant.
    let keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    let keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (restaurantId) {
      const admin = getServiceClient();
      const { data: param } = await admin
        .from('parameters')
        .select('razorpay_key_id, razorpay_key_secret')
        .eq('restaurant_id', restaurantId)
        .maybeSingle();
      if (param?.razorpay_key_id && param?.razorpay_key_secret) {
        keyId = param.razorpay_key_id;
        keySecret = param.razorpay_key_secret;
      }
    }

    if (!keyId || !keySecret) {
      return NextResponse.json(
        { error: 'Razorpay keys not configured' },
        { status: 500 }
      );
    }

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100),
        currency: 'INR',
        receipt: `receipt_${Date.now()}`,
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      return NextResponse.json(
        { error: errData.error?.description || 'Failed to create order' },
        { status: response.status }
      );
    }

    const order = await response.json();
    return NextResponse.json({ ...order, razorpayKeyId: keyId });
  } catch (err: any) {
    console.error('Create order error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
