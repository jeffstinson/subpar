-- Subpar OS tune lifecycle / closeout / retune cycles
-- Apply after 0013_revision_delivery_loop.sql.
-- Keeps one permanent project/vehicle history while separating future retunes into explicit cycles.

create table if not exists tune_cycles (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references tune_projects(id) on delete cascade,
  cycle_number integer not null check (cycle_number > 0),
  status text not null default 'active' check (status in ('active','closing','completed')),
  reason text not null default 'initial',
  change_summary text,
  hardware_snapshot jsonb not null default '{}'::jsonb,
  fuel_target text,
  reopened_from_cycle_id uuid references tune_cycles(id) on delete set null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_by text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id,cycle_number)
);

alter table tune_projects add column if not exists current_cycle_id uuid references tune_cycles(id) on delete set null;

-- Every existing project becomes Cycle 1. Closed projects remain historical/completed.
insert into tune_cycles(project_id,cycle_number,status,reason,fuel_target,started_at,completed_at,created_by,metadata)
select p.id,1,case when p.closed_at is null then 'active' else 'completed' end,'initial',p.fuel_target,p.created_at,p.closed_at,'Subpar migration',jsonb_build_object('backfilled',true)
from tune_projects p
where not exists (select 1 from tune_cycles c where c.project_id=p.id and c.cycle_number=1);

update tune_projects p
set current_cycle_id=c.id
from tune_cycles c
where c.project_id=p.id and c.cycle_number=1 and p.current_cycle_id is null;

-- Cycle ownership on the records that make up a calibration history.
alter table project_requirements add column if not exists cycle_id uuid references tune_cycles(id) on delete set null;
alter table revisions add column if not exists cycle_id uuid references tune_cycles(id) on delete set null;
alter table logs add column if not exists cycle_id uuid references tune_cycles(id) on delete set null;
alter table files add column if not exists cycle_id uuid references tune_cycles(id) on delete set null;
alter table events add column if not exists cycle_id uuid references tune_cycles(id) on delete set null;
alter table log_review_sessions add column if not exists cycle_id uuid references tune_cycles(id) on delete set null;
alter table revision_deliveries add column if not exists cycle_id uuid references tune_cycles(id) on delete set null;

update project_requirements r set cycle_id=p.current_cycle_id from tune_projects p where r.project_id=p.id and r.cycle_id is null;
update revisions r set cycle_id=p.current_cycle_id from tune_projects p where r.project_id=p.id and r.cycle_id is null;
update logs r set cycle_id=p.current_cycle_id from tune_projects p where r.project_id=p.id and r.cycle_id is null;
update files r set cycle_id=p.current_cycle_id from tune_projects p where r.project_id=p.id and r.cycle_id is null;
update events r set cycle_id=p.current_cycle_id from tune_projects p where r.project_id=p.id and r.cycle_id is null;
update log_review_sessions r set cycle_id=p.current_cycle_id from tune_projects p where r.project_id=p.id and r.cycle_id is null;
update revision_deliveries r set cycle_id=p.current_cycle_id from tune_projects p where r.project_id=p.id and r.cycle_id is null;

create or replace function subpar_assign_current_cycle()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if new.cycle_id is null and new.project_id is not null then
    select current_cycle_id into new.cycle_id from tune_projects where id=new.project_id;
  end if;
  return new;
end;
$$;

-- Backward-compatible guardrail: old writers automatically attach new records to the active cycle.
do $$
declare
  t text;
begin
  foreach t in array array['project_requirements','revisions','logs','files','events','log_review_sessions','revision_deliveries'] loop
    execute format('drop trigger if exists subpar_assign_cycle on %I',t);
    execute format('create trigger subpar_assign_cycle before insert on %I for each row execute function subpar_assign_current_cycle()',t);
  end loop;
end $$;

create index if not exists idx_tune_cycles_project on tune_cycles(project_id,cycle_number desc);
create index if not exists idx_requirements_cycle on project_requirements(cycle_id,created_at);
create index if not exists idx_revisions_cycle on revisions(cycle_id,revision_number);
create index if not exists idx_logs_cycle on logs(cycle_id,uploaded_at desc);
create index if not exists idx_files_cycle on files(cycle_id,created_at desc);
create index if not exists idx_events_cycle on events(cycle_id,created_at desc);

