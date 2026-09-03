-- SmartPOS migration 0005: subscription billing gaps
-- Adds missing subscription columns plus payment_methods, payment_history,
-- profiles and subscription_notifications tables. Idempotent — safe to rerun.

-- ============================================================
-- 1. subscriptions — add columns used by verify / webhook / activate routes
-- ============================================================
alter table public.subscriptions
  add column if not exists payment_status text,
  add column if not exists current_period_start timestamptz,
  add column if not exists current_period_end timestamptz,
  add column if not exists next_billing_date timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists razorpay_subscription_id text,
  add column if not exists updated_at timestamptz default now();

-- ============================================================
-- 2. payment_methods — payment method lookup
-- ============================================================
create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.payment_methods (name) values ('card'), ('netbanking'), ('upi'), ('cash')
on conflict (name) do nothing;

-- ============================================================
-- 3. payment_history — one row per recorded payment
-- ============================================================
create table if not exists public.payment_history (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid references public.subscriptions(id) on delete cascade,
  payment_method_id text,
  amount numeric(10, 2),
  currency text not null default 'INR',
  status text not null default 'captured',
  payment_gateway_id text,
  payment_gateway_response text,
  billing_period_start timestamptz,
  billing_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_payment_history_subscription on public.payment_history(subscription_id);

-- ============================================================
-- 4. profiles — user profiles
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  email text,
  full_name text,
  role text default 'admin',
  restaurant_id text references public.parameters(restaurant_id) on delete cascade,
  trial_start timestamptz,
  trial_end timestamptz,
  trial_used boolean not null default false,
  ad_free_trial_used boolean not null default false,
  ad_free_trial_end timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 5. subscription_notifications — subscription event notifications
-- ============================================================
create table if not exists public.subscription_notifications (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid references public.subscriptions(id) on delete cascade,
  restaurant_id text references public.parameters(restaurant_id) on delete cascade,
  type text,
  title text,
  message text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_subscription_notifications_restaurant on public.subscription_notifications(restaurant_id);

-- ============================================================
-- 6. RLS — open anon policies (app queries with the anon key)
-- ============================================================
alter table public.payment_methods enable row level security;
alter table public.payment_history enable row level security;
alter table public.profiles enable row level security;
alter table public.subscription_notifications enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'payment_methods' and policyname = 'open_select_payment_methods') then
    create policy open_select_payment_methods on public.payment_methods for select to anon, authenticated using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'payment_history' and policyname = 'open_select_payment_history') then
    create policy open_select_payment_history on public.payment_history for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'payment_history' and policyname = 'open_insert_payment_history') then
    create policy open_insert_payment_history on public.payment_history for insert to anon, authenticated with check (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'open_select_profiles') then
    create policy open_select_profiles on public.profiles for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'open_insert_profiles') then
    create policy open_insert_profiles on public.profiles for insert to anon, authenticated with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'open_update_profiles') then
    create policy open_update_profiles on public.profiles for update to anon, authenticated using (true) with check (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'subscription_notifications' and policyname = 'open_select_subscription_notifications') then
    create policy open_select_subscription_notifications on public.subscription_notifications for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'subscription_notifications' and policyname = 'open_insert_subscription_notifications') then
    create policy open_insert_subscription_notifications on public.subscription_notifications for insert to anon, authenticated with check (true);
  end if;
end $$;
