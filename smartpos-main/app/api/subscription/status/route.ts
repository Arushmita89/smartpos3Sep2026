import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { buildSubscriptionStatus } from '@/lib/subscription';
import {
  buildExpirySources,
  ensureExpiryNotifications,
} from '@/lib/subscriptionNotifications';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const restaurantId = req.nextUrl.searchParams.get('restaurantId');

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'restaurantId is required' },
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

    const { data: restaurant, error: fetchError } = await admin
      .from('parameters')
      .select('restaurant_id, trial_end, trial_used')
      .eq('restaurant_id', restaurantId)
      .maybeSingle();

    if (fetchError || !restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    const { data: subData } = await admin
      .from('subscriptions')
      .select('id, status, current_period_end, subscription_plans ( name )')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    try {
      await ensureExpiryNotifications(
        admin,
        buildExpirySources(restaurant, subData)
      );
    } catch (err) {
      console.error('Failed to generate expiry notifications:', err);
    }

    return NextResponse.json(buildSubscriptionStatus(restaurant, subData));
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
