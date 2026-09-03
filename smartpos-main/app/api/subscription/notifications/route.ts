import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  buildExpirySources,
  ensureExpiryNotifications,
  fetchRestaurantNotifications,
} from '@/lib/subscriptionNotifications';

export const dynamic = 'force-dynamic';

function getAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error('Service role key not configured');
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      global: {
        fetch: (input: any, init?: any) =>
          fetch(input, { ...init, cache: 'no-store' }),
      },
    }
  );
}

export async function GET(req: NextRequest) {
  try {
    const restaurantId = req.nextUrl.searchParams.get('restaurantId');

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'restaurantId is required' },
        { status: 400 }
      );
    }

    const admin = getAdminClient();

    const { data: restaurant } = await admin
      .from('parameters')
      .select('restaurant_id, trial_end, trial_used')
      .eq('restaurant_id', restaurantId)
      .maybeSingle();

    const { data: subData } = await admin
      .from('subscriptions')
      .select('id, status, current_period_end')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    try {
      await ensureExpiryNotifications(
        admin,
        buildExpirySources(
          restaurant || { restaurant_id: restaurantId },
          subData
        )
      );
    } catch (err) {
      console.error('Failed to generate expiry notifications:', err);
    }

    const notifications = await fetchRestaurantNotifications(admin, restaurantId);
    const unread = notifications.filter((n) => !n.is_read).length;

    return NextResponse.json({ notifications, unread_count: unread });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, restaurantId, markAll } = body;

    if (!id && !(restaurantId && markAll)) {
      return NextResponse.json(
        { error: 'id or restaurantId with markAll is required' },
        { status: 400 }
      );
    }

    const admin = getAdminClient();

    if (id) {
      await admin
        .from('subscription_notifications')
        .update({ is_read: true })
        .eq('id', id);
    } else if (restaurantId && markAll) {
      await admin
        .from('subscription_notifications')
        .update({ is_read: true })
        .eq('restaurant_id', restaurantId)
        .eq('is_read', false);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
