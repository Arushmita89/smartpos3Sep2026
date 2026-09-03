'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  Store,
  KeyRound,
  UtensilsCrossed,
  CreditCard,
  ShieldCheck,
} from 'lucide-react';

export default function OrderEntryPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const normalized = code.trim().toUpperCase();
    if (normalized.length < 6) {
      setError('Please enter the restaurant code shown at the restaurant.');
      return;
    }
    setError('');
    setSubmitting(true);
    router.push(`/order/${encodeURIComponent(normalized)}`);
  };

  return (
    <div className="min-h-screen bg-[#EBF3FE] flex flex-col">
      {/* ========== Header ========== */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 lg:px-6 py-3 flex items-center justify-between">
          <Link href="/order" className="flex items-center gap-2">
            <div className="w-9 h-9 border-2 border-[#1E5FE8] rounded-xl flex items-center justify-center">
              <Store className="h-5 w-5 text-[#1E5FE8]" />
            </div>
            <div className="leading-tight">
              <span className="text-lg font-bold">
                <span className="text-[#0B1B3A]">Smart</span>
                <span className="text-[#1E5FE8]">POS</span>
              </span>
              <p className="text-[10px] text-gray-400 -mt-0.5">Restaurant Management System</p>
            </div>
          </Link>
        </div>
      </header>

      {/* ========== Hero ========== */}
      <section className="w-full max-w-5xl mx-auto px-4 lg:px-6 pt-12 pb-8 sm:pt-16 sm:pb-12 flex flex-col items-center text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-[#0B1B3A] leading-tight max-w-2xl">
          SmartPOS <span className="text-[#1E5FE8]">for Customers</span>
        </h1>
        <p className="text-gray-500 text-base sm:text-lg leading-relaxed mt-4 max-w-xl">
          Enter the restaurant&rsquo;s unique code to browse the menu, customize your order, and pay
          securely — all from your own phone.
        </p>

        {/* ===== Code entry card ===== */}
        <div className="w-full max-w-md mt-10">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">
            <div className="w-14 h-14 bg-[#EBF3FE] rounded-full flex items-center justify-center mb-4 mx-auto">
              <KeyRound className="h-7 w-7 text-[#1E5FE8]" />
            </div>
            <h2 className="text-2xl font-bold text-[#0B1B3A] text-center mb-1">
              Where are you dining?
            </h2>
            <p className="text-gray-500 text-sm text-center mb-6">
              Enter the code on your table or at the restaurant entrance.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Restaurant Code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
                  }
                  placeholder="e.g. RESTABCD12"
                  maxLength={20}
                  autoFocus
                  className="w-full px-4 py-3.5 border border-gray-300 rounded-lg text-center text-xl font-bold uppercase tracking-widest text-[#0B1B3A] focus:ring-2 focus:ring-[#1E5FE8] focus:border-transparent outline-none transition-shadow"
                />
                {error && (
                  <p className="text-sm text-red-600 mt-1.5">{error}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={!code.trim() || submitting}
                className="w-full bg-[#1E5FE8] text-white py-3.5 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-2 text-base"
              >
                {submitting ? 'Finding...' : (
                  <>
                    Find Restaurant <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="text-xs text-gray-400 mt-4 flex items-center justify-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
            Secure payment &bull; Your order goes straight to the kitchen
          </p>
        </div>
      </section>

      {/* ========== How it works ========== */}
      <section className="w-full max-w-4xl mx-auto px-4 lg:px-6 pb-14">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            {
              icon: KeyRound,
              title: 'Enter the code',
              desc: 'Type the restaurant code shown at your table or entrance.',
            },
            {
              icon: UtensilsCrossed,
              title: 'Pick your food',
              desc: 'Browse the live menu, add items, and note any customizations.',
            },
            {
              icon: CreditCard,
              title: 'Pay & enjoy',
              desc: 'Pay securely online or with cash. Kitchen gets it instantly.',
            },
          ].map(({ icon: Icon, title, desc }, i) => (
            <div
              key={title}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col items-start text-left"
            >
              <div className="w-10 h-10 bg-[#EBF3FE] rounded-xl flex items-center justify-center mb-3">
                <Icon className="h-5 w-5 text-[#1E5FE8]" />
              </div>
              <span className="text-xs font-bold text-[#1E5FE8] uppercase tracking-wider mb-1">
                Step {i + 1}
              </span>
              <h3 className="font-semibold text-[#0B1B3A] mb-1">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ========== Footer ========== */}
      <footer className="mt-auto bg-[#0B1B3A] text-white">
        <div className="max-w-5xl mx-auto px-4 lg:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 border-2 border-white rounded-lg flex items-center justify-center">
              <Store className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold">
              Smart<span className="text-[#6DA4FF]">POS</span>
            </span>
          </div>
          <p className="text-xs text-gray-400">
            Powered by ALTTASOFTWARE CONSULTANCY LLP
          </p>
        </div>
      </footer>
    </div>
  );
}