import { SupabaseClient } from '@supabase/supabase-js';
import { getDaysRemaining } from './subscription';

export const TRIAL_DAYS = 30;

export interface ExpirySource {
  subscriptionId: string | null;
  restaurantId: string;
  endDate: string | null;
  isActive: boolean;
  kind: 'subscription' | 'trial';
}

export interface ExpiryNotification {
  id: string;
  subscription_id: string | null;
  restaurant_id: string;
  type: string | null;
  title: string | null;
  message: string | null;
  is_read: boolean;
  created_at: string;
}

export function buildExpirySources(
  restaurant: {
    restaurant_id: string;
    trial_end?: string | null;
    trial_used?: boolean;
  },
  sub: {
    id?: string;
    status?: string;
    current_period_end?: string | null;
  } | null
): ExpirySource[] {
  const sources: ExpirySource[] = [];

  const trialEnd = restaurant.trial_end || null;
  if (trialEnd && new Date(trialEnd) > new Date()) {
    sources.push({
      subscriptionId: null,
      restaurantId: restaurant.restaurant_id,
      endDate: trialEnd,
      isActive: true,
      kind: 'trial',
    });
  }

  if (
    sub &&
    sub.status === 'active' &&
    sub.current_period_end &&
    new Date(sub.current_period_end) > new Date()
  ) {
    sources.push({
      subscriptionId: sub.id || null,
      restaurantId: restaurant.restaurant_id,
      endDate: sub.current_period_end,
      isActive: true,
      kind: 'subscription',
    });
  }

  return sources;
}

function formatDateShort(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  });
}

function kindLabel(kind: ExpirySource['kind']): string {
  return kind === 'subscription' ? 'subscription' : 'free trial';
}

export async function ensureExpiryNotifications(
  client: SupabaseClient<any, any, any>,
  sources: ExpirySource[]
): Promise<number> {
  let created = 0;

  for (const source of sources) {
    if (!source.isActive) continue;
    const days = getDaysRemaining(source.endDate);
    if (days <= 0) continue;

    const windows: { type: string; title: string; message: string }[] = [];

    if (days <= 3) {
      windows.push({
        type: `${source.kind}_expiry_3d`,
        title: `${source.kind === 'subscription' ? 'Subscription' : 'Free trial'} expiring soon`,
        message: `Your ${kindLabel(source.kind)} expires in ${days} day${
          days === 1 ? '' : 's'
        } (${formatDateShort(source.endDate)}). Renew now to avoid losing access to SmartPOS.`,
      });
    }

    if (days <= 1) {
      windows.push({
        type: `${source.kind}_expiry_1d`,
        title: `Last day of your ${kindLabel(source.kind)}`,
        message: `Your ${kindLabel(source.kind)} expires tomorrow (${formatDateShort(
          source.endDate
        )}). Renew today to continue using SmartPOS without interruption.`,
      });
    }

    for (const win of windows) {
      let query = client
        .from('subscription_notifications')
        .select('id')
        .eq('restaurant_id', source.restaurantId)
        .eq('type', win.type);

      if (source.subscriptionId) {
        query = query.eq('subscription_id', source.subscriptionId);
      } else {
        query = query.is('subscription_id', null);
      }

      const { data: existing } = await query.maybeSingle();
      if (existing) continue;

      const { error } = await client.from('subscription_notifications').insert({
        subscription_id: source.subscriptionId,
        restaurant_id: source.restaurantId,
        type: win.type,
        title: win.title,
        message: win.message,
        is_read: false,
      });

      if (!error) created++;
    }
  }

  return created;
}

export async function clearExpiryNotifications(
  client: SupabaseClient<any, any, any>,
  subscriptionId: string
): Promise<void> {
  await client
    .from('subscription_notifications')
    .delete()
    .eq('subscription_id', subscriptionId)
    .like('type', '%expiry%');
}

export async function clearTrialExpiryNotifications(
  client: SupabaseClient<any, any, any>,
  restaurantId: string
): Promise<void> {
  await client
    .from('subscription_notifications')
    .delete()
    .eq('restaurant_id', restaurantId)
    .is('subscription_id', null)
    .like('type', 'trial%expiry%');
}

export async function fetchRestaurantNotifications(
  client: SupabaseClient<any, any, any>,
  restaurantId: string
): Promise<ExpiryNotification[]> {
  const { data } = await client
    .from('subscription_notifications')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
    .limit(50);

  return (data as ExpiryNotification[]) || [];
}
