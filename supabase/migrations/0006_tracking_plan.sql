-- Allow the Tracking plan ($190/month, weekly tracking after the Fix Pack) on clients.
alter table public.clients drop constraint if exists clients_plan_check;
alter table public.clients
  add constraint clients_plan_check
  check (plan in ('fixpack', 'tracking', 'visibility', 'growth', 'pilot'));
