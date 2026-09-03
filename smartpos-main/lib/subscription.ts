export interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  hasActiveTrial: boolean;
  trialUsed: boolean;
  isLocked: boolean;
  status: 'active' | 'trial' | 'expired' | 'none';
  trialEnd: string | null;
  trialDaysRemaining: number;
  subscriptionEnd: string | null;
  subscriptionDaysRemaining: number;
  planName: string | null;
  subscriptionId: string | null;
}

export function getDaysRemaining(endDate: string | null): number {
  if (!endDate) return 0;
  const end = new Date(endDate);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export interface SubRow {
  id: string;
  status: string;
  current_period_end: string | null;
  subscription_plans:
    | Array<{ name: string | null }>
    | { name: string | null }
    | null;
}

export function buildSubscriptionStatus(
  rest: {
    restaurant_id: string;
    trial_end?: string | null;
    trial_used?: boolean;
  },
  subData: SubRow | null
): SubscriptionStatus {
  const trialEnd = rest.trial_end || null;
  const trialUsed = rest.trial_used ?? false;
  const hasActiveTrial = !!(trialEnd && new Date(trialEnd) > new Date());

  let hasActiveSubscription = false;
  let subscriptionEnd: string | null = null;
  let planName: string | null = null;
  let subscriptionId: string | null = null;

  if (subData) {
    subscriptionId = subData.id;
    subscriptionEnd = subData.current_period_end || null;
    planName = Array.isArray(subData.subscription_plans)
      ? subData.subscription_plans[0]?.name
      : (subData.subscription_plans as { name: string | null } | null)?.name || null;
    if (
      subData.status === 'active' &&
      subscriptionEnd &&
      new Date(subscriptionEnd) > new Date()
    ) {
      hasActiveSubscription = true;
    }
  }

  const isLocked = !hasActiveSubscription && !hasActiveTrial;
  const status: SubscriptionStatus['status'] = hasActiveSubscription
    ? 'active'
    : hasActiveTrial
      ? 'trial'
      : trialUsed
        ? 'expired'
        : 'none';

  return {
    hasActiveSubscription,
    hasActiveTrial,
    trialUsed,
    isLocked,
    status,
    trialEnd,
    trialDaysRemaining: getDaysRemaining(trialEnd),
    subscriptionEnd,
    subscriptionDaysRemaining: getDaysRemaining(subscriptionEnd),
    planName,
    subscriptionId,
  };
}

export function formatDate(date: string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
