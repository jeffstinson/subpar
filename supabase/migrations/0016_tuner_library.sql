-- Subpar OS tuner-owned configuration library
-- Ordered as 0016 to resolve an earlier duplicate 0011 migration number.
-- Logically depends on 0010_vehicle_platform_intelligence.sql and is safe to apply after 0015.
-- Gives Doug versioned draft/review/publish control over logging recipes, parameter packs and workflow profiles.

create table if not exists tuner_library_revisions (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('logging_recipe','parameter_pack','workflow_profile')),
  entity_key text not null,
  revision_number integer not null check (revision_number > 0),
  status text not null default 'draft' check (status in ('draft','review','approved','retired','canceled')),
  snapshot jsonb not null default '{}'::jsonb,
  change_summary text,
  created_by text,
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(entity_type,entity_key,revision_number)
);

create table if not exists tuner_library_assets (
  id uuid primary key default gen_random_uuid(),
  library_revision_id uuid not null references tuner_library_revisions(id) on delete restrict,
  entity_type text not null check (entity_type in ('parameter_pack','logging_recipe')),
  entity_key text not null,
  storage_bucket text not null,
  storage_path text not null,
  original_name text not null,
  mime_type text,
  size_bytes bigint,
  checksum_sha256 text,
  customer_visible boolean not null default true,
  immutable boolean not null default true,
  created_by text,
  created_at timestamptz not null default now(),
  unique(storage_bucket,storage_path)
);

