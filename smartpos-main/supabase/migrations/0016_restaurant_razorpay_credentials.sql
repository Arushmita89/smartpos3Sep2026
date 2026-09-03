alter table public.parameters
  add column if not exists razorpay_key_id text,
  add column if not exists razorpay_key_secret text;
