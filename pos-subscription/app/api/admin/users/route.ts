import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userToken = authHeader.replace('Bearer ', '');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      apikey: anonKey,
      Authorization: `Bearer ${userToken}`,
    };

    const usersRes = await fetch(
      `${supabaseUrl}/rest/v1/profiles?select=id,email,full_name,role,trial_start,trial_end,trial_used,created_at`,
      { headers }
    );
    if (!usersRes.ok) {
      const errText = await usersRes.text();
      return NextResponse.json({ error: `Failed to fetch users (${usersRes.status}): ${errText}` }, { status: 500 });
    }
    const profiles = await usersRes.json();

    const subsRes = await fetch(
      `${supabaseUrl}/rest/v1/subscriptions?select=user_id,status,subscription_end,plan_id,subscription_plans(name)`,
      { headers }
    );
    const subs = await subsRes.json();

    const subMap = new Map<string, any>();
    for (const s of subs || []) {
      if (!subMap.has(s.user_id)) {
        subMap.set(s.user_id, s);
      }
    }

    const users = (profiles || []).map((p: any) => {
      const sub = subMap.get(p.id);
      return {
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        role: p.role,
        trial_start: p.trial_start,
        trial_end: p.trial_end,
        trial_used: p.trial_used,
        created_at: p.created_at,
        subscription_status: sub?.status || null,
        subscription_end: sub?.subscription_end || null,
        plan_name: Array.isArray(sub?.subscription_plans)
          ? sub.subscription_plans[0]?.name
          : (sub?.subscription_plans as any)?.name || null,
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
