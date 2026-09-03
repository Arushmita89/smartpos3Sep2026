import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { assertOwner } from '@/app/api/admin/_auth';

export const dynamic = 'force-dynamic';

const createAdminClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      global: {
        fetch: (input: any, init?: any) =>
          fetch(input, { ...init, cache: 'no-store' }),
      },
    }
  );

export async function GET(req: NextRequest) {
  try {
    const auth = await assertOwner(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const supabase = createAdminClient();
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    const country = (searchParams.get('country') || '').trim();
    const restaurantId = (searchParams.get('restaurantId') || '').trim();

    let query = supabase
      .from('subscription_plans')
      .select('*')
      .order('country_code', { ascending: true })
      .order('duration_days', { ascending: true });

    if (country) query = query.eq('country_code', country);
    if (restaurantId) query = query.eq('restaurant_id', restaurantId);
    if (q) query = query.or(`name.ilike.%${q}%,plan_code.ilike.%${q}%`);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: `Failed to fetch plans (${error.message})` }, { status: 500 });
    }
    return NextResponse.json(data || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await assertOwner(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const supabase = createAdminClient();
    const body = await req.json();
    const {
      name,
      duration_days,
      price,
      currency,
      country_code,
      plan_code,
      restaurant_id,
      is_active,
    } = body;

    if (!name || !duration_days || price == null) {
      return NextResponse.json(
        { error: 'name, duration_days and price are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('subscription_plans')
      .insert({
        name,
        duration_days: Number(duration_days),
        price: Number(price),
        currency: currency || 'INR',
        country_code: country_code || 'IN',
        plan_code: plan_code || null,
        restaurant_id: restaurant_id || null,
        is_active: is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: `Failed to create plan (${error.message})` }, { status: 500 });
    }
    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await assertOwner(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const supabase = createAdminClient();
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('subscription_plans')
      .update({
        ...updates,
        restaurant_id: updates.restaurant_id || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: `Failed to update plan (${error.message})` }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await assertOwner(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const supabase = createAdminClient();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { error } = await supabase.from('subscription_plans').delete().eq('id', id);
    if (error) {
      return NextResponse.json({ error: `Failed to delete plan (${error.message})` }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
