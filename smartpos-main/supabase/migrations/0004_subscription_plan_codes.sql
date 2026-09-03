-- Internal subscription plan management for SmartPOS (Alta Software Consultancy)
-- Extends subscription_plans so the company can manage plan pricing per
-- country / currency / restaurant from the admin screen instead of via SQL.
--
--   country_code   - ISO country code (e.g. 'IN')
--   currency       - ISO currency code (existing column, e.g. 'INR')
--   restaurant_id  - NULL = global plan, otherwise scoped to one restaurant
--   plan_code      - stable internal code (e.g. 'MONTHLY')
--
-- Existing rows keep working: country_code defaults to 'IN', restaurant_id
-- is NULL (global). Run this in the Supabase SQL editor before using the
-- admin Plan Codes screen.

alter table public.subscription_plans
  add column if not exists country_code text not null default 'IN',
  add column if not exists plan_code text,
  add column if not exists restaurant_id text references public.parameters(restaurant_id) on delete cascade;

create index if not exists idx_subscription_plans_country on public.subscription_plans(country_code);
create index if not exists idx_subscription_plans_restaurant on public.subscription_plans(restaurant_id);
