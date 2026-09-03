import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userToken = authHeader.replace('Bearer ', '');

    const body = await req.json();
    const { userId, action, days } = body;

    if (!userId || !action) {
      return NextResponse.json({ error: 'userId and action required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      apikey: anonKey,
      Authorization: `Bearer ${userToken}`,
    };

    const subRes = await fetch(
      `${supabaseUrl}/rest/v1/subscriptions?user_id=eq.${userId}&order=created_at.desc&limit=1`,
      { headers }
    );
    const subs = await subRes.json();
    const existingSub = Array.isArray(subs) ? subs[0] : undefined;

    if (action === 'activate') {
      if (existingSub) {
        const now = new Date();
        const expiresAt = new Date(now);
        expiresAt.setDate(expiresAt.getDate() + 30);
        await fetch(`${supabaseUrl}/rest/v1/subscriptions?id=eq.${existingSub.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            status: 'active',
            subscription_end: expiresAt.toISOString(),
          }),
        });
      } else {
        const now = new Date();
        const expiresAt = new Date(now);
        expiresAt.setDate(expiresAt.getDate() + 30);
        await fetch(`${supabaseUrl}/rest/v1/subscriptions`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            user_id: userId,
            status: 'active',
            subscription_start: now.toISOString(),
            subscription_end: expiresAt.toISOString(),
          }),
        });
      }
      return NextResponse.json({ success: true, action: 'activated' });
    }

    if (action === 'deactivate') {
      if (existingSub) {
        await fetch(`${supabaseUrl}/rest/v1/subscriptions?id=eq.${existingSub.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ status: 'expired' }),
        });
      }
      return NextResponse.json({ success: true, action: 'deactivated' });
    }

    if (action === 'extend' && days) {
      if (existingSub) {
        const currentEnd = existingSub.subscription_end
          ? new Date(existingSub.subscription_end)
          : new Date();
        const newEnd = new Date(currentEnd);
        newEnd.setDate(newEnd.getDate() + days);
        await fetch(`${supabaseUrl}/rest/v1/subscriptions?id=eq.${existingSub.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            status: 'active',
            subscription_end: newEnd.toISOString(),
          }),
        });
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
