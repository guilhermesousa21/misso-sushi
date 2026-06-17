-- Run this in the Supabase SQL editor after reviewing your auth strategy.
-- The current app uses the anon key on the client, so public read access is kept
-- for menu/settings/promotions and order creation remains available to customers.

alter table if exists public.menu enable row level security;
alter table if exists public.orders enable row level security;
alter table if exists public.store_settings enable row level security;
alter table if exists public.promotions enable row level security;

drop policy if exists "Public can read active menu" on public.menu;
create policy "Public can read active menu"
on public.menu for select
using (active is distinct from false);

drop policy if exists "Public can create orders" on public.orders;
create policy "Public can create orders"
on public.orders for insert
with check (true);

drop policy if exists "Public can read store settings" on public.store_settings;
create policy "Public can read store settings"
on public.store_settings for select
using (true);

drop policy if exists "Public can read active promotions" on public.promotions;
create policy "Public can read active promotions"
on public.promotions for select
using (active is true);

-- Admin writes should ideally use Supabase Auth roles or a service-role backend.
-- Do not expose the service-role key to the browser.
