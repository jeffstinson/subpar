-- Subpar OS customer intake activation
-- Apply after 0007_provisioning_state.sql.
-- Adds secure magic-link intake access and an atomic reviewed-intake -> vehicle/project activation.

alter table intake_requests
  add column if not exists submitted_at timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by text,
  add column if not exists compatibility_status text not null default 'pending',
  add column if not exists compatibility_notes text,
  add column if not exists customer_notes text;

do $$ begin
  alter table intake_requests add constraint intake_compatibility_status_check
    check (compatibility_status in ('pending','compatible','review','blocked'));
exception when duplicate_object then null;
end $$;

create table if not exists intake_access_tokens (
  id uuid primary key default gen_random_uuid(),
  intake_request_id uuid not null references intake_requests(id) on delete cascade,
  token_hash text not null unique,
  purpose text not null default 'customer_intake' check (purpose in ('customer_intake')),
  expires_at timestamptz not null,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists idx_intake_access_active on intake_access_tokens(intake_request_id, expires_at desc);

alter table intake_access_tokens enable row level security;
-- No authenticated-browser policies on token records. Token verification is server/service-role only.

create sequence if not exists subpar_project_number_seq start with 2000 increment by 1;

create or replace function subpar_next_project_number()
returns text
language sql
security definer
set search_path = public
as $$
  select 'SP-' || nextval('subpar_project_number_seq')::text;
$$;

revoke all on function subpar_next_project_number() from public;
revoke all on function subpar_next_project_number() from anon;
revoke all on function subpar_next_project_number() from authenticated;

create or replace function subpar_activate_intake(p_intake_id uuid, p_reviewer text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  intake_row intake_requests%rowtype;
  vehicle_row vehicles%rowtype;
  project_row tune_projects%rowtype;
  payload jsonb;
  project_number text;
begin
  select * into intake_row from intake_requests where id = p_intake_id for update;
  if not found then raise exception 'Intake request not found'; end if;
  if intake_row.project_id is not null or intake_row.status = 'converted' then
    select * into project_row from tune_projects where id = intake_row.project_id;
    return jsonb_build_object('replayed',true,'projectId',project_row.id,'projectNumber',project_row.project_number,'vehicleId',project_row.vehicle_id);
  end if;
  if intake_row.status <> 'ready' then raise exception 'Intake must be ready before activation'; end if;
  if intake_row.compatibility_status <> 'compatible' then raise exception 'Compatibility must be approved before activation'; end if;

  payload := coalesce(intake_row.vehicle_payload,'{}'::jsonb);
  if coalesce(payload->>'make','') = '' or coalesce(payload->>'model','') = '' or coalesce(payload->>'engine','') = '' then
    raise exception 'Vehicle make, model and engine are required';
  end if;
  if coalesce(intake_row.platform,payload->>'platform','') = '' then raise exception 'Tuning platform is required'; end if;

  insert into vehicles(customer_id,year,make,model,chassis,engine,vin,transmission,current_fuel,hardware,notes)
  values(
    intake_row.customer_id,
    nullif(payload->>'year','')::integer,
    payload->>'make',payload->>'model',nullif(payload->>'chassis',''),payload->>'engine',nullif(payload->>'vin',''),
    nullif(payload->>'transmission',''),nullif(payload->>'fuel',''),coalesce(payload->'hardware','{}'::jsonb),nullif(payload->>'notes','')
  ) returning * into vehicle_row;

  update orders set vehicle_id=vehicle_row.id, updated_at=now() where id=intake_row.order_id;
  project_number := subpar_next_project_number();

  insert into tune_projects(project_number,customer_id,vehicle_id,order_id,platform,fuel_target,status,stage,priority,waiting_on,next_action,current_revision_number,customer_visible_status,metadata)
  values(
    project_number,intake_row.customer_id,vehicle_row.id,intake_row.order_id,
    coalesce(intake_row.platform,payload->>'platform'),nullif(payload->>'fuel',''),'new_order','intake','normal','system',
    'Prepare platform prerequisites and baseline instructions',0,'Vehicle intake approved',jsonb_build_object('activatedFromIntake',intake_row.id)
  ) returning * into project_row;

  insert into project_requirements(project_id,requirement_type,label,status,customer_visible,required,completed_at,metadata)
  values(project_row.id,'vehicle_intake','Vehicle intake','complete',true,true,now(),jsonb_build_object('intakeRequestId',intake_row.id));

  if lower(project_row.platform)='mhd' then
    insert into project_requirements(project_id,requirement_type,label,status,customer_visible,required,metadata)
    values(project_row.id,'stock_file','MHD stock file','pending',true,true,'{}'::jsonb),
          (project_row.id,'baseline_log','Baseline datalog','pending',true,true,'{}'::jsonb);
  else
    insert into project_requirements(project_id,requirement_type,label,status,customer_visible,required,metadata)
    values(project_row.id,'baseline_log','Baseline datalog','pending',true,true,'{}'::jsonb);
  end if;

  update intake_requests set project_id=project_row.id,status='converted',reviewed_at=now(),reviewed_by=p_reviewer,updated_at=now() where id=intake_row.id;
  update intake_access_tokens set revoked_at=now() where intake_request_id=intake_row.id and revoked_at is null;

  insert into events(project_id,customer_id,vehicle_id,event_type,actor_type,actor_id,visibility,payload,idempotency_key)
  values(project_row.id,intake_row.customer_id,vehicle_row.id,'intake.project.activated','internal',p_reviewer,'internal',jsonb_build_object('intakeRequestId',intake_row.id,'orderId',intake_row.order_id), 'intake-activate:'||intake_row.id::text)
  on conflict(idempotency_key) do nothing;

  return jsonb_build_object('replayed',false,'projectId',project_row.id,'projectNumber',project_row.project_number,'vehicleId',vehicle_row.id);
end;
$$;

revoke all on function subpar_activate_intake(uuid,text) from public;
revoke all on function subpar_activate_intake(uuid,text) from anon;
revoke all on function subpar_activate_intake(uuid,text) from authenticated;

comment on table intake_access_tokens is 'Server-only hashes for expiring customer intake magic links. Raw tokens are never persisted.';
comment on function subpar_next_project_number() is 'Service-role project-number allocator used only after reviewed intake activation.';
comment on function subpar_activate_intake(uuid,text) is 'Atomic service-role conversion of an approved paid-order intake into vehicle, tune project, requirements and audit history.';
