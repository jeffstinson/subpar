-- Subpar OS datalog review workflow
-- Apply after 0011_log_intelligence.sql.
-- Persists tuner review decisions, annotations and external log references without treating parser output as calibration approval.

create table if not exists log_review_sessions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references tune_projects(id) on delete cascade,
  revision_id uuid references revisions(id) on delete set null,
  primary_log_id uuid not null references logs(id) on delete restrict,
  comparison_log_id uuid references logs(id) on delete set null,
  status text not null default 'open' check (status in ('open','decisioned','closed')),
  decision text not null default 'pending' check (decision in ('pending','create_revision','request_relog','complete','hold')),
  tuner_note text,
  customer_summary text,
  parser_snapshot jsonb not null default '{}'::jsonb,
  comparison_snapshot jsonb not null default '{}'::jsonb,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(primary_log_id)
);

create table if not exists log_annotations (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references log_review_sessions(id) on delete cascade,
  log_id uuid not null references logs(id) on delete cascade,
  metric_key text,
  rpm numeric,
  severity text not null default 'note' check (severity in ('note','watch','issue','good')),
  note text not null,
  created_by text,
  created_at timestamptz not null default now()
);

create table if not exists external_log_sources (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references tune_projects(id) on delete cascade,
  revision_id uuid references revisions(id) on delete set null,
  provider text not null,
  external_url text not null,
  external_id text,
  status text not null default 'reference_only' check (status in ('reference_only','fetched','linked','error')),
  linked_log_id uuid references logs(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  last_error text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider,external_url)
);

create index if not exists idx_log_reviews_project on log_review_sessions(project_id,created_at desc);
create index if not exists idx_log_annotations_review on log_annotations(review_id,created_at);
create index if not exists idx_external_log_sources_project on external_log_sources(project_id,provider,created_at desc);

alter table log_review_sessions enable row level security;
alter table log_annotations enable row level security;
alter table external_log_sources enable row level security;

drop policy if exists "internal read log reviews" on log_review_sessions;
create policy "internal read log reviews" on log_review_sessions for select to authenticated using (subpar_is_internal());
drop policy if exists "internal read log annotations" on log_annotations;
create policy "internal read log annotations" on log_annotations for select to authenticated using (subpar_is_internal());
drop policy if exists "internal read external log sources" on external_log_sources;
create policy "internal read external log sources" on external_log_sources for select to authenticated using (subpar_is_internal());

-- Browser writes stay closed. Review decisions and external-source registration are server-brokered.
insert into schema_migrations(version,name) values ('0012','log_review_workflow') on conflict(version) do nothing;
insert into setup_checkpoints(checkpoint_key,status,detail) values ('log_review_workflow','pending','Validate parsed pull comparison, annotations, explicit tuner decisions, revision handoff and Datazap reference linking against Doug-approved examples.') on conflict(checkpoint_key) do nothing;
update setup_checkpoints set detail='Migrations 0001–0012 define the current Subpar schema.',updated_at=now() where checkpoint_key='database_schema';

comment on table log_review_sessions is 'Explicit tuner review record. Parser summaries are evidence/context, never calibration approval.';
comment on table log_annotations is 'Tuner-authored notes tied to a log/metric/RPM region.';
comment on table external_log_sources is 'Provider references such as Datazap URLs. A reference is not considered parsed until backed by verified data.';
