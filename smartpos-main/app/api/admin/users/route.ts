import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { assertOwner } from '@/app/api/admin/_auth';

export const dynamic = 'force-dynamic';

function daysLeft(date: string | null): number {
  if (!date) return 0;
  return Math.max(
    0,
    Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );
}

export async function GET(req: NextRequest) {
  try {
    const auth = await assertOwner(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

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

    const { data: restaurants, error } = await supabase
      .from('parameters')
      .select(
        'restaurant_id, restaurant_name, login_name, phone, gst_number, address_line1, address_line2, address_line3, owner1, owner2, owner3, owner4, tax_rate, currency, country_code, trial_start, trial_end, trial_used, created_at'
      )
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: `Failed to fetch restaurants (${error.message})` },
        { status: 500 }
      );
    }

    const ownerLogin = (process.env.ALTASOFTWARE_OWNER_LOGIN || '')
      .toLowerCase()
      .trim();
    const filteredRestaurants = (restaurants || []).filter(
      (r: any) => (r.login_name || '').toLowerCase().trim() !== ownerLogin
    );

    const { data: subs } = await supabase
      .from('subscriptions')
      .select(
        'restaurant_id, status, current_period_start, current_period_end, next_billing_date, payment_status, plan_id, created_at, subscription_plans(name, price, duration_days)'
      )
      .order('created_at', { ascending: false });

    const subMap = new Map<string, any>();
    for (const s of subs || []) {
      if (!subMap.has(s.restaurant_id)) {
        subMap.set(s.restaurant_id, s);
      }
    }

    const users = (filteredRestaurants || []).map((r: any) => {
      const sub = subMap.get(r.restaurant_id);
      const isSubActive =
        sub?.status === 'active' &&
        sub.current_period_end &&
        new Date(sub.current_period_end) > new Date();
      const isTrialActive =
        r.trial_end && new Date(r.trial_end) > new Date();

      let status = 'none';
      if (isSubActive) status = 'active';
      else if (isTrialActive) status = 'trial';
      else if (r.trial_used || sub?.status === 'expired') status = 'expired';

      const plan = Array.isArray(sub?.subscription_plans)
        ? sub.subscription_plans[0]
        : (sub?.subscription_plans as any) || null;

      return {
        id: r.restaurant_id,
        email: r.login_name,
        full_name: r.owner1 || r.restaurant_name,
        restaurant_name: r.restaurant_name,
        role: 'admin',
        phone: r.phone,
        gst_number: r.gst_number,
        address: [r.address_line1, r.address_line2, r.address_line3]
          .filter(Boolean)
          .join(', '),
        owners: [r.owner1, r.owner2, r.owner3, r.owner4].filter(Boolean),
        tax_rate: r.tax_rate,
        currency: r.currency,
        country_code: r.country_code,
        created_at: r.created_at,

        trial_start: r.trial_start,
        trial_end: r.trial_end,
        trial_used: !!r.trial_used,
        trial_active: isTrialActive,
        trial_days_remaining: daysLeft(r.trial_end),

        subscription_status: sub?.status || null,
        subscription_start: sub?.current_period_start || null,
        subscription_end: sub?.current_period_end || null,
        subscription_days_remaining: daysLeft(sub?.current_period_end),
        next_billing_date: sub?.next_billing_date || null,
        payment_status: sub?.payment_status || null,
        subscription_created_at: sub?.created_at || null,
        plan_name: plan?.name || null,
        plan_price: plan?.price != null ? Number(plan.price) : null,
        plan_duration_days: plan?.duration_days || null,

        status,
      };
    });

    return NextResponse.json(users);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
