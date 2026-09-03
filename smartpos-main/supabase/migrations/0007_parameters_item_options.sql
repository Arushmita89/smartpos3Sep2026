-- SmartPOS: restaurant-level default item customization options
alter table public.parameters
  add column if not exists item_options jsonb not null default '[]'::jsonb;

-- Seed existing restaurants with the standard default list so the
-- options show up for everyone until the restaurant customizes them.
update public.parameters
  set item_options = '["Spicy","Hot","Medium","No Salt","No Sugar","Extra Spicy","Less Spicy","Less Oil","Extra Cheese"]'::jsonb
  where item_options is null
     or jsonb_array_length(item_options) = 0;
