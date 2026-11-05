-- Surfaced schema. All access goes through the server with the service role key,
-- so RLS is enabled on every table with no public policies (deny by default).

create table if not exists public.audits (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  url text not null,
  business_name text not null,
  suburb text not null default '',
  category text not null,
  email text,
  overall_score int not null,
  result jsonb not null,
  prospect_id uuid,
  client_id uuid
);
create index if not exists audits_created_idx on public.audits (created_at desc);
create index if not exists audits_client_idx on public.audits (client_id);

create table if not exists public.prospects (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  website text,
  phone text,
  email text,
  address text,
  suburb text,
  category text not null,
  place_id text unique,
  rating numeric,
  review_count int,
  status text not null default 'new'
    check (status in ('new','audited','contacted','replied','pilot','won','lost')),
  audit_id uuid references public.audits(id) on delete set null,
  score int,
  notes text,
  last_contacted_at timestamptz
);
create index if not exists prospects_status_idx on public.prospects (status);
create index if not exists prospects_audit_idx on public.prospects (audit_id);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  website text not null,
  suburb text not null default '',
  category text not null,
  contact_name text,
  contact_email text,
  plan text not null default 'visibility' check (plan in ('fixpack','visibility','growth','pilot')),
  status text not null default 'active' check (status in ('active','paused','cancelled')),
  monthly_value numeric not null default 0,
  share_token text not null unique,
  competitors jsonb not null default '[]'::jsonb,
  prompts jsonb not null default '[]'::jsonb,
  fixes jsonb not null default '[]'::jsonb,
  stripe_customer_id text,
  baseline_audit_id uuid references public.audits(id) on delete set null
);
create index if not exists clients_baseline_idx on public.clients (baseline_audit_id);

alter table public.audits
  add constraint audits_prospect_fk foreign key (prospect_id) references public.prospects(id) on delete set null,
  add constraint audits_client_fk foreign key (client_id) references public.clients(id) on delete set null;
create index if not exists audits_prospect_idx on public.audits (prospect_id);

create table if not exists public.tracker_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  client_id uuid not null references public.clients(id) on delete cascade,
  week text not null,
  engine text not null check (engine in ('chatgpt','gemini','perplexity','claude')),
  prompt text not null,
  mentioned boolean not null,
  position int,
  competitors_mentioned jsonb not null default '[]'::jsonb,
  others_named jsonb not null default '[]'::jsonb,
  answer text not null default '',
  citations jsonb not null default '[]'::jsonb,
  error text
);
create index if not exists tracker_runs_client_week_idx on public.tracker_runs (client_id, week);

alter table public.audits enable row level security;
alter table public.prospects enable row level security;
alter table public.clients enable row level security;
alter table public.tracker_runs enable row level security;
