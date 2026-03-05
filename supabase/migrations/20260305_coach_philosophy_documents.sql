-- Phase 1: Philosophy platform persistence and access controls.

create table if not exists coach_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'admin')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table if not exists coach_philosophy_documents (
  id uuid primary key default gen_random_uuid(),
  scope text not null default 'global' unique,
  status text not null default 'draft' check (status in ('draft', 'published')),
  version integer not null default 1,
  principles text not null default '',
  dos text not null default '',
  donts text not null default '',
  workout_examples text not null default '',
  phase_notes text not null default '',
  koop_weight integer not null default 50 check (koop_weight >= 0 and koop_weight <= 100),
  bakken_weight integer not null default 50 check (bakken_weight >= 0 and bakken_weight <= 100),
  changelog_note text,
  published_at timestamptz,
  published_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table if not exists coach_philosophy_versions (
  id uuid primary key default gen_random_uuid(),
  version integer not null unique,
  source text not null check (source in ('publish', 'rollback')),
  principles text not null,
  dos text not null,
  donts text not null,
  workout_examples text not null,
  phase_notes text not null,
  koop_weight integer not null check (koop_weight >= 0 and koop_weight <= 100),
  bakken_weight integer not null check (bakken_weight >= 0 and bakken_weight <= 100),
  changelog_note text not null,
  published_by uuid not null references auth.users(id),
  published_at timestamptz not null default now()
);

create table if not exists coach_admin_audit (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  action text not null,
  status text not null check (status in ('allowed', 'denied', 'error')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table coach_admins enable row level security;
alter table coach_philosophy_documents enable row level security;
alter table coach_philosophy_versions enable row level security;
alter table coach_admin_audit enable row level security;

-- Admin roster is self-visible only.
drop policy if exists "coach_admins_select_self" on coach_admins;
create policy "coach_admins_select_self"
  on coach_admins
  for select
  using (auth.uid() = user_id);

-- Philosophy is readable for authenticated users, writes are blocked from client.
drop policy if exists "coach_philosophy_documents_select_auth" on coach_philosophy_documents;
create policy "coach_philosophy_documents_select_auth"
  on coach_philosophy_documents
  for select
  using (auth.role() = 'authenticated');

drop policy if exists "coach_philosophy_documents_no_client_writes" on coach_philosophy_documents;
create policy "coach_philosophy_documents_no_client_writes"
  on coach_philosophy_documents
  for all
  using (false)
  with check (false);

drop policy if exists "coach_philosophy_versions_select_auth" on coach_philosophy_versions;
create policy "coach_philosophy_versions_select_auth"
  on coach_philosophy_versions
  for select
  using (auth.role() = 'authenticated');

drop policy if exists "coach_philosophy_versions_no_client_writes" on coach_philosophy_versions;
create policy "coach_philosophy_versions_no_client_writes"
  on coach_philosophy_versions
  for all
  using (false)
  with check (false);

-- Audit log is service-managed only.
drop policy if exists "coach_admin_audit_service_only" on coach_admin_audit;
create policy "coach_admin_audit_service_only"
  on coach_admin_audit
  for all
  using (false)
  with check (false);

