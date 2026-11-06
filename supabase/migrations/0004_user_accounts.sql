-- Customer accounts (Supabase Auth). Audits run while signed in are linked to the user.
-- Access still goes through the server with the service role; RLS stays deny-all.
alter table public.audits
  add column if not exists user_id uuid references auth.users (id) on delete set null;

create index if not exists audits_user_idx on public.audits (user_id);
create index if not exists audits_email_idx on public.audits (lower(email));
