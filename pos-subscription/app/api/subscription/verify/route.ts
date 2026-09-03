import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userToken = authHeader.replace('Bearer ', '');

    const body = await req.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      userId,
      planId,
      amount,
    } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: 'Missing payment verification fields' },
        { status: 400 }
      );
    }

    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!razorpayKeySecret) {
      return NextResponse.json(
        { error: 'Razorpay key secret not configured' },
        { status: 500 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // Use anon key as apikey, user's JWT as Authorization
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      apikey: anonKey,
      Authorization: `Bearer ${userToken}`,
    };

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', razorpayKeySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
    }

    // Fetch plan
    const planRes = await fetch(
      `${supabaseUrl}/rest/v1/subscription_plans?id=eq.${planId}&select=duration_days,name`,
      { headers }
    );
    if (!planRes.ok) {
      return NextResponse.json({ error: `Failed to fetch plan (${planRes.status})` }, { status: 500 });
    }
    const plans = await planRes.json();
    if (!Array.isArray(plans) || plans.length === 0) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }
    const plan = plans[0];

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + plan.duration_days);

    // Check for existing subscription
    const subRes = await fetch(
      `${supabaseUrl}/rest/v1/subscriptions?user_id=eq.${userId}&order=created_at.desc&limit=1`,
      { headers }
    );
    const existingSubs = await subRes.json();
    const existingSub = Array.isArray(existingSubs) ? existingSubs[0] : undefined;

    let subscriptionId: string;

    if (existingSub) {
      const updateRes = await fetch(
        `${supabaseUrl}/rest/v1/subscriptions?id=eq.${existingSub.id}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            plan_id: planId,
            status: 'active',
            subscription_start: now.toISOString(),
            subscription_end: expiresAt.toISOString(),
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
          }),
        }
      );
      if (!updateRes.ok) {
        const errText = await updateRes.text();
        return NextResponse.json({ error: `Failed to update subscription: ${errText}` }, { status: 500 });
      }
      subscriptionId = existingSub.id;
    } else {
      const insertRes = await fetch(`${supabaseUrl}/rest/v1/subscriptions`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify({
          user_id: userId,
          plan_id: planId,
          status: 'active',
          subscription_start: now.toISOString(),
          subscription_end: expiresAt.toISOString(),
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
        }),
      });
      if (!insertRes.ok) {
        const errText = await insertRes.text();
        return NextResponse.json({ error: `Failed to create subscription: ${errText}` }, { status: 500 });
      }
      const inserted = await insertRes.json();
      if (!Array.isArray(inserted) || !inserted[0]) {
        return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 });
      }
      subscriptionId = inserted[0].id;
    }

    // Create payment record
    await fetch(`${supabaseUrl}/rest/v1/payments`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        user_id: userId,
        subscription_id: subscriptionId,
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        amount,
        currency: 'INR',
        status: 'captured',
      }),
    });

    return NextResponse.json({
      success: true,
      expiresAt: expiresAt.toISOString(),
      planName: plan.name,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