create table if not exists tuner_library_audit (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_key text not null,
  library_revision_id uuid references tuner_library_revisions(id) on delete set null,
  action text not null check (action in ('draft_created','draft_updated','submitted_for_review','published','retired','asset_attached','canceled')),
  actor text,
  detail text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_library_revision_entity on tuner_library_revisions(entity_type,entity_key,revision_number desc);
create index if not exists idx_library_revision_status on tuner_library_revisions(status,updated_at desc);
create index if not exists idx_library_assets_entity on tuner_library_assets(entity_type,entity_key,created_at desc);
create index if not exists idx_library_audit_entity on tuner_library_audit(entity_type,entity_key,created_at desc);

alter table tuner_library_revisions enable row level security;
alter table tuner_library_assets enable row level security;
alter table tuner_library_audit enable row level security;

drop policy if exists "internal read tuner library revisions" on tuner_library_revisions;
create policy "internal read tuner library revisions" on tuner_library_revisions for select to authenticated using (subpar_is_internal());
drop policy if exists "internal read tuner library assets" on tuner_library_assets;
create policy "internal read tuner library assets" on tuner_library_assets for select to authenticated using (subpar_is_internal());
drop policy if exists "internal read tuner library audit" on tuner_library_audit;
create policy "internal read tuner library audit" on tuner_library_audit for select to authenticated using (subpar_is_internal());

create or replace function subpar_publish_tuner_library_revision(p_revision_id uuid,p_actor text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  rev tuner_library_revisions%rowtype;
  snap jsonb;
begin
  select * into rev from tuner_library_revisions where id=p_revision_id for update;
  if not found then raise exception 'Library revision not found'; end if;
  if rev.status='approved' then return jsonb_build_object('replayed',true,'entityType',rev.entity_type,'entityKey',rev.entity_key,'revisionNumber',rev.revision_number); end if;
  if rev.status not in ('draft','review') then raise exception 'Library revision cannot be published from status %',rev.status; end if;
  snap:=coalesce(rev.snapshot,'{}'::jsonb);

  if rev.entity_type='logging_recipe' then
    if coalesce(snap->>'platform','')='' or coalesce(snap->>'engineFamily','')='' or coalesce(snap->>'title','')='' then raise exception 'Logging recipe requires platform, engineFamily and title'; end if;
    insert into logging_recipes(recipe_key,platform,engine_family,chassis_scope,title,version,channel_groups,customer_instructions,tuner_notes,active,updated_at)
    values(rev.entity_key,snap->>'platform',snap->>'engineFamily',coalesce(array(select jsonb_array_elements_text(coalesce(snap->'chassisScope','[]'::jsonb))),array[]::text[]),snap->>'title',rev.revision_number,coalesce(snap->'channelGroups','[]'::jsonb),nullif(snap->>'customerInstructions',''),nullif(snap->>'tunerNotes',''),coalesce((snap->>'active')::boolean,true),now())
    on conflict(recipe_key) do update set platform=excluded.platform,engine_family=excluded.engine_family,chassis_scope=excluded.chassis_scope,title=excluded.title,version=excluded.version,channel_groups=excluded.channel_groups,customer_instructions=excluded.customer_instructions,tuner_notes=excluded.tuner_notes,active=excluded.active,updated_at=now();
  elsif rev.entity_type='parameter_pack' then
    if coalesce(snap->>'platform','')='' or coalesce(snap->>'engineFamily','')='' or coalesce(snap->>'title','')='' then raise exception 'Parameter pack requires platform, engineFamily and title'; end if;
    insert into parameter_pack_profiles(pack_key,platform,engine_family,chassis_scope,title,version_label,production_ready,customer_visible,notes,metadata,updated_at)
    values(rev.entity_key,snap->>'platform',snap->>'engineFamily',coalesce(array(select jsonb_array_elements_text(coalesce(snap->'chassisScope','[]'::jsonb))),array[]::text[]),snap->>'title',coalesce(nullif(snap->>'versionLabel',''),('v'||rev.revision_number::text)),true,coalesce((snap->>'customerVisible')::boolean,true),nullif(snap->>'notes',''),coalesce(snap->'metadata','{}'::jsonb),now())
    on conflict(pack_key) do update set platform=excluded.platform,engine_family=excluded.engine_family,chassis_scope=excluded.chassis_scope,title=excluded.title,version_label=excluded.version_label,production_ready=true,customer_visible=excluded.customer_visible,notes=excluded.notes,metadata=excluded.metadata,updated_at=now();
  elsif rev.entity_type='workflow_profile' then
    if coalesce(snap->>'platform','')='' or coalesce(snap->>'engineFamily','')='' then raise exception 'Workflow profile requires platform and engineFamily'; end if;
    insert into platform_workflow_profiles(profile_key,platform,engine_family,chassis_scope,compatibility_state,logging_recipe_key,parameter_pack_key,requirements,automations,priority,version,active,notes,updated_at)
    values(rev.entity_key,snap->>'platform',snap->>'engineFamily',coalesce(array(select jsonb_array_elements_text(coalesce(snap->'chassisScope','[]'::jsonb))),array[]::text[]),coalesce(nullif(snap->>'compatibilityState',''),'review_required'),nullif(snap->>'loggingRecipeKey',''),nullif(snap->>'parameterPackKey',''),coalesce(snap->'requirements','[]'::jsonb),coalesce(snap->'automations','[]'::jsonb),coalesce((snap->>'priority')::integer,100),rev.revision_number,coalesce((snap->>'active')::boolean,true),nullif(snap->>'notes',''),now())
    on conflict(profile_key) do update set platform=excluded.platform,engine_family=excluded.engine_family,chassis_scope=excluded.chassis_scope,compatibility_state=excluded.compatibility_state,logging_recipe_key=excluded.logging_recipe_key,parameter_pack_key=excluded.parameter_pack_key,requirements=excluded.requirements,automations=excluded.automations,priority=excluded.priority,version=excluded.version,active=excluded.active,notes=excluded.notes,updated_at=now();
  end if;

  update tuner_library_revisions set status='retired',updated_at=now() where entity_type=rev.entity_type and entity_key=rev.entity_key and status='approved' and id<>rev.id;
  update tuner_library_revisions set status='approved',approved_by=p_actor,approved_at=now(),updated_at=now() where id=rev.id;
  insert into tuner_library_audit(entity_type,entity_key,library_revision_id,action,actor,detail,metadata)
  values(rev.entity_type,rev.entity_key,rev.id,'published',p_actor,rev.change_summary,jsonb_build_object('revisionNumber',rev.revision_number));

  return jsonb_build_object('replayed',false,'entityType',rev.entity_type,'entityKey',rev.entity_key,'revisionNumber',rev.revision_number,'status','approved');
end;
$$;

revoke all on function subpar_publish_tuner_library_revision(uuid,text) from public;
revoke all on function subpar_publish_tuner_library_revision(uuid,text) from anon;
revoke all on function subpar_publish_tuner_library_revision(uuid,text) from authenticated;
grant execute on function subpar_publish_tuner_library_revision(uuid,text) to service_role;

insert into schema_migrations(version,name) values ('0016','tuner_library') on conflict(version) do nothing;
insert into setup_checkpoints(checkpoint_key,status,detail) values ('tuner_library','pending','Create a draft, attach a private parameter-pack asset, publish it, verify regression tests still pass, and confirm existing project history remains unchanged.') on conflict(checkpoint_key) do nothing;
update setup_checkpoints set detail='Migrations 0001–0016 define the current Subpar schema.',updated_at=now() where checkpoint_key='database_schema';

comment on table tuner_library_revisions is 'Versioned draft/review/approved snapshots for Doug-owned logging recipes, parameter packs and workflow profiles.';
comment on table tuner_library_assets is 'Immutable private assets attached to a tuner library revision, stored in the dedicated parameter-pack bucket.';
comment on table tuner_library_audit is 'Append-only operator history for changes to tuner-owned configuration.';
