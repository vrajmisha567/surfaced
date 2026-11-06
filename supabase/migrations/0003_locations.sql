-- Worldwide locations: city + ISO country code alongside the existing suburb/area field.
-- Existing rows are Adelaide, Australia.
alter table public.audits    add column if not exists city text not null default 'Adelaide';
alter table public.audits    add column if not exists country text not null default 'AU';
alter table public.prospects add column if not exists city text;
alter table public.prospects add column if not exists country text not null default 'AU';
alter table public.clients   add column if not exists city text not null default 'Adelaide';
alter table public.clients   add column if not exists country text not null default 'AU';

-- New defaults for rows created from now on: the app always sends city and country explicitly.
alter table public.audits  alter column city set default '';
alter table public.clients alter column city set default '';
