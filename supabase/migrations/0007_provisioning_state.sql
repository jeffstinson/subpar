-- Subpar OS provisioning state
-- Apply after 0006_intake_activation.sql.
-- Gives the application a durable, non-secret record of schema versions, connection probes and onboarding checkpoints.

create table if not exists schema_migrations (
  version text primary key,
  name text not null,
  applied_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

insert into schema_migrations (version,name)
values
  ('0001','core'),
  ('0002','identity_storage'),
  ('0003','access_hardening'),
  ('0004','integration_staging'),
  ('0005','go_live_imports'),
  ('0006','intake_activation'),
  ('0007','provisioning_state')
on conflict (version) do nothing;

create table if not exists connection_tests (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('supabase','storage','wix','gmail')),
  test_type text not null,
  status text not null check (status in ('pass','fail','skipped')),
  latency_ms integer,
  detail text,
  metadata jsonb not null default '{}'::jsonb,
  tested_by text,
  tested_at timestamptz not null default now()
);

create table if not exists setup_checkpoints (
  checkpoint_key text primary key,
  status text not null default 'pending' check (status in ('pending','ready','passed','blocked','skipped')),
  detail text,
  metadata jsonb not null default '{}'::jsonb,
  verified_by text,
  verified_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists idx_connection_tests_provider on connection_tests(provider,tested_at desc);
create index if not exists idx_setup_checkpoints_status on setup_checkpoints(status,updated_at desc);

alter table schema_migrations enable row level security;
alter table connection_tests enable row level security;
alter table setup_checkpoints enable row level security;

-- Owners may inspect provisioning state; writes remain server-brokered.
drop policy if exists "owner read schema migrations" on schema_migrations;
create policy "owner read schema migrations"
on schema_migrations for select
to authenticated
using (subpar_is_owner());

drop policy if exists "owner read connection tests" on connection_tests;
create policy "owner read connection tests"
on connection_tests for select
to authenticated
using (subpar_is_owner());

drop policy if exists "owner read setup checkpoints" on setup_checkpoints;
create policy "owner read setup checkpoints"
on setup_checkpoints for select
to authenticated
using (subpar_is_owner());

insert into setup_checkpoints (checkpoint_key,status,detail)
values
  ('database_schema','ready','Migrations 0001–0007 define the complete current Subpar schema.'),
  ('synthetic_parity','pending','Run the synthetic seed and compare dashboard/project counts.'),
  ('internal_identity','pending','Create and validate Doug owner identity.'),
  ('customer_identity','pending','Create and validate a synthetic customer portal identity.'),
  ('private_storage','pending','Prove signed upload/finalize/download across all private file lanes.'),
  ('wix_read','pending','Validate site-scoped Wix OAuth and historical order read.'),
  ('wix_replay','pending','Replay a signed Wix event and prove one effect.'),
  ('gmail_read','pending','Validate Gmail OAuth, profile and thread hydration.'),
  ('gmail_history','pending','Prove history cursor resume and expiration fallback.'),
  ('historical_reconciliation','pending','Historical import counts have zero unexplained records.'),
  ('outbound_email','pending','Prove draft/approval/idempotency before enabling Gmail send.')
on conflict (checkpoint_key) do nothing;

comment on table schema_migrations is 'Subpar OS migration manifest. 0007 backfills the known ordered migration history.';
comment on table connection_tests is 'Non-secret results of explicit provider connection probes. Never store tokens, credentials or raw provider payloads.';
comment on table setup_checkpoints is 'Go-live checklist state used by the Go Live Center and cutover runbook.';
