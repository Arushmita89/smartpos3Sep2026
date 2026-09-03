'use client';

import { useRouter } from 'next/navigation';
import { XCircle } from 'lucide-react';

export default function PaymentFailedPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-600 to-red-800 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-4">
          <XCircle className="h-12 w-12 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Payment Failed</h1>
        <p className="text-gray-500 mt-2 text-sm">
          Your payment could not be processed. Please try again.
        </p>
        <button
          onClick={() => router.push('/subscription')}
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium mt-6"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
