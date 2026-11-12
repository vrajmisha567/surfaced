-- Shared cache for Google Maps (Places / DataForSEO) search results, so audits of
-- businesses in the same trade and city reuse the same grid searches for 24 hours.
create table if not exists public.places_cache (
  key text primary key,
  data jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists places_cache_created_at_idx on public.places_cache (created_at);
-- Same as every other table: RLS on, no policies, server-side service role only.
alter table public.places_cache enable row level security;
