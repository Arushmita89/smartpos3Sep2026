'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { isOwner } from '@/lib/owner';
import { Shield, Loader2 } from 'lucide-react';
import PlanCodesManager from '@/app/features/owner/PlanCodesManager';

export default function OwnerPlansPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  const ownerAccess = !loading && !!user && isOwner(user.login_name);

  const handleSignOut = async () => {
    try {
      await signOut();
    } finally {
      router.replace('/');
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-600">Please login to continue.</p>
      </div>
    );
  }

  if (!ownerAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center bg-white rounded-2xl shadow-2xl p-10 max-w-md">
          <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-500 text-sm mb-6">
            This is the owner&apos;s panel. You are not authorized to
            view this page.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Dashboard
            </button>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-blue-600 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-7 w-7" />
            <div>
              <h1 className="text-xl font-bold">Plan Value Change</h1>
              <p className="text-xs text-blue-200">Owner-only subscription plan management</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="text-sm text-blue-100 hover:text-white transition-colors"
            >
              Back to Dashboard
            </button>
            <button
              onClick={handleSignOut}
              className="text-sm text-blue-100 hover:text-white transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4">
        <PlanCodesManager />
      </div>
    </div>
  );
}
