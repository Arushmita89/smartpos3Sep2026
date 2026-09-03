'use client';

import { X, Phone, Mail, MapPin, FileText, User, Coins, Globe, Percent } from 'lucide-react';

export interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  restaurant_name: string | null;
  role: string;
  phone: string | null;
  gst_number: string | null;
  address: string;
  owners: string[];
  tax_rate: number | null;
  currency: string | null;
  country_code: string | null;
  created_at: string;
  trial_start: string | null;
  trial_end: string | null;
  trial_used: boolean;
  trial_active: boolean;
  trial_days_remaining: number;
  subscription_status: string | null;
  subscription_start: string | null;
  subscription_end: string | null;
  subscription_days_remaining: number;
  next_billing_date: string | null;
  payment_status: string | null;
  subscription_created_at: string | null;
  plan_name: string | null;
  plan_price: number | null;
  plan_duration_days: number | null;
  status: 'active' | 'trial' | 'expired' | 'none';
}

export interface AdminPayment {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  restaurant_id: string | null;
  user_email: string | null;
}

function formatDate(date: string | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(date: string | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN');
}

function StatusBadge({ status }: { status: AdminUser['status'] }) {
  const map: Record<AdminUser['status'], { label: string; cls: string }> = {
    active: { label: 'Active', cls: 'bg-green-100 text-green-700' },
    trial: { label: 'Trial', cls: 'bg-amber-100 text-amber-700' },
    expired: { label: 'Expired', cls: 'bg-red-100 text-red-700' },
    none: { label: 'None', cls: 'bg-gray-100 text-gray-600' },
  };
  const m = map[status];
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${m.cls}`}>
      {m.label}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500 font-medium">{label}</span>
      <span className="text-sm text-gray-900 text-right font-medium break-words max-w-[60%]">
        {value}
      </span>
    </div>
  );
}

export default function RestaurantDetailsModal({
  user,
  payments,
  onClose,
}: {
  user: AdminUser;
  payments: AdminPayment[];
  onClose: () => void;
}) {
  const restaurantPayments = payments
    .filter((p) => p.restaurant_id === user.id)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  const formatPrice = (amount: number) => {
    const currency = user.currency || 'INR';
    try {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${currency} ${amount}`;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-gray-900">
              {user.restaurant_name || user.full_name || user.email}
            </h2>
            <StatusBadge status={user.status} />
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Restaurant details */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Restaurant Details
            </h3>
            <div className="rounded-xl border border-gray-100 p-3">
              <InfoRow label="Restaurant ID" value={user.id} />
              <InfoRow label="Email" value={user.email || '—'} />
              <InfoRow label="Phone" value={user.phone || '—'} />
              <InfoRow label="GST Number" value={user.gst_number || '—'} />
              <InfoRow label="Address" value={user.address || '—'} />
              <InfoRow
                label="Owners"
                value={user.owners.length > 0 ? user.owners.join(', ') : '—'}
              />
              <InfoRow label="Tax Rate" value={user.tax_rate != null ? `${user.tax_rate}%` : '—'} />
              <InfoRow label="Currency" value={user.currency || 'INR'} />
              <InfoRow label="Country" value={user.country_code || '—'} />
              <InfoRow label="Registered On" value={formatDateTime(user.created_at)} />
            </div>
          </section>

          {/* Subscription details */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Subscription Details
            </h3>
            <div className="rounded-xl border border-gray-100 p-3">
              <InfoRow label="Plan" value={user.plan_name || '—'} />
              <InfoRow
                label="Plan Price"
                value={user.plan_price != null ? formatPrice(user.plan_price) : '—'}
              />
              <InfoRow
                label="Plan Duration"
                value={
                  user.plan_duration_days != null
                    ? `${user.plan_duration_days} days`
                    : '—'
                }
              />
              <InfoRow
                label="Subscription Status"
                value={user.subscription_status || '—'}
              />
              <InfoRow
                label="Payment Status"
                value={user.payment_status || '—'}
              />
              <InfoRow label="Started On" value={formatDateTime(user.subscription_start)} />
              <InfoRow label="Ends On" value={formatDateTime(user.subscription_end)} />
              <InfoRow
                label="Days Remaining"
                value={
                  user.subscription_days_remaining > 0
                    ? `${user.subscription_days_remaining} day${user.subscription_days_remaining === 1 ? '' : 's'}`
                    : '0'
                }
              />
              <InfoRow label="Next Billing" value={formatDateTime(user.next_billing_date)} />
            </div>
          </section>

          {/* Trial details */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Trial Details
            </h3>
            <div className="rounded-xl border border-gray-100 p-3">
              <InfoRow
                label="Trial Status"
                value={
                  user.trial_active
                    ? 'Active'
                    : user.trial_used
                      ? 'Used / Expired'
                      : 'Not Started'
                }
              />
              <InfoRow label="Trial Start" value={formatDateTime(user.trial_start)} />
              <InfoRow label="Trial End" value={formatDateTime(user.trial_end)} />
              <InfoRow
                label="Trial Days Remaining"
                value={
                  user.trial_active
                    ? `${user.trial_days_remaining} day${user.trial_days_remaining === 1 ? '' : 's'}`
                    : '—'
                }
              />
            </div>
          </section>

          {/* Payment history */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Payment History ({restaurantPayments.length})
            </h3>
            {restaurantPayments.length === 0 ? (
              <p className="text-sm text-gray-400 py-3 text-center border border-dashed border-gray-200 rounded-xl">
                No payments recorded yet.
              </p>
            ) : (
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {restaurantPayments.map((p) => (
                      <tr key={p.id}>
                        <td className="px-3 py-2 text-gray-600">{formatDateTime(p.created_at)}</td>
                        <td className="px-3 py-2 font-medium text-gray-900">
                          {formatPrice(Number(p.amount))}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                              p.status === 'completed' || p.status === 'captured'
                                ? 'bg-green-100 text-green-700'
                                : p.status === 'failed'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
