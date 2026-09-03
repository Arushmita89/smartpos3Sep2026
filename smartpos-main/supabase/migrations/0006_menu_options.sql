-- SmartPOS: add per-item customization options (e.g. Spicy, No salt, Extra sambar)
alter table public.menu
  add column if not exists options jsonb not null default '[]';

create index if not exists idx_menu_options on public.menu using gin (options);
