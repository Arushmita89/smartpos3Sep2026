import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { email, newPassword } = await req.json();

    if (!email || !newPassword) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!serviceKey) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 });
    }

    const listRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    });

    if (!listRes.ok) {
      return NextResponse.json({ error: 'Failed to look up users' }, { status: 500 });
    }

    const { users } = await listRes.json();
    const target = users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase().trim());

    if (!target) {
      return NextResponse.json({ error: 'No account found with that email' }, { status: 404 });
    }

    const updateRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${target.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ password: newPassword }),
    });

    if (!updateRes.ok) {
      const errBody = await updateRes.text();
      return NextResponse.json({ error: `Failed to update password: ${errBody}` }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
