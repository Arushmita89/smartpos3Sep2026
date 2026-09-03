import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export type OwnerCheck = { ok: true } | { ok: false; status: number; error: string };

export async function assertOwner(req: NextRequest): Promise<OwnerCheck> {
  const ownerLogin = (process.env.ALTASOFTWARE_OWNER_LOGIN || '')
    .toLowerCase()
    .trim();

  if (!ownerLogin) {
    return {
      ok: false,
      status: 500,
      error: 'ALTASOFTWARE_OWNER_LOGIN is not configured on the server',
    };
  }

  const loginName = (req.headers.get('x-login-name') || '')
    .toLowerCase()
    .trim();
  const restaurantId = (req.headers.get('x-restaurant-id') || '').trim();

  if (!loginName || loginName !== ownerLogin) {
    return { ok: false, status: 403, error: 'Forbidden: owner access only' };
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      global: {
        fetch: (input: any, init?: any) =>
          fetch(input, { ...init, cache: 'no-store' }),
      },
    }
  );

  const { data: match } = await supabase
    .from('parameters')
    .select('restaurant_id')
    .eq('login_name', loginName)
    .eq('restaurant_id', restaurantId)
    .maybeSingle();

  if (!match) {
    return { ok: false, status: 403, error: 'Forbidden: owner access only' };
  }

  return { ok: true };
}
