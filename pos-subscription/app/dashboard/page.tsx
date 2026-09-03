'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import Dashboard from '@/app/features/dashboard/Dashboard';
import {
  Store,
  CreditCard,
  Calendar,
  CheckCircle,
  AlertCircle,
  Loader2,
  Clock,
  TrendingUp,
  History,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface PaymentRecord {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  razorpay_payment_id: string | null;
}

export default function DashboardPage() {
  const { user, subscription, loading, signOut, refreshSubscription } = useAuth();
  const router = useRouter();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [showMainDashboard, setShowMainDashboard] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
      return;
    }
    if (!loading && user && subscription?.isLocked) {
      router.replace('/subscription');
      return;
    }
    if (!loading && user && subscription && !subscription.isLocked) {
      fetchPayments();
    }
  }, [loading, user, subscription, router]);

  const fetchPayments = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('id, amount, status, created_at, razorpay_payment_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      setPayments(data || []);
    } catch (err) {
      console.error('Error fetching payments:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) return null;

  if (showMainDashboard) {
    return <Dashboard />;
  }

  const trialEndDate = subscription?.trialEnd
    ? new Date(subscription.trialEnd).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '—';

  const subEndDate = subscription?.subscriptionEnd
    ? new Date(subscription.subscriptionEnd).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '—';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-600 text-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Store className="h-7 w-7" />
            <h1 className="text-xl font-bold">SmartPOS Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-blue-100 hidden sm:block">{user.email}</span>
            <button
              onClick={signOut}
              className="text-sm bg-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-800 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Welcome */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Welcome, {user.user_metadata?.full_name || user.email}!
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Manage your restaurant and subscription from here.
          </p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Trial Status */}
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Trial Status</h3>
            </div>
            {subscription?.hasActiveTrial ? (
              <>
                <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  Active
                </span>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {subscription.trialDaysRemaining} days
                </p>
                <p className="text-sm text-gray-500">remaining</p>
                <p className="text-xs text-gray-400 mt-1">Expires: {trialEndDate}</p>
              </>
            ) : (
              <>
                <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                  Expired
                </span>
                <p className="text-sm text-gray-500 mt-2">Trial ended on {trialEndDate}</p>
              </>
            )}
          </div>

          {/* Subscription Status */}
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Subscription</h3>
            </div>
            {subscription?.hasActiveSubscription ? (
              <>
                <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  Active
                </span>
                <p className="text-lg font-bold text-gray-900 mt-2">
                  {subscription.planName}
                </p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {subscription.subscriptionDaysRemaining} days
                </p>
                <p className="text-sm text-gray-500">remaining</p>
                <p className="text-xs text-gray-400 mt-1">Expires: {subEndDate}</p>
              </>
            ) : (
              <>
                <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  No active subscription
                </span>
                <button
                  onClick={() => router.push('/subscription')}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium mt-3"
                >
                  Subscribe Now
                </button>
              </>
            )}
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Account</h3>
            </div>
            <p className="text-sm text-gray-500">Plan</p>
            <p className="text-lg font-bold text-gray-900">
              {subscription?.planName || 'Free Trial'}
            </p>
            <button
              onClick={() => router.push('/subscription')}
              className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium mt-3"
            >
              Renew Subscription
            </button>
          </div>
        </div>

        {/* Payment History */}
        <div className="bg-white rounded-2xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Payment History</h3>
            </div>
            <button
              onClick={fetchPayments}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
          {payments.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No payments yet.</p>
          ) : (
            <div className="space-y-2">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between border border-gray-100 rounded-lg p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      ₹{Number(payment.amount).toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(payment.created_at).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  <span
                    className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      payment.status === 'captured'
                        ? 'bg-green-100 text-green-700'
                        : payment.status === 'failed'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {payment.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Go to POS */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h3 className="font-semibold text-gray-900 mb-2">Restaurant POS</h3>
          <p className="text-sm text-gray-500 mb-4">
            Access your restaurant management dashboard — menu, orders, analytics, and more.
          </p>
          <button
            onClick={() => setShowMainDashboard(true)}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Open POS Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
