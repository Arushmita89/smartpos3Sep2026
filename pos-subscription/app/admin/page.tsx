'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  Store,
  Users,
  CreditCard,
  Search,
  Filter,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  IndianRupee,
  Shield,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  trial_start: string | null;
  trial_end: string | null;
  trial_used: boolean;
  created_at: string;
  subscription_status: string | null;
  subscription_end: string | null;
  plan_name: string | null;
}

interface AdminPayment {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  user_email: string | null;
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'users' | 'subscriptions' | 'payments'>('users');
  const [totalRevenue, setTotalRevenue] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
      return;
    }
    if (!authLoading && user) {
      loadData();
    }
  }, [authLoading, user, router]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) return;

      const [usersRes, paymentsRes] = await Promise.all([
        fetch('/api/admin/users', {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch('/api/admin/payments', {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      ]);

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData);
      }
      if (paymentsRes.ok) {
        const paymentsData = await paymentsRes.json();
        setPayments(paymentsData);
        const revenue = paymentsData
          .filter((p: AdminPayment) => p.status === 'captured')
          .reduce((sum: number, p: AdminPayment) => sum + Number(p.amount), 0);
        setTotalRevenue(revenue);
      }
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (userId: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const res = await fetch('/api/admin/activate', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ userId, action: 'activate' }),
      });
      if (!res.ok) throw new Error('Failed to activate');
      toast.success('Subscription activated');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to activate');
    }
  };

  const handleDeactivate = async (userId: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const res = await fetch('/api/admin/activate', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ userId, action: 'deactivate' }),
      });
      if (!res.ok) throw new Error('Failed to deactivate');
      toast.success('Subscription deactivated');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to deactivate');
    }
  };

  const handleExtend = async (userId: string, days: number) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const res = await fetch('/api/admin/activate', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ userId, action: 'extend', days }),
      });
      if (!res.ok) throw new Error('Failed to extend');
      toast.success(`Subscription extended by ${days} days`);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to extend');
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      !searchTerm ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.full_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'trial' && u.trial_used && u.trial_end && new Date(u.trial_end) > new Date()) ||
      (statusFilter === 'active' && u.subscription_status === 'active') ||
      (statusFilter === 'expired' &&
        ((u.subscription_status === 'expired') ||
         (u.trial_end && new Date(u.trial_end) < new Date() && !u.subscription_status)));
    const matchesPlan = planFilter === 'all' || u.plan_name === planFilter;
    return matchesSearch && matchesStatus && matchesPlan;
  });

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) return null;

  const trialUsers = users.filter(
    (u) => u.trial_used && u.trial_end && new Date(u.trial_end) > new Date()
  );
  const activeUsers = users.filter((u) => u.subscription_status === 'active');
  const expiredUsers = users.filter(
    (u) =>
      u.subscription_status === 'expired' ||
      (u.trial_end && new Date(u.trial_end) < new Date() && !u.subscription_status)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gray-900 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-7 w-7" />
            <h1 className="text-xl font-bold">Admin Panel</h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-sm text-gray-300 hover:text-white transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-5 w-5 text-blue-600" />
              <p className="text-sm text-gray-500">Total Users</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{users.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-amber-600" />
              <p className="text-sm text-gray-500">Trial Users</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{trialUsers.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="text-sm text-gray-500">Active Subs</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{activeUsers.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center gap-2 mb-2">
              <IndianRupee className="h-5 w-5 text-green-600" />
              <p className="text-sm text-gray-500">Total Revenue</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              ₹{totalRevenue.toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          {(['users', 'subscriptions', 'payments'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Users & Subscriptions Tab */}
        {(activeTab === 'users' || activeTab === 'subscriptions') && (
          <>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              >
                <option value="all">All Status</option>
                <option value="trial">Trial Active</option>
                <option value="active">Subscribed</option>
                <option value="expired">Expired</option>
              </select>
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              >
                <option value="all">All Plans</option>
                <option value="1 Month">1 Month</option>
                <option value="3 Months">3 Months</option>
                <option value="6 Months">6 Months</option>
                <option value="12 Months">12 Months</option>
              </select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiry</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredUsers.map((u) => {
                      const isTrialActive = u.trial_end && new Date(u.trial_end) > new Date();
                      const isSubActive = u.subscription_status === 'active' && u.subscription_end && new Date(u.subscription_end) > new Date();
                      return (
                        <tr key={u.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-gray-900">{u.full_name || '—'}</p>
                            <p className="text-xs text-gray-400">{u.email}</p>
                          </td>
                          <td className="px-4 py-3">
                            {isSubActive ? (
                              <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Active</span>
                            ) : isTrialActive ? (
                              <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Trial</span>
                            ) : (
                              <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Expired</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{u.plan_name || '—'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {u.subscription_end
                              ? new Date(u.subscription_end).toLocaleDateString('en-IN')
                              : u.trial_end
                              ? new Date(u.trial_end).toLocaleDateString('en-IN')
                              : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleActivate(u.id)}
                                className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                                title="Activate"
                              >
                                Activate
                              </button>
                              <button
                                onClick={() => handleExtend(u.id, 30)}
                                className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                                title="Extend 30 days"
                              >
                                +30d
                              </button>
                              <button
                                onClick={() => handleDeactivate(u.id)}
                                className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                                title="Deactivate"
                              >
                                Deactivate
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {filteredUsers.length === 0 && (
                <p className="text-center text-gray-400 py-8 text-sm">No users found.</p>
              )}
            </div>
          </>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600">{p.user_email || '—'}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        ₹{Number(p.amount).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            p.status === 'captured'
                              ? 'bg-green-100 text-green-700'
                              : p.status === 'failed'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(p.created_at).toLocaleDateString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {payments.length === 0 && (
              <p className="text-center text-gray-400 py-8 text-sm">No payments found.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
