-- Subpar OS revision delivery loop
-- Apply after 0012_log_review_workflow.sql.
-- Closes review -> revision -> QA -> approval -> delivery -> acknowledgement -> next-log handoff.

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

-- Atomic release: the exact QA-pinned file, revision, project and delivery ledger advance together.
-- The server re-hashes the object immediately before calling this RPC and passes the observed digest.
create or replace function subpar_release_revision_delivery(p_delivery_id uuid, p_actor text, p_observed_sha256 text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  delivery_row revision_deliveries%rowtype;
  revision_row revisions%rowtype;
  project_row tune_projects%rowtype;
  file_row files%rowtype;
  now_ts timestamptz := now();
  next_action_text text;
begin
  select * into delivery_row from revision_deliveries where id=p_delivery_id for update;
  if delivery_row.id is null then raise exception 'Revision delivery not found'; end if;

  if delivery_row.status in ('delivered','acknowledged','relog_requested','closed') then
    return jsonb_build_object('replayed',true,'deliveryId',delivery_row.id,'status',delivery_row.status,'projectId',delivery_row.project_id,'revisionId',delivery_row.revision_id,'fileId',delivery_row.primary_file_id);
  end if;
  if delivery_row.status <> 'approved' then raise exception 'Revision delivery must be approved before release'; end if;
  if delivery_row.primary_file_id is null then raise exception 'Approved delivery has no pinned tune artifact'; end if;
  if delivery_row.file_sha256 is null or delivery_row.file_sha256 = '' then raise exception 'Approved delivery is missing its QA file hash'; end if;
  if p_observed_sha256 is null or p_observed_sha256 = '' or lower(p_observed_sha256) <> lower(delivery_row.file_sha256) then raise exception 'Tune artifact hash changed after QA approval'; end if;

  select * into revision_row from revisions where id=delivery_row.revision_id for update;
  if revision_row.id is null then raise exception 'Revision not found'; end if;
  if revision_row.status <> 'ready' then raise exception 'Revision is not in ready state'; end if;

  select * into project_row from tune_projects where id=delivery_row.project_id for update;
  if project_row.id is null then raise exception 'Project not found'; end if;

  select * into file_row from files where id=delivery_row.primary_file_id for update;
  if file_row.id is null then raise exception 'Pinned tune artifact not found'; end if;
  if file_row.project_id <> delivery_row.project_id or file_row.revision_id <> delivery_row.revision_id or file_row.kind <> 'tune_revision' then raise exception 'Pinned file does not belong to this project/revision'; end if;
  if file_row.immutable is not true then raise exception 'Pinned tune artifact must be immutable'; end if;
  if file_row.visibility <> 'internal' then raise exception 'Tune artifact must still be internal immediately before release'; end if;
  if file_row.sha256 is null or lower(file_row.sha256) <> lower(delivery_row.file_sha256) then raise exception 'Registered tune artifact hash does not match QA approval'; end if;

  if delivery_row.next_step='request_log' then
    next_action_text := 'Install Rev '||revision_row.revision_number::text||' and upload the next log';
  elsif delivery_row.next_step='feedback_only' then
    next_action_text := 'Install Rev '||revision_row.revision_number::text||' and send feedback';
  else
    next_action_text := 'Confirm Rev '||revision_row.revision_number::text||' installation';
  end if;

  update files set visibility='customer' where id=file_row.id;
  update revisions set status='delivered',customer_summary=delivery_row.customer_summary,published_at=now_ts,updated_at=now_ts where id=revision_row.id;
  update tune_projects set current_revision_number=revision_row.revision_number,status='revision_delivered',stage='revision',waiting_on='customer',next_action=next_action_text,customer_visible_status='Rev '||revision_row.revision_number::text||' delivered',updated_at=now_ts where id=project_row.id;
  update revision_deliveries set status='delivered',delivered_by=p_actor,delivered_at=now_ts,updated_at=now_ts where id=delivery_row.id returning * into delivery_row;

  insert into events(project_id,customer_id,vehicle_id,event_type,actor_type,actor_id,visibility,payload,idempotency_key)
  values(project_row.id,project_row.customer_id,project_row.vehicle_id,'revision.delivered','internal',p_actor,'both',jsonb_build_object('title','Rev '||revision_row.revision_number::text||' delivered','revisionId',revision_row.id,'revisionNumber',revision_row.revision_number,'deliveryId',delivery_row.id,'fileId',file_row.id,'nextStep',delivery_row.next_step),'revision-delivered:'||revision_row.id::text)
  on conflict(idempotency_key) do nothing;

  return jsonb_build_object('replayed',false,'deliveryId',delivery_row.id,'status',delivery_row.status,'projectId',project_row.id,'revisionId',revision_row.id,'revisionNumber',revision_row.revision_number,'fileId',file_row.id,'nextStep',delivery_row.next_step,'nextAction',next_action_text,'deliveredAt',delivery_row.delivered_at);
end;
$$;

revoke all on function subpar_release_revision_delivery(uuid,text,text) from public;
revoke all on function subpar_release_revision_delivery(uuid,text,text) from anon;
revoke all on function subpar_release_revision_delivery(uuid,text,text) from authenticated;

-- Customer acknowledgement and all mutations are server-brokered. Browser writes remain closed.
insert into schema_migrations(version,name) values ('0013','revision_delivery_loop') on conflict(version) do nothing;
insert into setup_checkpoints(checkpoint_key,status,detail) values ('revision_delivery_loop','pending','Validate review -> revision file -> QA hash -> approval -> atomic portal release -> Gmail draft -> customer acknowledgement -> private next-log upload -> parser -> Review Cockpit return.') on conflict(checkpoint_key) do nothing;
update setup_checkpoints set detail='Migrations 0001–0013 define the current Subpar schema.',updated_at=now() where checkpoint_key='database_schema';

comment on table revision_deliveries is 'Server-brokered delivery state for one revision. Customer visibility is unlocked only after tuner approval and atomic release.';
comment on column revision_deliveries.qa_snapshot is 'Immutable-at-approval snapshot of delivery gates, project context and revision/file checks.';
comment on column revision_deliveries.file_sha256 is 'SHA-256 of the private tune artifact calculated by Subpar OS during QA and rechecked at release.';