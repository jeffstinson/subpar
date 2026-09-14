-- Subpar OS go-live import control
-- Apply after 0004_integration_staging.sql.
-- Tracks historical Wix/Gmail imports separately from live webhook/sync processing.
-- Import batches are resumable, idempotent and server-managed.

create table if not exists import_batches (
  id uuid primary key default gen_random_uuid(),
  integration text not null check (integration in ('wix','gmail')),
  import_type text not null check (import_type in ('historical_orders','historical_threads','historical_messages')),
  status text not null default 'planned' check (status in ('planned','running','paused','completed','failed','canceled')),
  mode text not null default 'dry-run' check (mode in ('dry-run','apply')),
  source_start timestamptz,
  source_end timestamptz,
  cursor_value text,
  expected_count integer,
  scanned_count integer not null default 0,
  created_count integer not null default 0,
  matched_count integer not null default 0,
  skipped_count integer not null default 0,
  conflict_count integer not null default 0,
  failed_count integer not null default 0,
  options jsonb not null default '{}'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  created_by text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists import_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references import_batches(id) on delete cascade,
  integration text not null,
  external_type text not null,
  external_id text not null,
  source_hash text,
  status text not null default 'pending' check (status in ('pending','matched','created','skipped','conflict','failed')),
  local_type text,
  local_id uuid,
  match_reason text,
  conflict_reason text,
  error text,
  preview jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(batch_id, external_type, external_id)
);

create index if not exists idx_import_batches_status on import_batches(integration, status, created_at desc);
create index if not exists idx_import_items_batch on import_items(batch_id, status, created_at asc);
create index if not exists idx_import_items_external on import_items(integration, external_type, external_id);

alter table import_batches enable row level security;
alter table import_items enable row level security;

-- Import execution is server-brokered. Internal users may inspect progress/results only.
drop policy if exists "internal read import batches" on import_batches;
create policy "internal read import batches"
on import_batches for select
to authenticated
using (subpar_is_internal());

drop policy if exists "internal read import items" on import_items;
create policy "internal read import items"
on import_items for select
to authenticated
using (subpar_is_internal());

comment on table import_batches is 'Resumable historical import jobs for Wix/Gmail. Writes are server-brokered and replay-safe.';
comment on table import_items is 'Per-provider-record import result ledger used for duplicate/conflict review and resumable cutover.';
