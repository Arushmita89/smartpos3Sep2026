import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userToken = authHeader.replace('Bearer ', '');

    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // Use anon key as apikey, user's JWT as Authorization (RLS allows reading own profile)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      apikey: anonKey,
      Authorization: `Bearer ${userToken}`,
    };

    // Fetch current profile to check if trial already used
    const profileRes = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=id,ad_free_trial_used,ad_free_trial_end`,
      { headers }
    );

    if (!profileRes.ok) {
      const errText = await profileRes.text();
      return NextResponse.json({ error: `Failed to fetch profile (${profileRes.status}): ${errText}` }, { status: 500 });
    }

    const profiles = await profileRes.json();
    if (!Array.isArray(profiles) || profiles.length === 0) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const profile = profiles[0];

    // Check if already used
    if (profile.ad_free_trial_used) {
      const trialEnd = profile.ad_free_trial_end;
      if (trialEnd && new Date(trialEnd) > new Date()) {
        return NextResponse.json({
          error: 'Ad-free trial is already active',
          trialEnd,
        });
      }
      return NextResponse.json({
        error: 'Ad-free trial has already been used',
      }, { status: 400 });
    }

    // Activate 1-day trial
    const now = new Date();
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + 1);

    const updateRes = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          ad_free_trial_end: trialEnd.toISOString(),
          ad_free_trial_used: true,
        }),
      }
    );

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      return NextResponse.json(
        { error: `Failed to activate trial: ${errText}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      trialEnd: trialEnd.toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
