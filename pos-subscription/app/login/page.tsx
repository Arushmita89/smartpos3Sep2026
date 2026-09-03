'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Store, Mail, Lock, CheckCircle } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { signIn, user, subscription, loading, resetPassword } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [fpEmail, setFpEmail] = useState('');
  const [fpPassword, setFpPassword] = useState('');
  const [fpConfirm, setFpConfirm] = useState('');
  const [otpPhase, setOtpPhase] = useState<'idle' | 'sending' | 'entering'>('idle');
  const [otpCode, setOtpCode] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      setPaymentSuccess(true);
    }
  }, []);

  useEffect(() => {
    if (!loading && user && subscription) {
      if (subscription.isLocked) {
        router.replace('/subscription');
      } else {
        router.replace('/dashboard');
      }
    }
  }, [loading, user, subscription, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Please enter email and password');
      return;
    }
    setSubmitting(true);
    try {
      await signIn(email, password);
      toast.success('Welcome back!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to sign in');
      setSubmitting(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fpEmail.trim() || !fpPassword.trim() || !fpConfirm.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    if (fpPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (fpPassword !== fpConfirm) { toast.error('Passwords do not match'); return; }

    setOtpPhase('sending');
    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: fpEmail, purpose: 'password_reset' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP');
      setOtpPhase('entering');
      toast.success('Verification code sent to your email');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send OTP');
      setOtpPhase('idle');
    }
  };

  const verifyOtpAndReset = async () => {
    if (!otpCode.trim() || otpCode.length !== 6) { toast.error('Enter the 6-digit code'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: fpEmail, code: otpCode, purpose: 'password_reset' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid OTP');

      await resetPassword(fpEmail, fpPassword);
      toast.success('Password reset! Please login.');
      setShowForgot(false);
      setFpEmail(''); setFpPassword(''); setFpConfirm('');
      setOtpPhase('idle'); setOtpCode('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset password');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-800 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="text-center pt-8 pb-6 px-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg">
            <Store className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">SmartPOS</h1>
          <p className="text-gray-500 mt-1 text-sm">Restaurant Management System</p>
        </div>
        {paymentSuccess && (
          <div className="mx-8 mb-2 flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-700">
              Payment successful! Your subscription is now active. Please login to continue.
            </p>
          </div>
        )}
        {otpPhase !== 'idle' ? (
          <div className="space-y-4 px-8 pb-8 animate-in fade-in duration-300">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                {otpPhase === 'sending'
                  ? 'Sending verification code...'
                  : `Enter the 6-digit code sent to ${fpEmail}`}
              </p>
            </div>
            {otpPhase === 'entering' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Verification Code</label>
                  <div className="flex justify-center">
                    <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                      </InputOTPGroup>
                      <InputOTPSeparator />
                      <InputOTPGroup>
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>
                <button
                  onClick={verifyOtpAndReset}
                  disabled={submitting || otpCode.length !== 6}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {submitting ? 'Verifying...' : 'Verify & Reset Password'}
                </button>
                <p className="text-center text-sm text-gray-500">
                  <button type="button" onClick={() => { setOtpPhase('idle'); setOtpCode(''); }} className="text-blue-600 font-medium hover:underline">
                    Cancel
                  </button>
                </p>
              </>
            )}
          </div>
        ) : showForgot ? (
          <form onSubmit={handleForgotSubmit} className="space-y-4 px-8 pb-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">Enter your email and a new password to reset.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="email" value={fpEmail} onChange={(e) => setFpEmail(e.target.value)} placeholder="Enter your email" className={inputClass} required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="password" value={fpPassword} onChange={(e) => setFpPassword(e.target.value)} placeholder="Min 6 characters" className={inputClass} required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="password" value={fpConfirm} onChange={(e) => setFpConfirm(e.target.value)} placeholder="Re-enter new password" className={inputClass} required />
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {submitting ? 'Sending...' : 'Send Verification Code'}
            </button>
            <p className="text-center text-sm text-gray-500">
              <button type="button" onClick={() => setShowForgot(false)} className="text-blue-600 font-medium hover:underline">
                Back to Login
              </button>
            </p>
          </form>
        ) : (
        <form onSubmit={handleLogin} className="space-y-4 px-8 pb-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className={inputClass}
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className={inputClass}
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {submitting ? 'Signing in...' : 'Login'}
          </button>
          <p className="text-center text-sm text-gray-500">
            <button
              type="button"
              onClick={() => setShowForgot(true)}
              className="text-blue-600 font-medium hover:underline"
            >
              Forgot Password?
            </button>
          </p>
          <p className="text-center text-sm text-gray-500">
            Don&apos;t have an account?{' '}
            <button
              type="button"
              onClick={() => router.push('/signup')}
              className="text-blue-600 font-medium hover:underline"
            >
              Sign up
            </button>
          </p>
        </form>
        )}
      </div>
    </div>
  );
}
