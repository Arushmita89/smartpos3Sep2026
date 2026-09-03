create table if not exists public.email_otps (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code text not null,
  purpose text not null check (purpose in ('signup', 'password_reset')),
  expires_at timestamptz not null,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_email_otps_email_purpose
  on public.email_otps (email, purpose, verified);

alter table public.email_otps enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'email_otps' and policyname = 'otp_insert') then
    create policy otp_insert on public.email_otps for insert to anon with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'email_otps' and policyname = 'otp_select') then
    create policy otp_select on public.email_otps for select to anon using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'email_otps' and policyname = 'otp_update') then
    create policy otp_update on public.email_otps for update to anon using (true) with check (true);
  end if;
end
$$;
