-- =====================================================================
--  OPTIONAL: rebuild your property pages on Vercel within about a minute of every change
--  (without it, the home page and the quick-view window still update instantly, and each property
--   page refreshes its price and availability when opened. Only brand-new properties wait for the next
--   deployment to get their own page, until then their link opens the quick view.)
--
--  1) Vercel → your project → Settings → Git → Deploy Hooks → create one named "listings" for branch main.
--     (Your project must be connected to a Git repository.) Copy the URL it gives you.
--  2) Replace PASTE_DEPLOY_HOOK_URL below with that URL, then run this in Supabase → SQL Editor.
--  Treat the hook URL like a password: anyone who has it can trigger a deployment.
-- =====================================================================
create extension if not exists pg_net with schema extensions;

create or replace function public.notify_vercel_rebuild() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform net.http_post(
    url     := 'PASTE_DEPLOY_HOOK_URL',
    body    := '{}'::jsonb,
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  return null;
end $$;
revoke all on function public.notify_vercel_rebuild() from public, anon, authenticated;

drop trigger if exists listings_rebuild on public.listings;
create trigger listings_rebuild after insert or update or delete on public.listings
for each statement execute function public.notify_vercel_rebuild();
