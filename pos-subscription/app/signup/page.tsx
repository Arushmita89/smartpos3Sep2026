'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  Store,
  Mail,
  Lock,
  User,
  MapPin,
  Users,
  Percent,
  Phone,
  FileText,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp';
import toast from 'react-hot-toast';

export interface SignupData {
  fullName: string;
  email: string;
  password: string;
  restaurantName: string;
  gstNumber: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  addressLine3: string;
  owner1: string;
  owner2: string;
  owner3: string;
  owner4: string;
  taxRate: string;
}

export default function SignUpPage() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [otpPhase, setOtpPhase] = useState<'idle' | 'sending' | 'entering'>('idle');
  const [otpCode, setOtpCode] = useState('');
  const [formData, setFormData] = useState<SignupData>({
    fullName: '',
    email: '',
    password: '',
    restaurantName: '',
    gstNumber: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    addressLine3: '',
    owner1: '',
    owner2: '',
    owner3: '',
    owner4: '',
    taxRate: '18',
  });

  const update = (key: keyof SignupData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const validateStep1 = () => {
    if (!formData.fullName.trim()) return 'Full name is required';
    if (!formData.email.trim()) return 'Email is required';
    if (!/\S+@\S+\.\S+/.test(formData.email)) return 'Please enter a valid email';
    if (!formData.password.trim()) return 'Password is required';
    if (formData.password.length < 6) return 'Password must be at least 6 characters';
    return null;
  };

  const validateStep2 = () => {
    if (!formData.restaurantName.trim()) return 'Restaurant name is required';
    return null;
  };

  const handleNext = () => {
    const error = step === 1 ? validateStep1() : validateStep2();
    if (error) {
      toast.error(error);
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const step1Error = validateStep1();
    if (step1Error) {
      setStep(1);
      toast.error(step1Error);
      return;
    }
    const step2Error = validateStep2();
    if (step2Error) {
      setStep(2);
      toast.error(step2Error);
      return;
    }
    setOtpPhase('sending');
    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, purpose: 'signup' }),
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

  const verifyOtpAndSignUp = async () => {
    if (!otpCode.trim() || otpCode.length !== 6) {
      toast.error('Please enter the 6-digit code');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, code: otpCode, purpose: 'signup' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid OTP');

      await signUp(
        formData.fullName,
        formData.email,
        formData.password,
        formData
      );
      toast.success('Account created! Your 30-day free trial has started.');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Failed to sign up');
    } finally {
      setSubmitting(false);
      setOtpPhase('idle');
      setOtpCode('');
    }
  };

  const inputClass =
    'w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 p-4 py-8 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
        {/* Header */}
        <div className="text-center pt-8 pb-4 px-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg">
            <Store className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create Your Account</h1>
          <p className="text-gray-500 mt-1 text-sm">Start your 30-day free trial</p>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    step >= s
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {s}
                </div>
                {s < 3 && (
                  <div
                    className={`w-12 h-0.5 transition-colors ${
                      step > s ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-8 mt-2 text-xs text-gray-400">
            <span className={step >= 1 ? 'text-blue-600 font-medium' : ''}>Account</span>
            <span className={step >= 2 ? 'text-blue-600 font-medium' : ''}>Restaurant</span>
            <span className={step >= 3 ? 'text-blue-600 font-medium' : ''}>Details</span>
          </div>
        </div>

        <form onSubmit={handleSignUp} className="px-8 pb-8">
          {otpPhase !== 'idle' ? (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  {otpPhase === 'sending'
                    ? 'Sending verification code...'
                    : `Enter the 6-digit code sent to ${formData.email}`}
                </p>
              </div>
              {otpPhase === 'entering' && (
                <>
                  <div>
                    <label className={labelClass}>Verification Code</label>
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
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => { setOtpPhase('idle'); setOtpCode(''); }}
                      className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={verifyOtpAndSignUp}
                      disabled={submitting || otpCode.length !== 6}
                      className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        'Verify & Create Account'
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
          {/* Step 1: Account */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div>
                <label className={labelClass}>Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => update('fullName', e.target.value)}
                    placeholder="Enter your full name"
                    className={inputClass}
                    required
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => update('email', e.target.value)}
                    placeholder="you@example.com"
                    className={inputClass}
                    required
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => update('password', e.target.value)}
                    placeholder="Minimum 6 characters"
                    className={inputClass}
                    required
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleNext}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
              >
                Continue <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Step 2: Restaurant Info */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div>
                <label className={labelClass}>Restaurant Name</label>
                <div className="relative">
                  <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={formData.restaurantName}
                    onChange={(e) => update('restaurantName', e.target.value)}
                    placeholder="e.g. Spice Garden Restaurant"
                    className={inputClass}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>GST Number</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={formData.gstNumber}
                      onChange={(e) => update('gstNumber', e.target.value.toUpperCase())}
                      placeholder="27AAAAA0000A1Z5"
                      className={inputClass}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => update('phone', e.target.value)}
                      placeholder="9876543210"
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className={labelClass}>Tax Rate (%)</label>
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="number"
                    value={formData.taxRate}
                    onChange={(e) => update('taxRate', e.target.value)}
                    placeholder="18"
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  Continue <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Address & Owners */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in duration-300">
              {/* Address */}
              <div className="border border-gray-100 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <MapPin className="h-4 w-4 mr-2 text-blue-600" />
                  Restaurant Address
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className={labelClass}>Address Line 1</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={formData.addressLine1}
                        onChange={(e) => update('addressLine1', e.target.value)}
                        placeholder="Shop / Building number, Street"
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Address Line 2</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={formData.addressLine2}
                        onChange={(e) => update('addressLine2', e.target.value)}
                        placeholder="Area / Locality"
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Address Line 3</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={formData.addressLine3}
                        onChange={(e) => update('addressLine3', e.target.value)}
                        placeholder="City, State, PIN"
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Owners */}
              <div className="border border-gray-100 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <Users className="h-4 w-4 mr-2 text-blue-600" />
                  Owner Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Owner 1</label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={formData.owner1}
                        onChange={(e) => update('owner1', e.target.value)}
                        placeholder="Primary owner"
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Owner 2</label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={formData.owner2}
                        onChange={(e) => update('owner2', e.target.value)}
                        placeholder="Co-owner (optional)"
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Owner 3</label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={formData.owner3}
                        onChange={(e) => update('owner3', e.target.value)}
                        placeholder="Co-owner (optional)"
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Owner 4</label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={formData.owner4}
                        onChange={(e) => update('owner4', e.target.value)}
                        placeholder="Co-owner (optional)"
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    'Sign Up & Start Free Trial'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Login link */}
          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="text-blue-600 font-medium hover:underline"
            >
              Login
            </button>
          </p>
          </>
        )}
        </form>
      </div>
    </div>
  );
}
