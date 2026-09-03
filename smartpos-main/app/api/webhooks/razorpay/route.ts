import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import {
  clearExpiryNotifications,
  clearTrialExpiryNotifications,
} from '@/lib/subscriptionNotifications';

export async function POST(req: NextRequest) {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET!;

    if (!webhookSecret || webhookSecret === 'your_webhook_secret_here') {
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        global: {
          fetch: (input: any, init?: any) =>
            fetch(input, { ...init, cache: 'no-store' }),
        },
      }
    );

    const isRelevantEvent =
      event.event === 'payment.captured' ||
      event.event === 'subscription.charged' ||
      event.event === 'subscription.activated';

    if (isRelevantEvent) {
      const payload =
        event.payload?.payment?.entity || event.payload?.subscription?.entity;

      if (payload) {
        const restaurantId = payload.notes?.restaurant_id;
        const planId = payload.notes?.plan_id;

        if (restaurantId && planId) {
          const { data: plan } = await supabase
            .from('subscription_plans')
            .select('duration_days')
            .eq('id', planId)
            .maybeSingle();

          if (plan) {
            const now = new Date();
            const expiresAt = new Date(now);
            expiresAt.setDate(expiresAt.getDate() + plan.duration_days);

            const { data: existingSub } = await supabase
              .from('subscriptions')
              .select('id')
              .eq('restaurant_id', restaurantId)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            let subscriptionId: string | undefined;

            if (existingSub) {
              await supabase
                .from('subscriptions')
                .update({
                  status: 'active',
                  payment_status: 'completed',
                  current_period_end: expiresAt.toISOString(),
                  next_billing_date: expiresAt.toISOString(),
                })
                .eq('id', existingSub.id);
              subscriptionId = existingSub.id;
              if (subscriptionId) {
                await clearExpiryNotifications(supabase, subscriptionId);
              }
              await clearTrialExpiryNotifications(supabase, restaurantId);
            } else {
              const { data: inserted } = await supabase
                .from('subscriptions')
                .insert({
                  restaurant_id: restaurantId,
                  plan_id: planId,
                  status: 'active',
                  payment_status: 'completed',
                  current_period_start: now.toISOString(),
                  current_period_end: expiresAt.toISOString(),
                  next_billing_date: expiresAt.toISOString(),
                })
                .select()
                .single();
              subscriptionId = inserted?.id;
            }

            if (subscriptionId) {
              await supabase.from('payment_history').insert({
                subscription_id: subscriptionId,
                amount: Number(payload.amount) / 100,
                currency: payload.currency || 'INR',
                status: 'completed',
                payment_gateway_id: payload.id,
                payment_gateway_response: JSON.stringify({
                  order_id: payload.order_id,
                }),
                billing_period_start: now.toISOString(),
                billing_period_end: expiresAt.toISOString(),
              });
            }
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
