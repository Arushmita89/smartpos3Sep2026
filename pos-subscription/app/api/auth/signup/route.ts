import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fullName, email, password, restaurantData } = body;

    if (!email || !password || !fullName) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // Step 1: Create auth user via Supabase Auth API (anon key works for auth)
    const authRes = await fetch(`${supabaseUrl}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
      },
      body: JSON.stringify({
        email: email.toLowerCase().trim(),
        password,
        data: { full_name: fullName },
      }),
    });

    if (!authRes.ok) {
      const errBody = await authRes.text();
      return NextResponse.json(
        { error: `Signup failed: ${errBody}` },
        { status: authRes.status }
      );
    }

    const authData = await authRes.json();
    const userId = authData?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Signup failed — no user returned' }, { status: 500 });
    }

    // Step 2: If restaurant data provided, create business record using the
    // user's access token (if available from signup) via the SECURITY DEFINER
    // function. If no session from signup, the client will call this after login.
    if (restaurantData && restaurantData.restaurantName && authData.session?.access_token) {
      const userToken = authData.session.access_token;

      await fetch(`${supabaseUrl}/rest/v1/rpc/create_business_for_user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: anonKey,
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          p_name: restaurantData.restaurantName,
          p_gst_number: restaurantData.gstNumber || null,
          p_phone: restaurantData.phone || null,
          p_address_line1: restaurantData.addressLine1 || null,
          p_address_line2: restaurantData.addressLine2 || null,
          p_address_line3: restaurantData.addressLine3 || null,
          p_owner1: restaurantData.owner1 || null,
          p_owner2: restaurantData.owner2 || null,
          p_owner3: restaurantData.owner3 || null,
          p_owner4: restaurantData.owner4 || null,
          p_tax_rate: parseFloat(restaurantData.taxRate) || 18,
        }),
      });
    }

    return NextResponse.json({
      success: true,
      userId,
      session: authData.session || null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
