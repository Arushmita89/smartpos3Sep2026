import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { TRIAL_DAYS } from '@/lib/subscriptionNotifications';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { restaurantId } = body;

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'restaurantId is required' },
        { status: 400 }
      );
    }

    const { data: restaurant, error: fetchError } = await supabase
      .from('parameters')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .maybeSingle();

    if (fetchError || !restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    if (!('trial_used' in restaurant)) {
      return NextResponse.json(
        { error: 'Free trial is not available for this account. Please choose a plan to continue.' },
        { status: 400 }
      );
    }

    if (restaurant.trial_used) {
      const trialEnd = restaurant.trial_end;
      if (trialEnd && new Date(trialEnd) > new Date()) {
        return NextResponse.json({
          success: true,
          trialEnd,
          message: 'Free trial is already active',
        });
      }
      return NextResponse.json(
        { error: 'Free trial has already been used. Please choose a plan to continue.' },
        { status: 400 }
      );
    }

    const now = new Date();
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);

    const { error: updateError } = await supabase
      .from('parameters')
      .update({
        trial_start: now.toISOString(),
        trial_end: trialEnd.toISOString(),
        trial_used: true,
      })
      .eq('restaurant_id', restaurantId);

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to activate trial: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      trialEnd: trialEnd.toISOString(),
      trialDays: TRIAL_DAYS,
      message: `Free trial activated for ${TRIAL_DAYS} days`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
