import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { assertOwner } from '@/app/api/admin/_auth';

export async function PATCH(req: NextRequest) {
  try {
    const auth = await assertOwner(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { restaurantId, action, days } = body;

    if (!restaurantId || !action) {
      return NextResponse.json(
        { error: 'restaurantId and action required' },
        { status: 400 }
      );
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

    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('id, current_period_end')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (action === 'activate') {
      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setDate(expiresAt.getDate() + 30);
      if (existingSub) {
        await supabase
          .from('subscriptions')
          .update({ status: 'active', current_period_end: expiresAt.toISOString() })
          .eq('id', existingSub.id);
      } else {
        await supabase.from('subscriptions').insert({
          restaurant_id: restaurantId,
          status: 'active',
          current_period_start: now.toISOString(),
          current_period_end: expiresAt.toISOString(),
        });
      }
      return NextResponse.json({ success: true, action: 'activated' });
    }

    if (action === 'deactivate') {
      if (existingSub) {
        await supabase
          .from('subscriptions')
          .update({ status: 'expired' })
          .eq('id', existingSub.id);
      }
      return NextResponse.json({ success: true, action: 'deactivated' });
    }

    if (action === 'extend' && days) {
      if (existingSub) {
        const currentEnd = existingSub.current_period_end
          ? new Date(existingSub.current_period_end)
          : new Date();
        const newEnd = new Date(currentEnd);
        newEnd.setDate(newEnd.getDate() + days);
        await supabase
          .from('subscriptions')
          .update({ status: 'active', subscription_end: newEnd.toISOString() })
          .eq('id', existingSub.id);
      }
      return NextResponse.json({ success: true, action: 'extended', days });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