create table if not exists project_closeouts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references tune_projects(id) on delete cascade,
  cycle_id uuid not null references tune_cycles(id) on delete restrict,
  final_revision_id uuid not null references revisions(id) on delete restrict,
  final_file_id uuid not null references files(id) on delete restrict,
  final_delivery_id uuid references revision_deliveries(id) on delete set null,
  outbound_action_id uuid references outbound_actions(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','qa_ready','approved','closed')),
  customer_summary text,
  aftercare_notes text,
  baseline_snapshot jsonb not null default '{}'::jsonb,
  package_manifest jsonb not null default '{}'::jsonb,
  qa_snapshot jsonb not null default '{}'::jsonb,
  final_file_sha256 text,
  followup_days integer not null default 7 check (followup_days between 0 and 90),
  approved_by text,
  approved_at timestamptz,
  closed_by text,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(cycle_id)
);

create table if not exists lifecycle_followups (
  id uuid primary key default gen_random_uuid(),
  closeout_id uuid not null references project_closeouts(id) on delete cascade,
  project_id uuid not null references tune_projects(id) on delete cascade,
  cycle_id uuid not null references tune_cycles(id) on delete restrict,
  customer_id uuid not null references customers(id) on delete cascade,
  due_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled','drafted','sent','skipped','canceled','failed')),
  outbound_action_id uuid references outbound_actions(id) on delete set null,
  last_error text,
  drafted_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(closeout_id)
);

create index if not exists idx_closeouts_project on project_closeouts(project_id,created_at desc);
create index if not exists idx_closeouts_status on project_closeouts(status,updated_at desc);
create index if not exists idx_followups_due on lifecycle_followups(status,due_at);

alter table tune_cycles enable row level security;
alter table project_closeouts enable row level security;
alter table lifecycle_followups enable row level security;

drop policy if exists "internal read tune cycles" on tune_cycles;
create policy "internal read tune cycles" on tune_cycles for select to authenticated using (subpar_is_internal());
drop policy if exists "internal read project closeouts" on project_closeouts;
create policy "internal read project closeouts" on project_closeouts for select to authenticated using (subpar_is_internal());
drop policy if exists "internal read lifecycle followups" on lifecycle_followups;
create policy "internal read lifecycle followups" on lifecycle_followups for select to authenticated using (subpar_is_internal());

