-- Subpar OS revision delivery loop
-- Apply after 0012_log_review_workflow.sql.
-- Closes review -> revision -> QA -> customer delivery -> acknowledgement -> next-log handoff.

create table if not exists revision_deliveries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references tune_projects(id) on delete cascade,
  revision_id uuid not null references revisions(id) on delete cascade,
  primary_file_id uuid references files(id) on delete restrict,
  outbound_action_id uuid references outbound_actions(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','qa_ready','approved','delivered','acknowledged','relog_requested','closed','recalled')),
  next_step text not null default 'request_log' check (next_step in ('request_log','feedback_only','complete')),
  customer_summary text,
  internal_qa_notes text,
  qa_snapshot jsonb not null default '{}'::jsonb,
  file_sha256 text,
  approved_by text,
  approved_at timestamptz,
  delivered_by text,
  delivered_at timestamptz,
  acknowledged_by text,
  acknowledged_at timestamptz,
  installed_at timestamptz,
  next_log_requested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(revision_id)
);

create index if not exists idx_revision_deliveries_project on revision_deliveries(project_id,created_at desc);
create index if not exists idx_revision_deliveries_status on revision_deliveries(status,updated_at desc);

alter table revision_deliveries enable row level security;
drop policy if exists "internal read revision deliveries" on revision_deliveries;
create policy "internal read revision deliveries" on revision_deliveries for select to authenticated using (subpar_is_internal());

-- A customer log is created before its private object is uploaded so the storage ticket can bind to a log id.
-- The file finalizer advances awaiting_upload -> uploaded and invokes the server-side parser.
alter table logs drop constraint if exists logs_status_check;
alter table logs add constraint logs_status_check check (status in ('awaiting_upload','uploaded','parsing','ready','needs_review','reviewed','rejected','error'));

-- Customer acknowledgement and all mutations are server-brokered. Browser writes remain closed.
insert into schema_migrations(version,name) values ('0013','revision_delivery_loop') on conflict(version) do nothing;
insert into setup_checkpoints(checkpoint_key,status,detail) values ('revision_delivery_loop','pending','Validate review -> revision file -> QA -> approval -> portal/Gmail delivery -> customer acknowledgement -> private next-log upload -> parser -> Review Cockpit return.') on conflict(checkpoint_key) do nothing;
update setup_checkpoints set detail='Migrations 0001–0013 define the current Subpar schema.',updated_at=now() where checkpoint_key='database_schema';

comment on table revision_deliveries is 'Server-brokered delivery state for one revision. Customer visibility is unlocked only after tuner approval and delivery.';
comment on column revision_deliveries.qa_snapshot is 'Immutable-at-approval snapshot of delivery gates, project context and revision/file checks.';
comment on column revision_deliveries.file_sha256 is 'SHA-256 of the private tune artifact calculated by Subpar OS during QA when storage is available.';