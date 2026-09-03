'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const { refreshSubscription, loading } = useAuth();

  useEffect(() => {
    (async () => {
      await refreshSubscription();
      setTimeout(() => router.push('/login?payment=success'), 2000);
    })();
  }, [router, refreshSubscription]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-600 to-green-800 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
          <CheckCircle className="h-12 w-12 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Payment Successful!</h1>
        <p className="text-gray-500 mt-2 text-sm">
          Your subscription has been activated. Redirecting to login...
        </p>
        <div className="mt-4">
          <Loader2 className="h-6 w-6 animate-spin text-green-600 mx-auto" />
        </div>
      </div>
    </div>
  );
}
