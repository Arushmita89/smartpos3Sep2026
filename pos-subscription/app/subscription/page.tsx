'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Store, CreditCard, Calendar, CheckCircle, AlertCircle, Loader2, Lock, Clock, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import Script from 'next/script';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PlanData {
  id: string;
  name: string;
  duration_days: number;
  price: number;
  currency: string;
}

export default function SubscriptionPage() {
  const { user, subscription, loading, signOut, refreshSubscription } = useAuth();
  const router = useRouter();
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [processing, setProcessing] = useState(false);
  const [trialActivating, setTrialActivating] = useState(false);
  const [justPaid, setJustPaid] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace(justPaid ? '/login?payment=success' : '/login');
      return;
    }
    loadPlans();
  }, [loading, user, router, justPaid]);

  const loadPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('duration_days', { ascending: true });
      if (error) throw error;
      setPlans(data || []);
    } catch (err) {
      console.error('Error loading plans:', err);
      toast.error('Failed to load plans. Please refresh the page.');
    }
  };

  const handleActivateTrial = async () => {
    if (!user) {
      toast.error('Please login first');
      router.push('/login');
      return;
    }
    setTrialActivating(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        toast.error('Authentication required');
        setTrialActivating(false);
        return;
      }

      const res = await fetch('/api/trial/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!res.ok) {
        let errMsg = 'Failed to activate trial';
        try {
          const errBody = await res.json();
          if (errBody.error) errMsg = errBody.error;
        } catch {
          // Response wasn't JSON
        }
        throw new Error(errMsg);
      }

      await refreshSubscription();
      toast.success('1-day ad-free trial activated! Enjoy full access for 24 hours.');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Failed to activate trial');
    } finally {
      setTrialActivating(false);
    }
  };

  const handleSubscribe = async (plan: PlanData) => {
    if (!user) {
      toast.error('Please login first');
      router.push('/login');
      return;
    }
    setProcessing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        toast.error('Authentication required');
        setProcessing(false);
        return;
      }

      const res = await fetch('/api/subscription/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          planId: plan.id,
          userId: user.id,
        }),
      });

      if (!res.ok) {
        let errMsg = `Failed to create order (${res.status})`;
        try {
          const errBody = await res.json();
          if (errBody.error) errMsg = errBody.error;
        } catch {
          // Response wasn't JSON (likely HTML redirect) — use default message
        }
        throw new Error(errMsg);
      }

      let orderData;
      try {
        orderData = await res.json();
      } catch {
        throw new Error('Invalid response from server. Please try again.');
      }

      const { orderId, amount, currency, razorpayKeyId } = orderData;

      if (!orderId || !razorpayKeyId) {
        throw new Error('Invalid order data received from server');
      }

      const rzp = new window.Razorpay({
        key_id: razorpayKeyId,
        amount,
        currency,
        order_id: orderId,
        name: 'SmartPOS Subscription',
        description: `${plan.name} Plan`,
        prefill: {
          email: user?.email || '',
        },
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch('/api/subscription/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                userId: user.id,
                planId: plan.id,
                amount: plan.price,
              }),
            });

            if (!verifyRes.ok) {
              let errMsg = 'Payment verification failed';
              try {
                const errBody = await verifyRes.json();
                if (errBody.error) errMsg = errBody.error;
              } catch {
                // Response wasn't JSON
              }
              throw new Error(errMsg);
            }

            setJustPaid(true);
            await signOut();
            toast.success('Payment successful! Your subscription is active. Please login to continue.');
            router.push('/login?payment=success');
          } catch (err: any) {
            toast.error(err.message || 'Payment verification failed');
            router.push('/payment-failed');
          }
        },
        modal: {
          ondismiss: () => {
            setProcessing(false);
          },
        },
      });

      rzp.on('payment.failed', () => {
        toast.error('Payment failed. Please try again.');
        setProcessing(false);
      });

      rzp.open();
    } catch (err: any) {
      toast.error(err.message || 'Failed to start payment');
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const isExpired = subscription?.isLocked;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 p-4 py-8">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl mb-4 shadow-lg">
            <Store className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-white">Subscription</h1>
          <p className="text-blue-100 mt-1">Choose a plan to continue using SmartPOS</p>
        </div>

        {isExpired && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 max-w-2xl mx-auto flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <p className="text-amber-800 text-sm font-medium">
              {subscription?.hasActiveTrial === false && subscription?.trialEnd
                ? `Your free trial has expired. Please choose a plan to continue.`
                : 'Your subscription has expired. Please choose a plan to continue.'}
            </p>
          </div>
        )}

        {subscription?.hasActiveTrial && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 max-w-2xl mx-auto flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
            <p className="text-green-800 text-sm font-medium">
              Your free trial is active! {subscription.trialDaysRemaining} days remaining. You can subscribe now to continue after your trial ends.
            </p>
          </div>
        )}

        {subscription?.hasActiveAdFreeTrial && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 max-w-2xl mx-auto flex items-center gap-3">
            <Zap className="h-5 w-5 text-blue-600 flex-shrink-0" />
            <p className="text-blue-800 text-sm font-medium">
              Your 1-day ad-free trial is active! {subscription.adFreeTrialHoursRemaining} hours remaining.
            </p>
          </div>
        )}

        {subscription?.hasActiveSubscription && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 max-w-2xl mx-auto flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
            <p className="text-green-800 text-sm font-medium">
              Your subscription is active. Plan: {subscription.planName} — expires in {subscription.subscriptionDaysRemaining} days.
            </p>
          </div>
        )}

        {/* 1-Day Ad-Free Trial Card */}
        {!subscription?.hasActiveAdFreeTrial && !subscription?.adFreeTrialUsed && (
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl shadow-xl p-6 mb-6 max-w-2xl mx-auto text-white">
            <div className="flex items-start gap-4">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-white/20 rounded-xl flex-shrink-0">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold">1-Day Ad-Free Trial</h3>
                <p className="text-blue-100 text-sm mt-1">
                  Try SmartPOS with full access for 24 hours — no payment required.
                </p>
                <button
                  onClick={handleActivateTrial}
                  disabled={trialActivating}
                  className="mt-4 bg-white text-blue-600 px-5 py-2.5 rounded-lg hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
                >
                  {trialActivating ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Activating...
                    </span>
                  ) : (
                    'Activate Free Trial'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="bg-white rounded-2xl shadow-xl p-6 flex flex-col hover:shadow-2xl transition-shadow"
            >
              <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                ₹{plan.price.toLocaleString('en-IN')}
              </p>
              <p className="text-sm text-gray-500 mt-1">{plan.duration_days} days</p>
              <div className="mt-4 space-y-2 flex-1">
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" /> Full POS access
                </p>
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" /> Menu management
                </p>
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" /> Order management
                </p>
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" /> Analytics & reports
                </p>
              </div>
              <button
                onClick={() => handleSubscribe(plan)}
                disabled={processing}
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium mt-4"
              >
                {processing ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 'Subscribe'}
              </button>
            </div>
          ))}
        </div>

        {plans.length === 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md mx-auto">
            <p className="text-gray-500">No plans available. Please check back later.</p>
          </div>
        )}

        <div className="text-center mt-6 space-x-4">
          {subscription?.hasActiveTrial && (
            <button
              onClick={() => router.push('/dashboard')}
              className="text-blue-100 hover:text-white text-sm font-medium"
            >
              Continue with free trial
            </button>
          )}
          {subscription?.hasActiveAdFreeTrial && (
            <button
              onClick={() => router.push('/dashboard')}
              className="text-blue-100 hover:text-white text-sm font-medium"
            >
              Continue to dashboard
            </button>
          )}
          <button
            onClick={signOut}
            className="text-blue-100 hover:text-white text-sm font-medium"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
