-- Subpar OS vehicle + platform intelligence
-- Apply after 0009_intake_handoff_queue.sql.
-- Centralizes chassis/engine/platform workflow knowledge so project activation is data-driven.

create table if not exists vehicle_catalog (
  vehicle_key text primary key,
  make text not null,
  model text not null,
  chassis text[] not null default '{}',
  year_start integer,
  year_end integer,
  engine_families text[] not null default '{}',
  tank_gallons numeric(6,2),
  aliases text[] not null default '{}',
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists logging_recipes (
  recipe_key text primary key,
  platform text not null,
  engine_family text not null,
  chassis_scope text[] not null default '{}',
  title text not null,
  version integer not null default 1,
  channel_groups jsonb not null default '[]'::jsonb,
  customer_instructions text,
  tuner_notes text,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists parameter_pack_profiles (
  pack_key text primary key,
  platform text not null,
  engine_family text not null,
  chassis_scope text[] not null default '{}',
  title text not null,
  version_label text not null default 'draft',
  production_ready boolean not null default false,
  customer_visible boolean not null default true,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists platform_workflow_profiles (
  profile_key text primary key,
  platform text not null,
  engine_family text not null,
  chassis_scope text[] not null default '{}',
  compatibility_state text not null default 'review_required' check (compatibility_state in ('workflow_ready','review_required','blocked')),
  logging_recipe_key text references logging_recipes(recipe_key) on delete set null,
  parameter_pack_key text references parameter_pack_profiles(pack_key) on delete set null,
  requirements jsonb not null default '[]'::jsonb,
  automations jsonb not null default '[]'::jsonb,
  priority integer not null default 100,
  version integer not null default 1,
  active boolean not null default true,
  notes text,
  updated_at timestamptz not null default now()
);

create index if not exists idx_vehicle_catalog_chassis on vehicle_catalog using gin(chassis);
create index if not exists idx_vehicle_catalog_engines on vehicle_catalog using gin(engine_families);
create index if not exists idx_workflow_platform_engine on platform_workflow_profiles(platform,engine_family,active,priority desc);

alter table vehicle_catalog enable row level security;
alter table logging_recipes enable row level security;
alter table parameter_pack_profiles enable row level security;
alter table platform_workflow_profiles enable row level security;

drop policy if exists "internal read vehicle catalog" on vehicle_catalog;
create policy "internal read vehicle catalog" on vehicle_catalog for select to authenticated using (subpar_is_internal());
drop policy if exists "internal read logging recipes" on logging_recipes;
create policy "internal read logging recipes" on logging_recipes for select to authenticated using (subpar_is_internal());
drop policy if exists "internal read parameter packs" on parameter_pack_profiles;
create policy "internal read parameter packs" on parameter_pack_profiles for select to authenticated using (subpar_is_internal());
drop policy if exists "internal read workflow profiles" on platform_workflow_profiles;
create policy "internal read workflow profiles" on platform_workflow_profiles for select to authenticated using (subpar_is_internal());

insert into vehicle_catalog(vehicle_key,make,model,chassis,year_start,year_end,engine_families,tank_gallons,aliases) values
('f22-m235i','BMW','M235i',array['F22','F23'],2014,2016,array['N55'],13.7,array['2 Series']),
('f22-m240i','BMW','M240i',array['F22','F23'],2017,2021,array['B58'],13.7,array['2 Series']),
('g42-m240i','BMW','M240i',array['G42'],2022,null,array['B58','B58TU'],13.7,array['2 Series']),
('f87-m2','BMW','M2',array['F87'],2016,2018,array['N55'],13.7,array['M2']),
('f87-m2c','BMW','M2 Competition',array['F87'],2019,2021,array['S55'],13.7,array['M2C','M2 CS']),
('g87-m2','BMW','M2',array['G87'],2023,null,array['S58'],13.7,array['M2']),
('f30-335i','BMW','335i',array['F30','F31'],2012,2015,array['N55'],15.8,array['3 Series']),
('f30-340i','BMW','340i',array['F30','F31'],2016,2019,array['B58'],15.8,array['3 Series']),
('g20-m340i','BMW','M340i',array['G20','G21'],2020,null,array['B58','B58TU'],15.6,array['M340','3 Series']),
('f80-m3','BMW','M3',array['F80'],2015,2018,array['S55'],15.8,array['M3']),
('g80-m3','BMW','M3',array['G80','G81'],2021,null,array['S58'],15.6,array['M3 Competition']),
('f32-440i','BMW','440i',array['F32','F33','F36'],2017,2020,array['B58'],15.8,array['4 Series']),
('g22-m440i','BMW','M440i',array['G22','G23','G26'],2021,null,array['B58','B58TU'],15.6,array['M440','4 Series']),
('f82-m4','BMW','M4',array['F82','F83'],2015,2020,array['S55'],15.8,array['M4']),
('g82-m4','BMW','M4',array['G82','G83'],2021,null,array['S58'],15.6,array['M4 Competition']),
('g01-x3m40i','BMW','X3 M40i',array['G01'],2018,2024,array['B58','B58TU'],17.2,array['X3M40']),
('f97-x3m','BMW','X3 M',array['F97'],2020,2024,array['S58'],17.2,array['X3M','X3 M Competition']),
('g05-x540i','BMW','X5 xDrive40i',array['G05'],2019,null,array['B58','B58TU'],21.9,array['X5 40i']),
('f95-x5m','BMW','X5 M',array['F95'],2020,null,array['S63TU'],21.9,array['X5M','X5 M Competition']),
('g29-z4m40i','BMW','Z4 M40i',array['G29'],2020,null,array['B58','B58TU'],13.7,array['Z4']),
('a90-supra','Toyota','GR Supra 3.0',array['A90','A91'],2020,null,array['B58','B58TU'],13.7,array['Supra','GR Supra'])
on conflict(vehicle_key) do update set make=excluded.make,model=excluded.model,chassis=excluded.chassis,year_start=excluded.year_start,year_end=excluded.year_end,engine_families=excluded.engine_families,tank_gallons=excluded.tank_gallons,aliases=excluded.aliases,updated_at=now();

insert into logging_recipes(recipe_key,platform,engine_family,title,channel_groups,customer_instructions,tuner_notes) values
('mhd-n55-v1','MHD','N55','N55 MHD baseline logging recipe','["RPM / load","boost target + actual","throttle","lambda / AFR","timing corrections","HPFP / LPFP","IAT","fuel trims","WGDC"]'::jsonb,'Use Doug''s approved logging procedure in a safe/legal environment.','Channel labels are category-level placeholders until Doug supplies his final parameter pack.'),
('mhd-b58-v1','MHD','B58','B58 MHD baseline logging recipe','["RPM / load","boost target + actual","throttle","lambda / AFR","timing corrections","rail + low-side fuel pressure","IAT","fuel trims","WGDC","ethanol content when available"]'::jsonb,'Use Doug''s approved logging procedure in a safe/legal environment.','Category-level recipe; final channel pack remains tuner-owned.'),
('mhd-b58tu-v1','MHD','B58TU','B58TU MHD baseline logging recipe','["RPM / load","boost target + actual","throttle","lambda / AFR","timing corrections","rail + low-side fuel pressure","IAT","fuel trims","WGDC","ethanol content when available"]'::jsonb,'Use Doug''s approved logging procedure in a safe/legal environment.','Category-level recipe; final channel pack remains tuner-owned.'),
('mhd-s55-v1','MHD','S55','S55 MHD baseline logging recipe','["RPM / load","boost target + actual","throttle","lambda / AFR banks","timing corrections","HPFP / LPFP","IAT","fuel trims","WGDC"]'::jsonb,'Use Doug''s approved logging procedure in a safe/legal environment.','Category-level recipe; final channel pack remains tuner-owned.'),
('mhd-s58-v1','MHD','S58','S58 MHD baseline logging recipe','["RPM / load","boost target + actual","throttle","lambda / AFR banks","timing corrections","rail + low-side fuel pressure","IAT","fuel trims","WGDC","ethanol content when available"]'::jsonb,'Use Doug''s approved logging procedure in a safe/legal environment.','Category-level recipe; final channel pack remains tuner-owned.'),
('bm3-n55-v1','BM3','N55','N55 bootmod3 baseline logging recipe','["RPM / load","boost target + actual","throttle","lambda / AFR","timing corrections","fuel pressure","IAT","fuel trims","WGDC"]'::jsonb,'Use Doug''s approved bootmod3 logging procedure in a safe/legal environment.','Category-level recipe; final checklist remains tuner-owned.'),
('bm3-b58-v1','BM3','B58','B58 bootmod3 baseline logging recipe','["RPM / load","boost target + actual","throttle","lambda / AFR","timing corrections","rail + low-side fuel pressure","IAT","fuel trims","WGDC"]'::jsonb,'Use Doug''s approved bootmod3 logging procedure in a safe/legal environment.','Category-level recipe; final checklist remains tuner-owned.'),
('bm3-b58tu-v1','BM3','B58TU','B58TU bootmod3 baseline logging recipe','["RPM / load","boost target + actual","throttle","lambda / AFR","timing corrections","rail + low-side fuel pressure","IAT","fuel trims","WGDC","ethanol content when available"]'::jsonb,'Use Doug''s approved bootmod3 logging procedure in a safe/legal environment.','Category-level recipe; final checklist remains tuner-owned.'),
('bm3-s55-v1','BM3','S55','S55 bootmod3 baseline logging recipe','["RPM / load","boost target + actual","throttle","lambda / AFR banks","timing corrections","fuel pressure","IAT","fuel trims","WGDC"]'::jsonb,'Use Doug''s approved bootmod3 logging procedure in a safe/legal environment.','Category-level recipe; final checklist remains tuner-owned.'),
('bm3-s58-v1','BM3','S58','S58 bootmod3 baseline logging recipe','["RPM / load","boost target + actual","throttle","lambda / AFR banks","timing corrections","rail + low-side fuel pressure","IAT","fuel trims","WGDC","ethanol content when available"]'::jsonb,'Use Doug''s approved bootmod3 logging procedure in a safe/legal environment.','Category-level recipe; final checklist remains tuner-owned.'),
('ecutek-b58-v1','EcuTek','B58','B58 EcuTek / ECU Connect baseline recipe','["RPM / load","boost target + actual","throttle","lambda / AFR","ignition / knock correction","fuel pressure","IAT","fuel trims"]'::jsonb,'Use Doug''s approved ECU Connect logging procedure in a safe/legal environment.','Category-level recipe; final checklist remains tuner-owned.'),
('ecutek-b58tu-v1','EcuTek','B58TU','B58TU EcuTek / ECU Connect baseline recipe','["RPM / load","boost target + actual","throttle","lambda / AFR","ignition / knock correction","rail + low-side fuel pressure","IAT","fuel trims","ethanol content when available"]'::jsonb,'Use Doug''s approved ECU Connect logging procedure in a safe/legal environment.','Category-level recipe; final checklist remains tuner-owned.'),
('ecutek-s58-v1','EcuTek','S58','S58 EcuTek / ECU Connect baseline recipe','["RPM / load","boost target + actual","throttle","lambda / AFR banks","ignition / knock correction","rail + low-side fuel pressure","IAT","fuel trims","ethanol content when available"]'::jsonb,'Use Doug''s approved ECU Connect logging procedure in a safe/legal environment.','Category-level recipe; final checklist remains tuner-owned.')
on conflict(recipe_key) do update set title=excluded.title,channel_groups=excluded.channel_groups,customer_instructions=excluded.customer_instructions,tuner_notes=excluded.tuner_notes,updated_at=now();

insert into parameter_pack_profiles(pack_key,platform,engine_family,title,version_label,production_ready,notes) values
('mhd-n55-pack','MHD','N55','N55 MHD logging parameter pack','draft',false,'Replace with Doug-approved production pack.'),
('mhd-b58-pack','MHD','B58','B58 MHD logging parameter pack','draft',false,'Replace with Doug-approved production pack.'),
('mhd-b58tu-pack','MHD','B58TU','B58TU MHD logging parameter pack','draft',false,'Replace with Doug-approved production pack.'),
('mhd-s55-pack','MHD','S55','S55 MHD logging parameter pack','draft',false,'Replace with Doug-approved production pack.'),
('mhd-s58-pack','MHD','S58','S58 MHD logging parameter pack','draft',false,'Replace with Doug-approved production pack.'),
('bm3-n55-pack','BM3','N55','N55 bootmod3 logging checklist','draft',false,'Replace with Doug-approved production checklist.'),
('bm3-b58-pack','BM3','B58','B58 bootmod3 logging checklist','draft',false,'Replace with Doug-approved production checklist.'),
('bm3-b58tu-pack','BM3','B58TU','B58TU bootmod3 logging checklist','draft',false,'Replace with Doug-approved production checklist.'),
('bm3-s55-pack','BM3','S55','S55 bootmod3 logging checklist','draft',false,'Replace with Doug-approved production checklist.'),
('bm3-s58-pack','BM3','S58','S58 bootmod3 logging checklist','draft',false,'Replace with Doug-approved production checklist.'),
('ecutek-b58-pack','EcuTek','B58','B58 ECU Connect logging checklist','draft',false,'Replace with Doug-approved production checklist.'),
('ecutek-b58tu-pack','EcuTek','B58TU','B58TU ECU Connect logging checklist','draft',false,'Replace with Doug-approved production checklist.'),
('ecutek-s58-pack','EcuTek','S58','S58 ECU Connect logging checklist','draft',false,'Replace with Doug-approved production checklist.')
on conflict(pack_key) do update set title=excluded.title,version_label=excluded.version_label,production_ready=excluded.production_ready,notes=excluded.notes,updated_at=now();

-- Requirements stay intentionally provider-centric. Exact ROM/DME eligibility is still a tuner approval gate.
insert into platform_workflow_profiles(profile_key,platform,engine_family,compatibility_state,logging_recipe_key,parameter_pack_key,requirements,automations,priority,notes) values
('mhd-n55','MHD','N55','workflow_ready','mhd-n55-v1','mhd-n55-pack','[{"type":"stock_file","label":"MHD stock file","customerVisible":true,"required":true},{"type":"logging_setup","label":"MHD logging setup","customerVisible":true,"required":true},{"type":"baseline_log","label":"Baseline datalog","customerVisible":true,"required":true}]'::jsonb,'["request_stock_file","attach_parameter_pack","request_baseline_log"]'::jsonb,100,'Workflow-ready does not guarantee ROM/DME support.'),
('mhd-b58','MHD','B58','workflow_ready','mhd-b58-v1','mhd-b58-pack','[{"type":"stock_file","label":"MHD stock file","customerVisible":true,"required":true},{"type":"logging_setup","label":"MHD logging setup","customerVisible":true,"required":true},{"type":"baseline_log","label":"Baseline datalog","customerVisible":true,"required":true}]'::jsonb,'["request_stock_file","attach_parameter_pack","request_baseline_log"]'::jsonb,100,'Workflow-ready does not guarantee ROM/DME support.'),
('mhd-b58tu','MHD','B58TU','workflow_ready','mhd-b58tu-v1','mhd-b58tu-pack','[{"type":"stock_file","label":"MHD stock file","customerVisible":true,"required":true},{"type":"logging_setup","label":"MHD logging setup","customerVisible":true,"required":true},{"type":"baseline_log","label":"Baseline datalog","customerVisible":true,"required":true}]'::jsonb,'["request_stock_file","attach_parameter_pack","request_baseline_log"]'::jsonb,100,'Workflow-ready does not guarantee ROM/DME support.'),
('mhd-s55','MHD','S55','workflow_ready','mhd-s55-v1','mhd-s55-pack','[{"type":"stock_file","label":"MHD stock file","customerVisible":true,"required":true},{"type":"logging_setup","label":"MHD logging setup","customerVisible":true,"required":true},{"type":"baseline_log","label":"Baseline datalog","customerVisible":true,"required":true}]'::jsonb,'["request_stock_file","attach_parameter_pack","request_baseline_log"]'::jsonb,100,'Workflow-ready does not guarantee ROM/DME support.'),
('mhd-s58','MHD','S58','workflow_ready','mhd-s58-v1','mhd-s58-pack','[{"type":"stock_file","label":"MHD stock file","customerVisible":true,"required":true},{"type":"logging_setup","label":"MHD logging setup","customerVisible":true,"required":true},{"type":"baseline_log","label":"Baseline datalog","customerVisible":true,"required":true}]'::jsonb,'["request_stock_file","attach_parameter_pack","request_baseline_log"]'::jsonb,100,'Workflow-ready does not guarantee ROM/DME support.'),
('bm3-n55','BM3','N55','workflow_ready','bm3-n55-v1','bm3-n55-pack','[{"type":"platform_access","label":"bootmod3 tune-request / platform access","customerVisible":true,"required":true},{"type":"logging_setup","label":"bootmod3 logging setup","customerVisible":true,"required":true},{"type":"baseline_log","label":"Baseline datalog","customerVisible":true,"required":true}]'::jsonb,'["request_platform_access","attach_parameter_pack","request_baseline_log"]'::jsonb,100,'Workflow-ready does not guarantee ROM/DME support.'),
('bm3-b58','BM3','B58','workflow_ready','bm3-b58-v1','bm3-b58-pack','[{"type":"platform_access","label":"bootmod3 tune-request / platform access","customerVisible":true,"required":true},{"type":"logging_setup","label":"bootmod3 logging setup","customerVisible":true,"required":true},{"type":"baseline_log","label":"Baseline datalog","customerVisible":true,"required":true}]'::jsonb,'["request_platform_access","attach_parameter_pack","request_baseline_log"]'::jsonb,100,'Workflow-ready does not guarantee ROM/DME support.'),
('bm3-b58tu','BM3','B58TU','workflow_ready','bm3-b58tu-v1','bm3-b58tu-pack','[{"type":"platform_access","label":"bootmod3 tune-request / platform access","customerVisible":true,"required":true},{"type":"logging_setup","label":"bootmod3 logging setup","customerVisible":true,"required":true},{"type":"baseline_log","label":"Baseline datalog","customerVisible":true,"required":true}]'::jsonb,'["request_platform_access","attach_parameter_pack","request_baseline_log"]'::jsonb,100,'Workflow-ready does not guarantee ROM/DME support.'),
('bm3-s55','BM3','S55','workflow_ready','bm3-s55-v1','bm3-s55-pack','[{"type":"platform_access","label":"bootmod3 tune-request / platform access","customerVisible":true,"required":true},{"type":"logging_setup","label":"bootmod3 logging setup","customerVisible":true,"required":true},{"type":"baseline_log","label":"Baseline datalog","customerVisible":true,"required":true}]'::jsonb,'["request_platform_access","attach_parameter_pack","request_baseline_log"]'::jsonb,100,'Workflow-ready does not guarantee ROM/DME support.'),
('bm3-s58','BM3','S58','workflow_ready','bm3-s58-v1','bm3-s58-pack','[{"type":"platform_access","label":"bootmod3 tune-request / platform access","customerVisible":true,"required":true},{"type":"logging_setup","label":"bootmod3 logging setup","customerVisible":true,"required":true},{"type":"baseline_log","label":"Baseline datalog","customerVisible":true,"required":true}]'::jsonb,'["request_platform_access","attach_parameter_pack","request_baseline_log"]'::jsonb,100,'Workflow-ready does not guarantee ROM/DME support.'),
('ecutek-b58','EcuTek','B58','workflow_ready','ecutek-b58-v1','ecutek-b58-pack','[{"type":"ecu_rom_info","label":"EcuTek ECU / ROM information","customerVisible":true,"required":true},{"type":"logging_setup","label":"ECU Connect logging setup","customerVisible":true,"required":true},{"type":"baseline_log","label":"Baseline datalog","customerVisible":true,"required":true}]'::jsonb,'["request_ecu_rom","attach_parameter_pack","request_baseline_log"]'::jsonb,100,'Workflow-ready does not guarantee ROM/DME support.'),
('ecutek-b58tu','EcuTek','B58TU','workflow_ready','ecutek-b58tu-v1','ecutek-b58tu-pack','[{"type":"ecu_rom_info","label":"EcuTek ECU / ROM information","customerVisible":true,"required":true},{"type":"logging_setup","label":"ECU Connect logging setup","customerVisible":true,"required":true},{"type":"baseline_log","label":"Baseline datalog","customerVisible":true,"required":true}]'::jsonb,'["request_ecu_rom","attach_parameter_pack","request_baseline_log"]'::jsonb,100,'Workflow-ready does not guarantee ROM/DME support.'),
('ecutek-s58','EcuTek','S58','workflow_ready','ecutek-s58-v1','ecutek-s58-pack','[{"type":"ecu_rom_info","label":"EcuTek ECU / ROM information","customerVisible":true,"required":true},{"type":"logging_setup","label":"ECU Connect logging setup","customerVisible":true,"required":true},{"type":"baseline_log","label":"Baseline datalog","customerVisible":true,"required":true}]'::jsonb,'["request_ecu_rom","attach_parameter_pack","request_baseline_log"]'::jsonb,100,'Workflow-ready does not guarantee ROM/DME support.'),
('bm3-n63tu','BM3','N63TU','review_required',null,null,'[{"type":"platform_access","label":"bootmod3 platform access / compatibility","customerVisible":true,"required":true},{"type":"baseline_log","label":"Baseline datalog","customerVisible":true,"required":true}]'::jsonb,'["manual_compatibility_review"]'::jsonb,50,'Doug must confirm exact application before project workflow is considered ready.'),
('bm3-s63tu','BM3','S63TU','review_required',null,null,'[{"type":"platform_access","label":"bootmod3 platform access / compatibility","customerVisible":true,"required":true},{"type":"baseline_log","label":"Baseline datalog","customerVisible":true,"required":true}]'::jsonb,'["manual_compatibility_review"]'::jsonb,50,'Doug must confirm exact application before project workflow is considered ready.')
on conflict(profile_key) do update set compatibility_state=excluded.compatibility_state,logging_recipe_key=excluded.logging_recipe_key,parameter_pack_key=excluded.parameter_pack_key,requirements=excluded.requirements,automations=excluded.automations,priority=excluded.priority,notes=excluded.notes,updated_at=now();

-- Rebuild project activation to resolve the intelligence profile and seed its requirements atomically.
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
  workflow_row platform_workflow_profiles%rowtype;
  payload jsonb;
  req jsonb;
  project_number text;
  engine_code text;
  platform_code text;
  chassis_code text;
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
  engine_code := upper(coalesce(payload->>'engine',''));
  platform_code := coalesce(intake_row.platform,payload->>'platform','');
  chassis_code := upper(coalesce(payload->>'chassis',''));
  if coalesce(payload->>'make','') = '' or coalesce(payload->>'model','') = '' or engine_code = '' then raise exception 'Vehicle make, model and engine are required'; end if;
  if platform_code = '' then raise exception 'Tuning platform is required'; end if;

  select * into workflow_row
  from platform_workflow_profiles
  where active=true and lower(platform)=lower(platform_code) and upper(engine_family)=engine_code
    and (cardinality(chassis_scope)=0 or chassis_code=any(chassis_scope))
  order by case when cardinality(chassis_scope)>0 then 0 else 1 end, priority desc, version desc
  limit 1;

  insert into vehicles(customer_id,year,make,model,chassis,engine,vin,transmission,current_fuel,hardware,notes)
  values(intake_row.customer_id,nullif(payload->>'year','')::integer,payload->>'make',payload->>'model',nullif(chassis_code,''),engine_code,nullif(payload->>'vin',''),nullif(payload->>'transmission',''),nullif(payload->>'fuel',''),coalesce(payload->'hardware','{}'::jsonb),nullif(payload->>'notes',''))
  returning * into vehicle_row;

  update orders set vehicle_id=vehicle_row.id,updated_at=now() where id=intake_row.order_id;
  project_number := subpar_next_project_number();

  insert into tune_projects(project_number,customer_id,vehicle_id,order_id,platform,fuel_target,status,stage,priority,waiting_on,next_action,current_revision_number,customer_visible_status,metadata)
  values(project_number,intake_row.customer_id,vehicle_row.id,intake_row.order_id,platform_code,nullif(payload->>'fuel',''),'new_order','intake','normal','system','Prepare platform prerequisites and baseline instructions',0,'Vehicle intake approved',jsonb_build_object('activatedFromIntake',intake_row.id,'intelligenceProfileKey',workflow_row.profile_key,'intelligenceState',coalesce(workflow_row.compatibility_state,'review_required'),'loggingRecipeKey',workflow_row.logging_recipe_key,'parameterPackKey',workflow_row.parameter_pack_key))
  returning * into project_row;

  insert into project_requirements(project_id,requirement_type,label,status,customer_visible,required,completed_at,metadata)
  values(project_row.id,'vehicle_intake','Vehicle intake','complete',true,true,now(),jsonb_build_object('intakeRequestId',intake_row.id));

  if chassis_code = any(array['G20','G21','G22','G23','G26','G42','G80','G81','G82','G83','G87','G01','G02','F97','F98','G05','G06','F95','F96','G29','A90','A91']) then
    insert into project_requirements(project_id,requirement_type,label,status,customer_visible,required,metadata)
    values(project_row.id,'flash_eligibility','DME / ROM flash eligibility','pending',false,true,jsonb_build_object('reason','Verify exact DME/ROM support or unlock state before calibration.'));
  end if;

  if workflow_row.profile_key is not null then
    for req in select * from jsonb_array_elements(workflow_row.requirements)
    loop
      insert into project_requirements(project_id,requirement_type,label,status,customer_visible,required,metadata)
      values(project_row.id,req->>'type',req->>'label','pending',coalesce((req->>'customerVisible')::boolean,true),coalesce((req->>'required')::boolean,true),jsonb_build_object('intelligenceProfileKey',workflow_row.profile_key))
      on conflict do nothing;
    end loop;
  else
    insert into project_requirements(project_id,requirement_type,label,status,customer_visible,required,metadata)
    values(project_row.id,'platform_compatibility','Platform / ROM compatibility review','pending',false,true,jsonb_build_object('reason','No matching Subpar workflow profile exists.')),
          (project_row.id,'baseline_log','Baseline datalog','pending',true,true,'{}'::jsonb);
  end if;

  if (payload->>'fuel') ~* '(E[0-9]+|ETHANOL|FLEX)' then
    insert into project_requirements(project_id,requirement_type,label,status,customer_visible,required,metadata)
    values(project_row.id,'ethanol_content','Verified ethanol content / fuel target','pending',true,true,'{}'::jsonb);
  end if;

  update intake_requests set project_id=project_row.id,status='converted',reviewed_at=now(),reviewed_by=p_reviewer,updated_at=now() where id=intake_row.id;
  update intake_access_tokens set revoked_at=now() where intake_request_id=intake_row.id and revoked_at is null;

  insert into events(project_id,customer_id,vehicle_id,event_type,actor_type,actor_id,visibility,payload,idempotency_key)
  values(project_row.id,intake_row.customer_id,vehicle_row.id,'intake.project.activated','internal',p_reviewer,'internal',jsonb_build_object('intakeRequestId',intake_row.id,'orderId',intake_row.order_id,'intelligenceProfileKey',workflow_row.profile_key,'loggingRecipeKey',workflow_row.logging_recipe_key,'parameterPackKey',workflow_row.parameter_pack_key),'intake-activate:'||intake_row.id::text)
  on conflict(idempotency_key) do nothing;

  return jsonb_build_object('replayed',false,'projectId',project_row.id,'projectNumber',project_row.project_number,'vehicleId',vehicle_row.id,'intelligenceProfileKey',workflow_row.profile_key,'loggingRecipeKey',workflow_row.logging_recipe_key,'parameterPackKey',workflow_row.parameter_pack_key);
end;
$$;

revoke all on function subpar_activate_intake(uuid,text) from public;
revoke all on function subpar_activate_intake(uuid,text) from anon;
revoke all on function subpar_activate_intake(uuid,text) from authenticated;

insert into schema_migrations(version,name) values ('0010','vehicle_platform_intelligence') on conflict(version) do nothing;
insert into setup_checkpoints(checkpoint_key,status,detail) values ('vehicle_intelligence','pending','Verify chassis/engine/platform resolution, workflow requirements, parameter-pack mapping and log recipe selection against Doug-approved examples.') on conflict(checkpoint_key) do nothing;
update setup_checkpoints set detail='Migrations 0001–0010 define the current Subpar schema.',updated_at=now() where checkpoint_key='database_schema';

comment on table vehicle_catalog is 'Curated BMW/Supra chassis catalog shared by intake, workflow and fuel tooling.';
comment on table logging_recipes is 'Versioned category-level log requirements. Exact Doug-approved channel packs remain tuner-owned.';
comment on table parameter_pack_profiles is 'Versioned placeholders/metadata for Doug-owned platform/engine logging packs.';
comment on table platform_workflow_profiles is 'Engine/platform workflow matrix that seeds project requirements and automation context after intake approval.';