-- Atomic closeout: final revision, delivery, cycle and active project all advance together.
create or replace function subpar_close_tune_cycle(p_closeout_id uuid,p_actor text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  co project_closeouts%rowtype;
  cyc tune_cycles%rowtype;
  proj tune_projects%rowtype;
  rev revisions%rowtype;
  f files%rowtype;
  del revision_deliveries%rowtype;
  now_ts timestamptz := now();
  followup_id uuid;
begin
  select * into co from project_closeouts where id=p_closeout_id for update;
  if co.id is null then raise exception 'Closeout not found'; end if;
  if co.status='closed' then
    return jsonb_build_object('replayed',true,'closeoutId',co.id,'projectId',co.project_id,'cycleId',co.cycle_id,'closedAt',co.closed_at);
  end if;
  if co.status<>'approved' then raise exception 'Closeout must be approved before completion'; end if;

  select * into cyc from tune_cycles where id=co.cycle_id for update;
  select * into proj from tune_projects where id=co.project_id for update;
  select * into rev from revisions where id=co.final_revision_id for update;
  select * into f from files where id=co.final_file_id for update;
  if cyc.id is null or proj.id is null or rev.id is null or f.id is null then raise exception 'Closeout references are incomplete'; end if;
  if cyc.project_id<>proj.id or rev.project_id<>proj.id or f.project_id<>proj.id then raise exception 'Closeout references cross project boundaries'; end if;
  if rev.cycle_id is distinct from cyc.id or f.cycle_id is distinct from cyc.id then raise exception 'Final revision/file do not belong to the closeout cycle'; end if;
  if rev.status not in ('delivered','final') then raise exception 'Final revision must already be delivered'; end if;
  if f.kind<>'tune_revision' or f.visibility<>'customer' or f.immutable is not true then raise exception 'Final tune artifact must be immutable and customer-visible'; end if;
  if co.final_file_sha256 is null or f.sha256 is null or lower(co.final_file_sha256)<>lower(f.sha256) then raise exception 'Final tune artifact hash does not match closeout QA'; end if;

  if co.final_delivery_id is not null then
    select * into del from revision_deliveries where id=co.final_delivery_id for update;
    if del.id is null or del.revision_id<>rev.id or del.primary_file_id<>f.id then raise exception 'Final delivery does not match approved revision/file'; end if;
    if del.status not in ('delivered','acknowledged','relog_requested','closed') then raise exception 'Final delivery is not complete enough for closeout'; end if;
    update revision_deliveries set status='closed',updated_at=now_ts where id=del.id;
  end if;

  update revisions set status='final',updated_at=now_ts where id=rev.id;
  update tune_cycles set status='completed',completed_at=now_ts,updated_at=now_ts where id=cyc.id;
  update tune_projects set status='completed',stage='complete',waiting_on='none',next_action=null,customer_visible_status='Tune complete',closed_at=now_ts,updated_at=now_ts where id=proj.id;
  update project_closeouts set status='closed',closed_by=p_actor,closed_at=now_ts,updated_at=now_ts where id=co.id returning * into co;

  if co.followup_days>0 then
    insert into lifecycle_followups(closeout_id,project_id,cycle_id,customer_id,due_at,status)
    values(co.id,proj.id,cyc.id,proj.customer_id,now_ts + make_interval(days=>co.followup_days),'scheduled')
    on conflict(closeout_id) do update set due_at=excluded.due_at,updated_at=now_ts
    returning id into followup_id;
  end if;

  insert into events(project_id,customer_id,vehicle_id,cycle_id,event_type,actor_type,actor_id,visibility,payload,idempotency_key)
  values(proj.id,proj.customer_id,proj.vehicle_id,cyc.id,'project.closeout.completed','internal',p_actor,'both',jsonb_build_object('title','Tune completed','closeoutId',co.id,'cycleNumber',cyc.cycle_number,'finalRevisionNumber',rev.revision_number,'finalFileId',f.id,'followupId',followup_id),'project-closeout:'||co.id::text)
  on conflict(idempotency_key) do nothing;

  return jsonb_build_object('replayed',false,'closeoutId',co.id,'projectId',proj.id,'cycleId',cyc.id,'cycleNumber',cyc.cycle_number,'finalRevisionNumber',rev.revision_number,'followupId',followup_id,'closedAt',co.closed_at);
end;
$$;

-- Start a new tuning cycle on the same project/vehicle without deleting or renumbering old history.
create or replace function subpar_start_new_tune_cycle(p_project_id uuid,p_reason text,p_change_summary text,p_hardware_changes jsonb,p_fuel_target text,p_actor text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  proj tune_projects%rowtype;
  prior tune_cycles%rowtype;
  new_cycle tune_cycles%rowtype;
  next_number integer;
  now_ts timestamptz := now();
begin
  select * into proj from tune_projects where id=p_project_id for update;
  if proj.id is null then raise exception 'Project not found'; end if;
  if proj.closed_at is null then raise exception 'Only a completed project can start a new tune cycle'; end if;
  if proj.current_cycle_id is not null then select * into prior from tune_cycles where id=proj.current_cycle_id; end if;
  select coalesce(max(cycle_number),0)+1 into next_number from tune_cycles where project_id=proj.id;

  insert into tune_cycles(project_id,cycle_number,status,reason,change_summary,hardware_snapshot,fuel_target,reopened_from_cycle_id,started_at,created_by,metadata)
  values(proj.id,next_number,'active',coalesce(nullif(trim(p_reason),''),'retune'),nullif(trim(p_change_summary),''),coalesce(p_hardware_changes,'{}'::jsonb),coalesce(nullif(trim(p_fuel_target),''),proj.fuel_target),prior.id,now_ts,p_actor,jsonb_build_object('source','lifecycle_reopen'))
  returning * into new_cycle;

  update tune_projects set current_cycle_id=new_cycle.id,fuel_target=coalesce(nullif(trim(p_fuel_target),''),fuel_target),status='retune_intake',stage='compatibility_review',waiting_on='tuner',next_action='Review Cycle '||next_number::text||' hardware/fuel changes',customer_visible_status='Retune review in progress',closed_at=null,updated_at=now_ts where id=proj.id;

  insert into project_requirements(project_id,cycle_id,requirement_type,label,status,customer_visible,required,metadata)
  values
    (proj.id,new_cycle.id,'cycle_change_review','Review hardware / fuel changes','pending',false,true,jsonb_build_object('cycleNumber',next_number)),
    (proj.id,new_cycle.id,'platform_compatibility','Re-confirm platform / flash compatibility','pending',false,true,jsonb_build_object('cycleNumber',next_number)),
    (proj.id,new_cycle.id,'logging_setup','Re-confirm logging setup / parameter pack','pending',true,true,jsonb_build_object('cycleNumber',next_number));

  if nullif(trim(p_fuel_target),'') is not null and lower(trim(p_fuel_target))<>lower(coalesce(proj.fuel_target,'')) then
    insert into project_requirements(project_id,cycle_id,requirement_type,label,status,customer_visible,required,metadata)
    values(proj.id,new_cycle.id,'fuel_verification','Verify new fuel target / ethanol content','pending',true,true,jsonb_build_object('cycleNumber',next_number,'fuelTarget',p_fuel_target));
  end if;

  insert into events(project_id,customer_id,vehicle_id,cycle_id,event_type,actor_type,actor_id,visibility,payload,idempotency_key)
  values(proj.id,proj.customer_id,proj.vehicle_id,new_cycle.id,'tune_cycle.started','internal',p_actor,'both',jsonb_build_object('title','Tune Cycle '||next_number::text||' started','cycleNumber',next_number,'reason',new_cycle.reason,'changeSummary',new_cycle.change_summary,'fuelTarget',new_cycle.fuel_target,'reopenedFromCycleId',prior.id),'tune-cycle-started:'||new_cycle.id::text)
  on conflict(idempotency_key) do nothing;

  return jsonb_build_object('projectId',proj.id,'cycleId',new_cycle.id,'cycleNumber',next_number,'reason',new_cycle.reason,'fuelTarget',new_cycle.fuel_target,'reopenedFromCycleId',prior.id,'nextAction','Review Cycle '||next_number::text||' hardware/fuel changes');
end;
$$;

revoke all on function subpar_assign_current_cycle() from public;
revoke all on function subpar_close_tune_cycle(uuid,text) from public;
revoke all on function subpar_close_tune_cycle(uuid,text) from anon;
revoke all on function subpar_close_tune_cycle(uuid,text) from authenticated;
revoke all on function subpar_start_new_tune_cycle(uuid,text,text,jsonb,text,text) from public;
revoke all on function subpar_start_new_tune_cycle(uuid,text,text,jsonb,text,text) from anon;
revoke all on function subpar_start_new_tune_cycle(uuid,text,text,jsonb,text,text) from authenticated;

insert into schema_migrations(version,name) values ('0014','tune_lifecycle_closeout') on conflict(version) do nothing;
insert into setup_checkpoints(checkpoint_key,status,detail) values ('tune_lifecycle_closeout','pending','Validate final package QA -> approved closeout -> atomic archive -> 7-day follow-up draft -> new retune cycle without losing prior revisions/logs/files.') on conflict(checkpoint_key) do nothing;
update setup_checkpoints set detail='Migrations 0001–0014 define the current Subpar schema.',updated_at=now() where checkpoint_key='database_schema';

comment on table tune_cycles is 'Permanent tuning-cycle boundaries inside one customer/vehicle project. New retunes never overwrite old revision/log history.';
comment on table project_closeouts is 'Approved final-package and baseline snapshot for one completed tune cycle.';
comment on table lifecycle_followups is 'Post-closeout follow-up queue. Provider sends remain approval-gated through outbound_actions.';