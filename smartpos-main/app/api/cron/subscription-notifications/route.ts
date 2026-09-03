import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import {
  buildExpirySources,
  ensureExpiryNotifications,
} from '@/lib/subscriptionNotifications';

export const dynamic = 'force-dynamic';

async function sendExpiryEmail(to: string, restaurantName: string) {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass || !to) return;

  const port = Number(process.env.SMTP_PORT || 465);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: `"SmartPOS" <${user}>`,
    to,
    subject: 'Your SmartPOS subscription is expiring soon',
    text: `Hi ${restaurantName},

Your SmartPOS subscription or free trial is about to expire.

Please renew your plan now to avoid losing access to your restaurant management system.

If you have any questions, contact our support team.

Thanks,
SmartPOS Team`,
  });
}

export async function GET(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const auth =
        req.headers.get('authorization')?.replace('Bearer ', '') ||
        req.headers.get('x-cron-secret') ||
        req.nextUrl.searchParams.get('secret') ||
        '';
      if (auth !== cronSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
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

    const { data: restaurants } = await admin
      .from('parameters')
      .select('restaurant_id, login_name, restaurant_name, trial_end, trial_used');

    const { data: subscriptions } = await admin
      .from('subscriptions')
      .select('id, restaurant_id, status, current_period_end')
      .eq('status', 'active')
      .not('current_period_end', 'is', null);

    let notificationsCreated = 0;
    let emailsSent = 0;

    const byRestaurant = new Map<
      string,
      Array<{
        id: string;
        status: string;
        current_period_end: string | null;
      }>
    >();
    for (const sub of subscriptions || []) {
      const list = byRestaurant.get(sub.restaurant_id) || [];
      list.push(sub);
      byRestaurant.set(sub.restaurant_id, list);
    }

    for (const restaurant of restaurants || []) {
      const subs = byRestaurant.get(restaurant.restaurant_id) || [];
      let created = 0;
      for (const sub of subs) {
        created += await ensureExpiryNotifications(
          admin,
          buildExpirySources(restaurant, sub)
        );
      }
      created += await ensureExpiryNotifications(
        admin,
        buildExpirySources(restaurant, null)
      );
      notificationsCreated += created;

      if (created > 0 && restaurant.login_name) {
        try {
          await sendExpiryEmail(
            restaurant.login_name,
            restaurant.restaurant_name || restaurant.restaurant_id
          );
          emailsSent++;
        } catch (err) {
          console.error(
            `Failed to send expiry email to ${restaurant.login_name}:`,
            err
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      notificationsCreated,
      emailsSent,
      checked: (restaurants || []).length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
