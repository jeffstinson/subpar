-- Subpar OS intake activation + cutover state
-- Apply after 0005_go_live_imports.sql.
-- Provides a safe landing zone for verified Wix orders before a vehicle/tune project exists.

create table if not exists intake_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete restrict,
  order_id uuid not null unique references orders(id) on delete cascade,
  project_id uuid references tune_projects(id) on delete set null,
  source text not null default 'wix',
  platform text,
  product_name text,
  status text not null default 'new' check (status in ('new','awaiting_customer','ready','converted','blocked','canceled')),
  next_action text,
  vehicle_payload jsonb not null default '{}'::jsonb,
  source_summary jsonb not null default '{}'::jsonb,
  conflict jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists integration_cutovers (
  id uuid primary key default gen_random_uuid(),
  integration text not null check (integration in ('wix','gmail')),
  phase text not null check (phase in ('historical_scan','historical_apply','live_ingress','live_sync','outbound_send')),
  status text not null default 'planned' check (status in ('planned','ready','active','paused','complete','failed')),
  cursor_value text,
  source_start timestamptz,
  source_end timestamptz,
  last_verified_at timestamptz,
  counts jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(integration, phase)
);

create index if not exists idx_intake_requests_status on intake_requests(status, created_at desc);
create index if not exists idx_intake_requests_customer on intake_requests(customer_id, created_at desc);
create index if not exists idx_cutovers_status on integration_cutovers(integration, status);

alter table intake_requests enable row level security;
alter table integration_cutovers enable row level security;

-- Internal users may inspect intake; server integration layer performs writes.
drop policy if exists "internal read intake requests" on intake_requests;
create policy "internal read intake requests"
on intake_requests for select
to authenticated
using (subpar_is_internal());

-- Owners may inspect cutover state; server layer owns transitions.
drop policy if exists "owner read integration cutovers" on integration_cutovers;
create policy "owner read integration cutovers"
on integration_cutovers for select
to authenticated
using (subpar_is_owner());

comment on table intake_requests is 'Verified paid-order staging record that exists before vehicle intake is complete and before a tune project is created.';
comment on table integration_cutovers is 'Explicit historical/live handoff checkpoints for each provider so activation is resumable and auditable.';
