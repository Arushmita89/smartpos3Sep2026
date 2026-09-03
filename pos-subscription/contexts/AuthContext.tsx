'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface BusinessData {
  id: string;
  name: string;
  gst_number: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  address_line3: string | null;
  owner1: string | null;
  owner2: string | null;
  owner3: string | null;
  owner4: string | null;
  tax_rate: number;
}

interface RestaurantData {
  restaurant_id: string;
  restaurant_name: string;
  mpin: string;
  created_at: string;
  login_name: string | null;
  password_hash: string | null;
  gst_number: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  address_line3: string | null;
  owner1: string | null;
  owner2: string | null;
  owner3: string | null;
  owner4: string | null;
  tax_rate: number;
}

interface ProfileData {
  id: string;
  business_id: string | null;
  email: string;
  full_name: string | null;
  role: string;
  trial_start: string | null;
  trial_end: string | null;
  trial_used: boolean;
  ad_free_trial_end: string | null;
  ad_free_trial_used: boolean;
}

interface SubscriptionInfo {
  hasActiveSubscription: boolean;
  hasActiveTrial: boolean;
  hasActiveAdFreeTrial: boolean;
  adFreeTrialUsed: boolean;
  isLocked: boolean;
  trialEnd: string | null;
  trialDaysRemaining: number;
  adFreeTrialEnd: string | null;
  adFreeTrialHoursRemaining: number;
  subscriptionEnd: string | null;
  subscriptionDaysRemaining: number;
  planName: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  business: BusinessData | null;
  restaurant: RestaurantData | null;
  profile: ProfileData | null;
  subscription: SubscriptionInfo | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string, restaurantData?: {
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
  }) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string, newPassword: string) => Promise<void>;
  updateRestaurant: (updates: Partial<RestaurantData>) => void;
  refreshSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getDaysRemaining(endDate: string | null): number {
  if (!endDate) return 0;
  const end = new Date(endDate);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [restaurant, setRestaurant] = useState<RestaurantData | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = useCallback(async (userId: string) => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData as ProfileData);
      }

      if (profileData?.business_id) {
        const { data: businessData } = await supabase
          .from('businesses')
          .select('*')
          .eq('id', profileData.business_id)
          .maybeSingle();

        if (businessData) {
          const b = businessData as BusinessData;
          setBusiness(b);
          setRestaurant({
            restaurant_id: b.id,
            restaurant_name: b.name,
            mpin: '',
            created_at: new Date().toISOString(),
            login_name: null,
            password_hash: null,
            gst_number: b.gst_number,
            phone: b.phone,
            address_line1: b.address_line1,
            address_line2: b.address_line2,
            address_line3: b.address_line3,
            owner1: b.owner1,
            owner2: b.owner2,
            owner3: b.owner3,
            owner4: b.owner4,
            tax_rate: b.tax_rate,
          });
        }
      }

      const { data: subData } = await supabase
        .from('subscriptions')
        .select(`
          id,
          status,
          subscription_end,
          subscription_start,
          user_id,
          subscription_plans ( name )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const now = new Date();
      let hasActiveSubscription = false;
      let subscriptionEnd: string | null = null;
      let planName: string | null = null;

      if (subData) {
        subscriptionEnd = subData.subscription_end || null;
        planName = Array.isArray(subData.subscription_plans)
          ? subData.subscription_plans[0]?.name
          : (subData.subscription_plans as any)?.name || null;

        if (subData.status === 'active' && subscriptionEnd && new Date(subscriptionEnd) > now) {
          hasActiveSubscription = true;
        }
      }

      const trialEnd = profileData?.trial_end || null;
      const hasActiveTrial = !!(trialEnd && new Date(trialEnd) > now);

      const adFreeTrialEnd = (profileData as any)?.ad_free_trial_end || null;
      const adFreeTrialUsed = (profileData as any)?.ad_free_trial_used || false;
      const hasActiveAdFreeTrial = !!(adFreeTrialEnd && new Date(adFreeTrialEnd) > now);

      const adFreeTrialHoursRemaining = adFreeTrialEnd
        ? Math.max(0, Math.ceil((new Date(adFreeTrialEnd).getTime() - now.getTime()) / (1000 * 60 * 60)))
        : 0;

      const isLocked = !hasActiveSubscription && !hasActiveTrial && !hasActiveAdFreeTrial;

      setSubscription({
        hasActiveSubscription,
        hasActiveTrial,
        hasActiveAdFreeTrial,
        adFreeTrialUsed,
        isLocked,
        trialEnd,
        trialDaysRemaining: getDaysRemaining(trialEnd),
        adFreeTrialEnd,
        adFreeTrialHoursRemaining,
        subscriptionEnd,
        subscriptionDaysRemaining: getDaysRemaining(subscriptionEnd),
        planName,
      });
    } catch (err) {
      console.error('Error fetching user data:', err);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      if (initialSession?.user) {
        fetchUserData(initialSession.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          (async () => {
            await fetchUserData(newSession.user.id);
            setLoading(false);
          })();
        } else {
          setBusiness(null);
          setRestaurant(null);
          setProfile(null);
          setSubscription(null);
          setLoading(false);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchUserData]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    });
    if (error) throw error;
  };

  const signUp = async (
    name: string,
    email: string,
    password: string,
    restaurantData?: {
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
  ) => {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: name,
        email: email.toLowerCase().trim(),
        password,
        restaurantData: restaurantData || null,
      }),
    });

    if (!res.ok) {
      let errMsg = 'Signup failed';
      try {
        const errBody = await res.json();
        if (errBody.error) errMsg = errBody.error;
      } catch {
        // Response wasn't JSON
      }
      throw new Error(errMsg);
    }

    const data = await res.json();
    if (!data.success) throw new Error('Signup failed');

    // Sign in with the credentials to establish a client-side session
    const { error: signInError, data: signInData } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    });
    if (signInError) throw signInError;

    // If business record wasn't created during signup (no session was returned
    // from signUp), create it now using the signed-in session via RPC
    if (restaurantData && restaurantData.restaurantName && !data.session) {
      const { error: rpcError } = await supabase.rpc('create_business_for_user', {
        p_name: restaurantData.restaurantName,
        p_gst_number: restaurantData.gstNumber || null,
        p_phone: restaurantData.phone || null,
        p_address_line1: restaurantData.addressLine1 || null,
        p_address_line2: restaurantData.addressLine2 || null,
        p_address_line3: restaurantData.addressLine3 || null,
        p_owner1: restaurantData.owner1 || null,
        p_owner2: restaurantData.owner2 || null,
        p_owner3: restaurantData.owner3 || null,
        p_owner4: restaurantData.owner4 || null,
        p_tax_rate: parseFloat(restaurantData.taxRate) || 18,
      });
      if (rpcError) {
        console.error('Failed to create business record:', rpcError);
      }
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setBusiness(null);
    setRestaurant(null);
    setProfile(null);
    setSubscription(null);
    setUser(null);
    setSession(null);
  };

  const resetPassword = async (email: string, newPassword: string) => {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to reset password');
  };

  const updateRestaurant = (updates: Partial<RestaurantData>) => {
    setRestaurant((prev) => (prev ? { ...prev, ...updates } : null));
  };

  const refreshSubscription = async () => {
    if (user) {
      await fetchUserData(user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        business,
        restaurant,
        profile,
        subscription,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updateRestaurant,
        refreshSubscription,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
