import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET!;

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
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    };

    if (event.event === 'subscription.activated' || event.event === 'subscription.charged') {
      const payload = event.payload?.subscription?.entity;
      const paymentEntity = event.payload?.payment?.entity;

      if (payload) {
        const userId = payload.notes?.user_id;
        const planId = payload.notes?.plan_id;

        if (userId && planId) {
          const planRes = await fetch(
            `${supabaseUrl}/rest/v1/subscription_plans?id=eq.${planId}&select=duration_days`,
            { headers }
          );
          const plans = await planRes.json();
          const plan = plans?.[0];

          if (plan) {
            const now = new Date();
            const expiresAt = new Date(now);
            expiresAt.setDate(expiresAt.getDate() + plan.duration_days);

            const subRes = await fetch(
              `${supabaseUrl}/rest/v1/subscriptions?user_id=eq.${userId}&order=created_at.desc&limit=1`,
              { headers }
            );
            const existingSubs = await subRes.json();
            const existingSub = existingSubs?.[0];

            let subscriptionId: string;

            if (existingSub) {
              await fetch(`${supabaseUrl}/rest/v1/subscriptions?id=eq.${existingSub.id}`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({
                  status: 'active',
                  subscription_end: expiresAt.toISOString(),
                }),
              });
              subscriptionId = existingSub.id;
            } else {
              const insertRes = await fetch(`${supabaseUrl}/rest/v1/subscriptions`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                  user_id: userId,
                  plan_id: planId,
                  status: 'active',
                  subscription_start: now.toISOString(),
                  subscription_end: expiresAt.toISOString(),
                }),
              });
              const inserted = await insertRes.json();
              subscriptionId = inserted?.[0]?.id;
            }

            if (subscriptionId && paymentEntity) {
              await fetch(`${supabaseUrl}/rest/v1/payments`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                  user_id: userId,
                  subscription_id: subscriptionId,
                  razorpay_payment_id: paymentEntity.id,
                  razorpay_order_id: paymentEntity.order_id,
                  amount: Number(paymentEntity.amount) / 100,
                  currency: paymentEntity.currency || 'INR',
                  status: 'captured',
                }),
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
