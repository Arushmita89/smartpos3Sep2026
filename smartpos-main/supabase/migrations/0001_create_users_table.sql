-- Staff accounts & roles for SmartPOS
-- Run this in the Supabase SQL editor (or with the Supabase CLI) before using
-- role-based login (admin / kitchen / table attendant).
-- Existing `parameters`-only accounts are auto-migrated into this table on
-- their next login with role 'admin'.

create table public.users (
  id uuid primary key default gen_random_uuid(),
  restaurant_id text not null references public.parameters(restaurant_id) on delete cascade,
  name text not null,
  login_name text not null unique,
  password text not null,
  role text not null default 'attendant' check (role in ('admin', 'kitchen', 'attendant')),
  active boolean not null default true,
  created_at timestamptz default now()
);

create index idx_users_restaurant on public.users(restaurant_id);

-- RLS is enabled by default; the app queries with the Supabase anon key directly.
-- Match the open anon policies already used by parameters/menu/categories/orders.
create policy anon_select_users on public.users for select to anon, authenticated using (true);
create policy anon_insert_users on public.users for insert to anon, authenticated with check (true);
create policy anon_update_users on public.users for update to anon, authenticated using (true) with check (true);
create policy anon_delete_users on public.users for delete to anon, authenticated using (true);
