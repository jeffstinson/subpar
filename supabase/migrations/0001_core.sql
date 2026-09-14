-- Subpar OS core schema
-- Designed for an isolated Supabase/Postgres project.
-- No live environment is connected by this migration file alone.

create extension if not exists pgcrypto;
create extension if not exists citext;

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  email citext unique,
  first_name text,
  last_name text,
  phone text,
  source text not null default 'manual',
  external_customer_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  year integer,
  make text not null,
  model text not null,
  chassis text,
  engine text,
  vin text,
  transmission text,
  current_fuel text,
  hardware jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete restrict,
  vehicle_id uuid references vehicles(id) on delete set null,
  external_source text not null,
  external_order_id text not null,
  product_name text,
  amount_cents integer,
  currency text not null default 'USD',
  payment_status text not null default 'pending',
  raw_payload jsonb not null default '{}'::jsonb,
  ordered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(external_source, external_order_id)
);

create table if not exists tune_projects (
  id uuid primary key default gen_random_uuid(),
  project_number text not null unique,
  customer_id uuid not null references customers(id) on delete restrict,
  vehicle_id uuid not null references vehicles(id) on delete restrict,
  order_id uuid references orders(id) on delete set null,
  assigned_to uuid,
  platform text not null,
  fuel_target text,
  status text not null default 'new_order',
  stage text not null default 'intake',
  priority text not null default 'normal' check (priority in ('low','normal','medium','high','urgent')),
  waiting_on text not null default 'customer' check (waiting_on in ('customer','tuner','system','none')),
  next_action text,
  current_revision_number integer not null default 0,
  customer_visible_status text,
  internal_notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);

create table if not exists project_requirements (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references tune_projects(id) on delete cascade,
  requirement_type text not null,
  label text not null,
  status text not null default 'pending' check (status in ('pending','requested','received','complete','waived','blocked')),
  customer_visible boolean not null default true,
  required boolean not null default true,
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists revisions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references tune_projects(id) on delete cascade,
  revision_number integer not null,
  status text not null default 'draft' check (status in ('draft','ready','delivered','superseded','recalled','final')),
  fuel_target text,
  customer_summary text,
  internal_notes text,
  base_revision_id uuid references revisions(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, revision_number)
);

create table if not exists logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references tune_projects(id) on delete cascade,
  revision_id uuid references revisions(id) on delete set null,
  platform text not null,
  source text not null default 'upload',
  external_url text,
  file_name text,
  status text not null default 'uploaded' check (status in ('uploaded','parsing','ready','needs_review','reviewed','rejected','error')),
  gear integer,
  fuel text,
  metrics jsonb not null default '{}'::jsonb,
  flags jsonb not null default '[]'::jsonb,
  parser_version text,
  uploaded_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references tune_projects(id) on delete cascade,
  revision_id uuid references revisions(id) on delete set null,
  log_id uuid references logs(id) on delete set null,
  kind text not null,
  storage_bucket text not null,
  storage_path text not null,
  original_name text not null,
  mime_type text,
  size_bytes bigint,
  sha256 text,
  visibility text not null default 'internal' check (visibility in ('internal','customer')),
  immutable boolean not null default true,
  created_at timestamptz not null default now(),
  unique(storage_bucket, storage_path)
);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references tune_projects(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  channel text not null,
  external_thread_id text,
  subject text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(channel, external_thread_id)
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  project_id uuid references tune_projects(id) on delete cascade,
  external_message_id text,
  direction text not null check (direction in ('inbound','outbound','system')),
  sender text,
  recipient text,
  subject text,
  body_text text,
  body_html text,
  customer_visible boolean not null default true,
  sent_at timestamptz,
  received_at timestamptz,
  created_at timestamptz not null default now(),
  unique(conversation_id, external_message_id)
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references tune_projects(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  vehicle_id uuid references vehicles(id) on delete set null,
  event_type text not null,
  actor_type text not null default 'system',
  actor_id text,
  visibility text not null default 'internal' check (visibility in ('internal','customer','both')),
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text,
  created_at timestamptz not null default now(),
  unique(idempotency_key)
);

create table if not exists automation_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  version integer not null default 1,
  enabled boolean not null default false,
  trigger_type text not null,
  conditions jsonb not null default '[]'::jsonb,
  actions jsonb not null default '[]'::jsonb,
  dry_run boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(name, version)
);

create table if not exists automation_runs (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references automation_rules(id) on delete restrict,
  project_id uuid references tune_projects(id) on delete cascade,
  trigger_event_id uuid references events(id) on delete set null,
  status text not null default 'queued' check (status in ('queued','running','success','skipped','failed')),
  dry_run boolean not null default true,
  reason text,
  result jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists integration_sync_state (
  id uuid primary key default gen_random_uuid(),
  integration text not null,
  sync_key text not null,
  cursor_value text,
  status text not null default 'idle',
  last_success_at timestamptz,
  last_error_at timestamptz,
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique(integration, sync_key)
);

create table if not exists webhook_receipts (
  id uuid primary key default gen_random_uuid(),
  integration text not null,
  external_event_id text not null,
  signature_valid boolean not null default false,
  payload_sha256 text,
  status text not null default 'received',
  error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique(integration, external_event_id)
);

create index if not exists idx_vehicles_customer on vehicles(customer_id);
create index if not exists idx_orders_customer on orders(customer_id);
create index if not exists idx_projects_customer on tune_projects(customer_id);
create index if not exists idx_projects_vehicle on tune_projects(vehicle_id);
create index if not exists idx_projects_status on tune_projects(status, waiting_on, priority);
create index if not exists idx_requirements_project on project_requirements(project_id, status);
create index if not exists idx_revisions_project on revisions(project_id, revision_number desc);
create index if not exists idx_logs_project on logs(project_id, uploaded_at desc);
create index if not exists idx_files_project on files(project_id, created_at desc);
create index if not exists idx_messages_project on messages(project_id, created_at desc);
create index if not exists idx_events_project on events(project_id, created_at desc);
create index if not exists idx_automation_runs_project on automation_runs(project_id, created_at desc);

-- Keep browser/client access closed until authenticated roles and portal policies are deliberately defined.
alter table customers enable row level security;
alter table vehicles enable row level security;
alter table orders enable row level security;
alter table tune_projects enable row level security;
alter table project_requirements enable row level security;
alter table revisions enable row level security;
alter table logs enable row level security;
alter table files enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table events enable row level security;
alter table automation_rules enable row level security;
alter table automation_runs enable row level security;
alter table integration_sync_state enable row level security;
alter table webhook_receipts enable row level security;
