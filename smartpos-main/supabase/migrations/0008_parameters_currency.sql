-- SmartPOS: restaurant billing currency for subscription display/charges
alter table public.parameters
  add column if not exists currency text not null default 'INR',
  add column if not exists country_code text not null default 'IN';
