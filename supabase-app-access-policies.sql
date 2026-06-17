-- Temporary app-level access policies for the current frontend architecture.
-- The app protects /admin and /cozinha with Next.js login, but Supabase requests
-- still use the anon key in the browser. These policies keep the app functional.
-- For stronger production security, move admin writes to server routes with a
-- service-role key and then replace these broad anon policies.

alter table if exists public.menu enable row level security;
alter table if exists public.orders enable row level security;
alter table if exists public.store_settings enable row level security;
alter table if exists public.promotions enable row level security;
alter table if exists public.menu_categories enable row level security;

drop policy if exists "App can read menu" on public.menu;
create policy "App can read menu"
on public.menu for select
using (true);

drop policy if exists "App can insert menu" on public.menu;
create policy "App can insert menu"
on public.menu for insert
with check (true);

drop policy if exists "App can update menu" on public.menu;
create policy "App can update menu"
on public.menu for update
using (true)
with check (true);

drop policy if exists "App can delete menu" on public.menu;
create policy "App can delete menu"
on public.menu for delete
using (true);

drop policy if exists "App can read orders" on public.orders;
create policy "App can read orders"
on public.orders for select
using (true);

drop policy if exists "App can update orders" on public.orders;
create policy "App can update orders"
on public.orders for update
using (true)
with check (true);

drop policy if exists "App can create orders" on public.orders;
create policy "App can create orders"
on public.orders for insert
with check (true);

drop policy if exists "App can read store settings" on public.store_settings;
create policy "App can read store settings"
on public.store_settings for select
using (true);

drop policy if exists "App can insert store settings" on public.store_settings;
create policy "App can insert store settings"
on public.store_settings for insert
with check (true);

drop policy if exists "App can update store settings" on public.store_settings;
create policy "App can update store settings"
on public.store_settings for update
using (true)
with check (true);

drop policy if exists "App can read promotions" on public.promotions;
create policy "App can read promotions"
on public.promotions for select
using (true);

drop policy if exists "App can insert promotions" on public.promotions;
create policy "App can insert promotions"
on public.promotions for insert
with check (true);

drop policy if exists "App can update promotions" on public.promotions;
create policy "App can update promotions"
on public.promotions for update
using (true)
with check (true);

drop policy if exists "App can read menu categories" on public.menu_categories;
create policy "App can read menu categories"
on public.menu_categories for select
using (true);

drop policy if exists "App can insert menu categories" on public.menu_categories;
create policy "App can insert menu categories"
on public.menu_categories for insert
with check (true);

drop policy if exists "App can update menu categories" on public.menu_categories;
create policy "App can update menu categories"
on public.menu_categories for update
using (true)
with check (true);

drop policy if exists "App can delete menu categories" on public.menu_categories;
create policy "App can delete menu categories"
on public.menu_categories for delete
using (true);
