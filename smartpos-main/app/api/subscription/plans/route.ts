import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { convertAmount } from '@/lib/currency';
import { getDaysRemaining } from '@/lib/subscription';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const restaurantId = req.nextUrl.searchParams.get('restaurantId');

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'restaurantId is required' },
        { status: 400 }
      );
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: 'Service role key not configured' },
        { status: 500 }
      );
    }
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        global: {
          fetch: (input: any, init?: any) =>
            fetch(input, { ...init, cache: 'no-store' }),
        },
      }
    );

    const { data: restaurant } = await admin
      .from('parameters')
      .select('restaurant_id, currency, country_code, trial_end, trial_used')
      .eq('restaurant_id', restaurantId)
      .maybeSingle();

    const { data: plans } = await admin
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('duration_days', { ascending: true });

    const restCurrency = (restaurant?.currency || 'INR').toUpperCase();
    const allPlans = (plans || []) as any[];

    const trialEnd = restaurant?.trial_end || null;
    const trialUsed = restaurant?.trial_used ?? false;
    const trialActive = !!(trialEnd && new Date(trialEnd) > new Date());

    const displayPlans: any[] = [];

    if (!trialUsed || trialActive) {
      displayPlans.push({
        id: 'trial',
        name: 'Free Trial',
        duration_days: 30,
        price: 0,
        currency: restCurrency,
        country_code: restaurant?.country_code || 'IN',
        plan_code: 'trial',
        display_price: 0,
        display_currency: restCurrency,
        converted: false,
        is_trial: true,
        trial_active: trialActive,
        trial_used: trialUsed,
        trial_days_remaining: trialActive ? getDaysRemaining(trialEnd) : 0,
      });
    }

    const matchingPlans = allPlans.filter(
      (plan) => (plan.currency || 'INR').toUpperCase() === restCurrency
    );

    let displayPaidPlans;

    if (matchingPlans.length > 0) {
      displayPaidPlans = matchingPlans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        duration_days: plan.duration_days,
        price: Number(plan.price),
        currency: restCurrency,
        country_code: plan.country_code,
        plan_code: plan.plan_code,
        display_price: Number(plan.price),
        display_currency: restCurrency,
        converted: false,
      }));
    } else {
      displayPaidPlans = await Promise.all(
        allPlans.map(async (plan: any) => {
          const planCurrency = (plan.currency || 'INR').toUpperCase();
          const originalPrice = Number(plan.price);
          let displayPrice = originalPrice;
          let displayCurrency = planCurrency;
          let converted = false;

          if (planCurrency !== restCurrency) {
            const convertedPrice = await convertAmount(
              originalPrice,
              planCurrency,
              restCurrency
            );
            if (convertedPrice != null) {
              displayPrice = convertedPrice;
              displayCurrency = restCurrency;
              converted = true;
            }
          }

          return {
            id: plan.id,
            name: plan.name,
            duration_days: plan.duration_days,
            price: originalPrice,
            currency: planCurrency,
            country_code: plan.country_code,
            plan_code: plan.plan_code,
            display_price: Math.round(displayPrice * 100) / 100,
            display_currency: displayCurrency,
            converted,
          };
        })
      );
    }

    displayPlans.push(...displayPaidPlans);

    return NextResponse.json({
      restaurant_id: restaurantId,
      currency: restCurrency,
      trial: {
        used: trialUsed,
        active: trialActive,
        end: trialEnd,
        days_remaining: trialActive ? getDaysRemaining(trialEnd) : 0,
      },
      plans: displayPlans,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
