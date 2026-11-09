-- Schéma de synchronisation de l'app « Suivi activité ».
-- À coller une seule fois dans Supabase : SQL Editor > New query > Run.
-- Le script peut être relancé sans risque.

-- Une table générique : chaque ligne est un enregistrement de l'app (séance, repas, pesée…).
create table if not exists public.records (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  collection text not null,            -- nom de la table locale : workouts, meals…
  data jsonb not null,                 -- l'enregistrement complet
  updated_at timestamptz not null,     -- date de modification sur l'appareil (la plus récente gagne)
  deleted boolean not null default false,
  server_updated_at timestamptz not null default now(), -- date d'arrivée sur le serveur (sert à récupérer les nouveautés)
  primary key (user_id, id)
);

create index if not exists records_pull_idx on public.records (user_id, server_updated_at);

-- Sécurité (RLS) : chaque utilisateur ne voit et ne modifie que ses propres lignes.
alter table public.records enable row level security;

drop policy if exists "records_select_own" on public.records;
create policy "records_select_own" on public.records
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "records_insert_own" on public.records;
create policy "records_insert_own" on public.records
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "records_update_own" on public.records;
create policy "records_update_own" on public.records
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
-- Pas de règle de suppression : l'app ne supprime jamais vraiment, elle marque « deleted ».

-- La date serveur est toujours posée par la base, jamais par l'appareil.
create or replace function public.records_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.server_updated_at := clock_timestamp();
  return new;
end;
$$;

drop trigger if exists records_touch on public.records;
create trigger records_touch
  before insert or update on public.records
  for each row execute function public.records_touch();

-- Envoi groupé : une ligne n'en remplace une autre que si elle est plus récente.
-- « security invoker » : la fonction s'exécute avec les droits de l'utilisateur, donc sous RLS.
create or replace function public.push_records(rows jsonb)
returns integer
language sql
security invoker
set search_path = ''
as $$
  with input as (
    select *
    from jsonb_to_recordset(rows) as r (id text, collection text, data jsonb, updated_at timestamptz, deleted boolean)
  ),
  written as (
    insert into public.records (user_id, id, collection, data, updated_at, deleted)
    select auth.uid(), id, collection, data, updated_at, coalesce(deleted, false)
    from input
    on conflict (user_id, id) do update
      set collection = excluded.collection,
          data = excluded.data,
          updated_at = excluded.updated_at,
          deleted = excluded.deleted
      where public.records.updated_at < excluded.updated_at
    returning 1
  )
  select count(*)::integer from written;
$$;

revoke execute on function public.push_records(jsonb) from public, anon;
grant execute on function public.push_records(jsonb) to authenticated;
