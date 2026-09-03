export interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  hasActiveTrial: boolean;
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

export function formatDate(date: string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
