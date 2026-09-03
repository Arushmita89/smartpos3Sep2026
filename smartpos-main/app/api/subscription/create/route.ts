import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { convertAmount } from '@/lib/currency';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { planId, restaurantId } = body;

    if (!planId || !restaurantId) {
      return NextResponse.json(
        { error: 'planId and restaurantId are required' },
        { status: 400 }
      );
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: 'Service role key not configured' },
        { status: 500 }
      );
    }
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        global: {
          fetch: (input: any, init?: any) =>
            fetch(input, { ...init, cache: 'no-store' }),
        },
      }
    );

    // Subscriptions are charged to the restaurant's own Razorpay account if it has
    // configured one, otherwise it falls back to the platform env-configured merchant.
    let razorpayKeyId =
      process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
    let razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    const { data: restaurant } = await admin
      .from('parameters')
      .select('currency, razorpay_key_id, razorpay_key_secret')
      .eq('restaurant_id', restaurantId)
      .maybeSingle();

    if (restaurant?.razorpay_key_id && restaurant?.razorpay_key_secret) {
      razorpayKeyId = restaurant.razorpay_key_id;
      razorpayKeySecret = restaurant.razorpay_key_secret;
    }

    if (!razorpayKeyId || !razorpayKeySecret) {
      return NextResponse.json(
        {
          error:
            'Razorpay keys not configured. Add NEXT_PUBLIC_RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env',
        },
        { status: 500 }
      );
    }

    const { data: plan, error: planError } = await admin
      .from('subscription_plans')
      .select('price,name,duration_days,currency')
      .eq('id', planId)
      .maybeSingle();

    if (planError || !plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const planCurrency = (plan.currency || 'INR').toUpperCase();

    let chargeAmount = Number(plan.price);
    if (planCurrency !== 'INR') {
      const converted = await convertAmount(Number(plan.price), planCurrency, 'INR');
      if (converted != null) {
        chargeAmount = converted;
      }
    }

    const amountInPaise = Math.round(chargeAmount * 100);
    const currency = 'INR';
    const razorpayAuth = `Basic ${Buffer.from(
      `${razorpayKeyId}:${razorpayKeySecret}`
    ).toString('base64')}`;

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: razorpayAuth,
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency,
        notes: {
          restaurant_id: restaurantId,
          plan_id: planId,
          plan_currency: planCurrency,
          restaurant_currency: restaurant?.currency || 'INR',
        },
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

    return NextResponse.json({
      orderId: order.id,
      amount: amountInPaise,
      currency,
      razorpayKeyId,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
