-- Subpar OS production activation readiness
-- Apply after 0014_tune_lifecycle_closeout.sql.
-- Adds a durable audit ledger plus a service-only integrity snapshot used before real-data cutover.

create table if not exists activation_audit_runs (
  id uuid primary key default gen_random_uuid(),
  mode text not null check (mode in ('demo','supabase')),
  environment text not null default 'preview',
  app_commit text,
  status text not null default 'running' check (status in ('running','pass','warn','fail')),
  summary jsonb not null default '{}'::jsonb,
  run_by text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists activation_audit_checks (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references activation_audit_runs(id) on delete cascade,
  check_key text not null,
  category text not null,
  severity text not null default 'blocker' check (severity in ('blocker','warning','info')),
  status text not null check (status in ('pass','warn','fail','skipped')),
  detail text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(run_id,check_key)
);

create index if not exists idx_activation_audit_runs_created on activation_audit_runs(created_at desc);
create index if not exists idx_activation_audit_checks_run on activation_audit_checks(run_id,category,status);

alter table activation_audit_runs enable row level security;
alter table activation_audit_checks enable row level security;

drop policy if exists "owner read activation audit runs" on activation_audit_runs;
create policy "owner read activation audit runs" on activation_audit_runs for select to authenticated using (subpar_is_owner());
drop policy if exists "owner read activation audit checks" on activation_audit_checks;
create policy "owner read activation audit checks" on activation_audit_checks for select to authenticated using (subpar_is_owner());

-- Read-only operational integrity probe. This reports counts only; it never exposes customer content.
create or replace function subpar_operational_integrity_snapshot()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  projects_missing_current_cycle integer := 0;
  project_cycle_owner_mismatch integer := 0;
  multiple_active_cycles integer := 0;
  orphan_cycle_records integer := 0;
  customer_visible_unreleased_tunes integer := 0;
  released_delivery_file_mismatch integer := 0;
  closed_closeout_file_mismatch integer := 0;
  completed_project_cycle_mismatch integer := 0;
  archived_logs_still_queued integer := 0;
  overdue_followups integer := 0;
  sent_email_without_approval integer := 0;
begin
  select count(*) into projects_missing_current_cycle from tune_projects where current_cycle_id is null;

  select count(*) into project_cycle_owner_mismatch
  from tune_projects p join tune_cycles c on c.id=p.current_cycle_id
  where c.project_id<>p.id;

  select count(*) into multiple_active_cycles
  from (
    select project_id from tune_cycles where status='active' group by project_id having count(*)>1
  ) x;

  select
    (select count(*) from project_requirements where cycle_id is null)+
    (select count(*) from revisions where cycle_id is null)+
    (select count(*) from logs where cycle_id is null)+
    (select count(*) from files where cycle_id is null)+
    (select count(*) from events where cycle_id is null)+
    (select count(*) from log_review_sessions where cycle_id is null)+
    (select count(*) from revision_deliveries where cycle_id is null)
  into orphan_cycle_records;

  select count(*) into customer_visible_unreleased_tunes
  from files f
  where f.kind='tune_revision' and f.visibility='customer'
    and not exists (
      select 1 from revision_deliveries d
      where d.primary_file_id=f.id and d.status in ('delivered','acknowledged','relog_requested','closed')
    );

  select count(*) into released_delivery_file_mismatch
  from revision_deliveries d
  left join files f on f.id=d.primary_file_id
  where d.status in ('delivered','acknowledged','relog_requested','closed')
    and (
      f.id is null or f.project_id<>d.project_id or f.revision_id<>d.revision_id or
      f.cycle_id is distinct from d.cycle_id or f.kind<>'tune_revision' or
      f.visibility<>'customer' or f.immutable is not true or
      d.file_sha256 is null or f.sha256 is null or lower(d.file_sha256)<>lower(f.sha256)
    );

  select count(*) into closed_closeout_file_mismatch
  from project_closeouts co
  left join files f on f.id=co.final_file_id
  left join revisions r on r.id=co.final_revision_id
  where co.status='closed'
    and (
      f.id is null or r.id is null or f.project_id<>co.project_id or r.project_id<>co.project_id or
      f.cycle_id is distinct from co.cycle_id or r.cycle_id is distinct from co.cycle_id or
      f.kind<>'tune_revision' or f.visibility<>'customer' or f.immutable is not true or
      co.final_file_sha256 is null or f.sha256 is null or lower(co.final_file_sha256)<>lower(f.sha256)
    );

  select count(*) into completed_project_cycle_mismatch
  from tune_projects p
  left join tune_cycles c on c.id=p.current_cycle_id
  where p.closed_at is not null and (c.id is null or c.status<>'completed');

  select count(*) into archived_logs_still_queued
  from logs l
  join tune_projects p on p.id=l.project_id
  where l.status in ('ready','needs_review') and l.cycle_id is distinct from p.current_cycle_id;

  select count(*) into overdue_followups
  from lifecycle_followups
  where status='scheduled' and due_at<now();

  select count(*) into sent_email_without_approval
  from outbound_actions
  where status='sent' and approved_at is null;

  return jsonb_build_object(
    'projectsMissingCurrentCycle',projects_missing_current_cycle,
    'projectCycleOwnerMismatch',project_cycle_owner_mismatch,
    'multipleActiveCycles',multiple_active_cycles,
    'orphanCycleRecords',orphan_cycle_records,
    'customerVisibleUnreleasedTunes',customer_visible_unreleased_tunes,
    'releasedDeliveryFileMismatch',released_delivery_file_mismatch,
    'closedCloseoutFileMismatch',closed_closeout_file_mismatch,
    'completedProjectCycleMismatch',completed_project_cycle_mismatch,
    'archivedLogsStillQueued',archived_logs_still_queued,
    'overdueFollowups',overdue_followups,
    'sentEmailWithoutApproval',sent_email_without_approval,
    'checkedAt',now()
  );
end;
$$;

revoke all on function subpar_operational_integrity_snapshot() from public;
revoke all on function subpar_operational_integrity_snapshot() from anon;
revoke all on function subpar_operational_integrity_snapshot() from authenticated;

insert into schema_migrations(version,name) values ('0015','activation_readiness') on conflict(version) do nothing;

insert into setup_checkpoints(checkpoint_key,status,detail)
values
  ('activation_integrity','pending','Run the operational integrity snapshot and resolve every blocker before live cutover.'),
  ('synthetic_end_to_end','pending','Run the synthetic end-to-end smoke suite across intake, review, delivery, closeout and retune.'),
  ('provider_preflight','pending','Verify Supabase/storage/Wix/Gmail connectivity with writes and provider send still gated.'),
  ('production_activation','pending','Final owner approval after migrations, identity, storage, imports, provider cutovers and integrity audit are green.')
on conflict(checkpoint_key) do nothing;

update setup_checkpoints set detail='Migrations 0001–0015 define the current Subpar schema.',updated_at=now() where checkpoint_key='database_schema';

comment on table activation_audit_runs is 'Non-secret production-readiness audit history. Records status and summary only.';
comment on table activation_audit_checks is 'Per-check production-readiness evidence linked to an activation audit run.';
comment on function subpar_operational_integrity_snapshot() is 'Service-role-only read probe for cross-cycle, tune-file, delivery, closeout and outbound-email invariants.';
