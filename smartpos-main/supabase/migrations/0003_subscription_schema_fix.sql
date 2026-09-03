-- Fixes a partial/older subscription schema in the database (e.g. one created
-- with the pos-subscription schema) so it matches what smartpos-main expects.
-- Idempotent: safe to run multiple times.

-- 1) Trial fields on parameters (used by trial activation + status checks)
alter table public.parameters
  add column if not exists trial_start timestamptz,
  add column if not exists trial_end timestamptz,
  add column if not exists trial_used boolean not null default false;

-- 2) currency column on subscription_plans (create route depends on it)
alter table public.subscription_plans
  add column if not exists currency text not null default 'INR';

-- 3) Missing columns on subscriptions (verify route writes them)
alter table public.subscriptions
  add column if not exists subscription_start timestamptz,
  add column if not exists razorpay_signature text;

-- 4) payments table (missing on some projects)
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  restaurant_id text references public.parameters(restaurant_id) on delete cascade,
  subscription_id uuid references public.subscriptions(id),
  razorpay_order_id text,
  razorpay_payment_id text,
  razorpay_signature text,
  amount numeric(10, 2),
  currency text not null default 'INR',
  status text not null default 'captured',
  created_at timestamptz not null default now()
);

alter table public.payments enable row level security;

create index if not exists idx_subscriptions_restaurant on public.subscriptions(restaurant_id);
create index if not exists idx_payments_restaurant on public.payments(restaurant_id);

-- 5) RLS policies (created only if missing so the script is rerunnable)
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'subscription_plans' and policyname = 'open_select_subscription_plans') then
    create policy open_select_subscription_plans on public.subscription_plans
      for select to anon, authenticated using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'subscriptions' and policyname = 'open_select_subscriptions') then
    create policy open_select_subscriptions on public.subscriptions
      for select to anon, authenticated using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'subscriptions' and policyname = 'open_insert_subscriptions') then
    create policy open_insert_subscriptions on public.subscriptions
      for insert to anon, authenticated with check (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'subscriptions' and policyname = 'open_update_subscriptions') then
    create policy open_update_subscriptions on public.subscriptions
      for update to anon, authenticated using (true) with check (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'payments' and policyname = 'open_select_payments') then
    create policy open_select_payments on public.payments
      for select to anon, authenticated using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'payments' and policyname = 'open_insert_payments') then
    create policy open_insert_payments on public.payments
      for insert to anon, authenticated with check (true);
  end if;
end $$;
