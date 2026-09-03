-- Add estimated_delivery_time to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_delivery_time INTEGER;

-- Create customers directory table
CREATE TABLE IF NOT EXISTS public.customers (
  id bigserial primary key,
  restaurant_id text not null references public.parameters(restaurant_id) on delete cascade,
  name text not null,
  phone text not null,
  email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(restaurant_id, phone)
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

create policy open_select_customers on public.customers for select to anon, authenticated using (true);
create policy open_insert_customers on public.customers for insert to anon, authenticated with check (true);
create policy open_update_customers on public.customers for update to anon, authenticated using (true) with check (true);

CREATE INDEX IF NOT EXISTS idx_customers_restaurant_phone ON public.customers(restaurant_id, phone);
