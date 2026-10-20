create table if not exists public.bottletrack_state (
  id integer primary key check (id = 1),
  data jsonb not null default '{"products":[],"activity":[]}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.bottletrack_state enable row level security;
grant select, insert, update on public.bottletrack_state to anon;

drop policy if exists "Public can read BottleTrack inventory" on public.bottletrack_state;
create policy "Public can read BottleTrack inventory"
  on public.bottletrack_state for select to anon using (true);

drop policy if exists "Public can create BottleTrack inventory" on public.bottletrack_state;
create policy "Public can create BottleTrack inventory"
  on public.bottletrack_state for insert to anon with check (id = 1);

drop policy if exists "Public can update BottleTrack inventory" on public.bottletrack_state;
create policy "Public can update BottleTrack inventory"
  on public.bottletrack_state for update to anon using (id = 1) with check (id = 1);

create or replace function public.set_bottletrack_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists bottletrack_updated_at on public.bottletrack_state;
create trigger bottletrack_updated_at
  before update on public.bottletrack_state
  for each row execute function public.set_bottletrack_updated_at();
