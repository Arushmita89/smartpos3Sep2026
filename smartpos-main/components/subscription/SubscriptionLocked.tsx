'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Store, Lock, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SubscriptionLocked() {
  const { restaurant, subscription, signOut } = useAuth();
  const router = useRouter();

  if (!restaurant || !subscription) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
    } catch (err) {
      toast.error('Error signing out');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-800 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-4">
          <Lock className="h-10 w-10 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Subscription Required</h1>
        <p className="text-gray-500 mt-2 text-sm">
          No active subscription found for this account. Choose a plan to continue using SmartPOS.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={() => router.push('/subscription')}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Choose a Plan
          </button>
          <button
            onClick={handleSignOut}
            className="w-full border border-gray-300 text-gray-600 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
