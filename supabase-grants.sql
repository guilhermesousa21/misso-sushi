-- Grants required for the current app, which uses the Supabase anon key.
-- Run this after creating tables/policies.

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on table public.menu to anon, authenticated;
grant select, insert, update on table public.orders to anon, authenticated;
grant select, insert, update on table public.store_settings to anon, authenticated;
grant select, insert, update on table public.promotions to anon, authenticated;

grant usage, select on all sequences in schema public to anon, authenticated;
