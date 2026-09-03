import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import {
  clearExpiryNotifications,
  clearTrialExpiryNotifications,
} from '@/lib/subscriptionNotifications';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      restaurantId,
      planId,
      amount,
      currency,
    } = body;

    if (!restaurantId || !planId) {
      return NextResponse.json(
        { error: 'restaurantId and planId are required' },
        { status: 400 }
      );
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: 'Missing payment verification fields' },
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

    // Verify using the restaurant's own Razorpay secret when it has configured one,
    // otherwise fall back to the platform env-configured secret.
    let razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
    const { data: restaurant } = await admin
      .from('parameters')
      .select('razorpay_key_secret')
      .eq('restaurant_id', restaurantId)
      .maybeSingle();
    if (restaurant?.razorpay_key_secret) {
      razorpayKeySecret = restaurant.razorpay_key_secret;
    }

    if (!razorpayKeySecret) {
      return NextResponse.json(
        { error: 'Razorpay key secret not configured' },
        { status: 500 }
      );
    }

    const expectedSignature = crypto
      .createHmac('sha256', razorpayKeySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
    }

    const orderId = razorpay_order_id;
    const paymentId = razorpay_payment_id;
    const signature = razorpay_signature;

    const { data: plan, error: planError } = await admin
      .from('subscription_plans')
      .select('duration_days,name')
      .eq('id', planId)
      .maybeSingle();

    if (planError || !plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + plan.duration_days);

    const { data: existingSub } = await admin
      .from('subscriptions')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let subscriptionId: string;

    if (existingSub) {
      const { error: updateError } = await admin
        .from('subscriptions')
        .update({
          plan_id: planId,
          status: 'active',
          payment_status: 'completed',
          current_period_start: now.toISOString(),
          current_period_end: expiresAt.toISOString(),
          next_billing_date: expiresAt.toISOString(),
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
        })
        .eq('id', existingSub.id);
      if (updateError) {
        return NextResponse.json(
          { error: `Failed to update subscription: ${updateError.message}` },
          { status: 500 }
        );
      }
      subscriptionId = existingSub.id;
      await clearExpiryNotifications(admin, subscriptionId);
      await clearTrialExpiryNotifications(admin, restaurantId);
    } else {
      const { data: inserted, error: insertError } = await admin
        .from('subscriptions')
        .insert({
          restaurant_id: restaurantId,
          plan_id: planId,
          status: 'active',
          payment_status: 'completed',
          current_period_start: now.toISOString(),
          current_period_end: expiresAt.toISOString(),
          next_billing_date: expiresAt.toISOString(),
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
        })
        .select('id')
        .single();
      if (insertError || !inserted) {
        return NextResponse.json(
          { error: `Failed to create subscription: ${insertError?.message}` },
          { status: 500 }
        );
      }
      subscriptionId = inserted.id;
    }

    const { error: paymentError } = await admin.from('payment_history').insert({
      subscription_id: subscriptionId,
      amount,
      currency: currency || 'INR',
      status: 'completed',
      payment_gateway_id: paymentId,
      payment_gateway_response: JSON.stringify({
        order_id: orderId,
        signature,
      }),
      billing_period_start: now.toISOString(),
      billing_period_end: expiresAt.toISOString(),
    });
    if (paymentError) {
      console.error('Failed to record payment:', paymentError);
    }

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
