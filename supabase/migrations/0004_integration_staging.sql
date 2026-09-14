-- Subpar OS integration staging
-- Apply after 0003_access_hardening.sql.
-- Adds idempotent external-link mapping and a server-brokered outbound action queue.
-- Raw Wix/Gmail payloads are intentionally not persisted here.

alter table webhook_receipts
  add column if not exists event_type text,
  add column if not exists instance_id text,
  add column if not exists payload_summary jsonb not null default '{}'::jsonb,
  add column if not exists processed_result jsonb not null default '{}'::jsonb,
  add column if not exists retry_count integer not null default 0;

create table if not exists external_links (
  id uuid primary key default gen_random_uuid(),
  integration text not null,
  external_type text not null,
  external_id text not null,
  local_type text not null check (local_type in ('customer','vehicle','order','project','conversation','message','file')),
  local_id uuid not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(integration, external_type, external_id)
);

create table if not exists outbound_actions (
  id uuid primary key default gen_random_uuid(),
  integration text not null,
  action_type text not null,
  project_id uuid references tune_projects(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  conversation_id uuid references conversations(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','approved','queued','sent','failed','canceled')),
  recipient text,
  subject text,
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text not null unique,
  created_by text,
  approved_by text,
  approved_at timestamptz,
  sent_at timestamptz,
  provider_message_id text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_webhook_receipts_lookup on webhook_receipts(integration, external_event_id, received_at desc);
create index if not exists idx_external_links_local on external_links(local_type, local_id);
create index if not exists idx_outbound_actions_project on outbound_actions(project_id, created_at desc);
create index if not exists idx_outbound_actions_status on outbound_actions(integration, status, created_at asc);

alter table external_links enable row level security;
alter table outbound_actions enable row level security;

-- Integration linkage is server-managed; internal users may inspect it.
drop policy if exists "internal read external links" on external_links;
create policy "internal read external links"
on external_links for select
to authenticated
using (subpar_is_internal());

-- Outbound queue is server-managed. Internal users may inspect drafts/status,
-- but browser clients do not receive direct insert/update/delete privileges.
drop policy if exists "internal read outbound actions" on outbound_actions;
create policy "internal read outbound actions"
on outbound_actions for select
to authenticated
using (subpar_is_internal());

comment on table external_links is 'Idempotent mapping between provider IDs and Subpar OS records. Multiple provider identities may intentionally converge on one local record; writes are server-brokered.';
comment on table outbound_actions is 'Server-brokered outbound integration queue. Draft/approval/send state is auditable and idempotent.';
comment on column webhook_receipts.payload_summary is 'Redacted, non-raw summary used for operations/audit without retaining the full provider payload.';
