import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { assertOwner } from '@/app/api/admin/_auth';

export const dynamic = 'force-dynamic';

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

    const { data: payments, error } = await supabase
      .from('payment_history')
      .select(
        'id, amount, status, created_at, payment_gateway_id, subscriptions ( restaurant_id )'
      )
      .order('created_at', { ascending: false });

    if (error) {
      const isMissingTable =
        (error.code as string) === '42P01' ||
        (error.message || '').includes('could not find the table') ||
        (error.message || '').includes('relation "payment_history" does not exist');
      if (isMissingTable) {
        return NextResponse.json([]);
      }
      return NextResponse.json(
        { error: `Failed to fetch payments (${error.message})` },
        { status: 500 }
      );
    }

    const restaurantIds = Array.from(
      new Set(
        (payments || [])
          .map((p: any) =>
            Array.isArray(p.subscriptions)
              ? p.subscriptions[0]?.restaurant_id
              : p.subscriptions?.restaurant_id
          )
          .filter(Boolean)
      )
    );

    let nameMap = new Map<string, string>();
    if (restaurantIds.length > 0) {
      const { data: restaurants } = await supabase
        .from('parameters')
        .select('restaurant_id, restaurant_name, login_name')
        .in('restaurant_id', restaurantIds);
      for (const r of restaurants || []) {
        nameMap.set(r.restaurant_id, r.login_name || r.restaurant_name);
      }
    }

    const result = (payments || []).map((p: any) => {
      const restaurantId = Array.isArray(p.subscriptions)
        ? p.subscriptions[0]?.restaurant_id
        : p.subscriptions?.restaurant_id;
      return {
        id: p.id,
        amount: p.amount,
        status: p.status,
        created_at: p.created_at,
        restaurant_id: restaurantId || null,
        user_email: nameMap.get(restaurantId) || null,
      };
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
