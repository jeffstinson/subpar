-- Subpar OS datalog intelligence
-- Apply after 0010_vehicle_platform_intelligence.sql.
-- Adds versioned parser/channel profiles and durable analysis metadata without changing raw tune files.

create table if not exists log_parser_profiles (
  profile_key text primary key,
  platform text not null,
  engine_family text not null,
  version integer not null default 1,
  active boolean not null default true,
  column_aliases jsonb not null default '{}'::jsonb,
  required_channels jsonb not null default '[]'::jsonb,
  thresholds jsonb not null default '{}'::jsonb,
  notes text,
  updated_at timestamptz not null default now()
);

alter table logs
  add column if not exists channel_map jsonb not null default '{}'::jsonb,
  add column if not exists analysis_summary jsonb not null default '{}'::jsonb,
  add column if not exists parser_confidence numeric(5,2),
  add column if not exists parse_error text;

create index if not exists idx_log_parser_platform_engine on log_parser_profiles(platform,engine_family,active,version desc);

alter table log_parser_profiles enable row level security;
drop policy if exists "internal read log parser profiles" on log_parser_profiles;
create policy "internal read log parser profiles" on log_parser_profiles for select to authenticated using (subpar_is_internal());

-- Browser writes remain closed. Doug-controlled aliases/thresholds are updated through the server/admin layer.
insert into log_parser_profiles(profile_key,platform,engine_family,version,column_aliases,required_channels,thresholds,notes) values
('mhd-b58tu-v1','MHD','B58TU',1,
 '{"rpm":["rpm","engine speed","engine_speed"],"boostTargetPsi":["boost target","boost target psi","boost_target","target boost"],"boostActualPsi":["boost","boost actual","boost actual psi","boost_actual","manifold pressure"],"throttlePct":["throttle","throttle position","throttle angle"],"lambda":["lambda","lambda actual","afr lambda"],"hpfpPsi":["rail pressure","hpfp","high pressure fuel","fuel pressure high"],"lpfpPsi":["low pressure fuel","lpfp","fuel pressure low"],"iatF":["iat","intake air temp","charge air temp"],"wgdcPct":["wgdc","wastegate duty","wastegate dc"],"ethanolPct":["ethanol","ethanol content","flex fuel ethanol"],"timingCorr1":["timing correction 1","ign correction 1","cyl 1 timing correction"],"timingCorr2":["timing correction 2","ign correction 2","cyl 2 timing correction"],"timingCorr3":["timing correction 3","ign correction 3","cyl 3 timing correction"],"timingCorr4":["timing correction 4","ign correction 4","cyl 4 timing correction"],"timingCorr5":["timing correction 5","ign correction 5","cyl 5 timing correction"],"timingCorr6":["timing correction 6","ign correction 6","cyl 6 timing correction"]}'::jsonb,
 '["rpm","boostTargetPsi","boostActualPsi","throttlePct","lambda","hpfpPsi","iatF"]'::jsonb,
 '{"wotThrottle":80,"reviewThrottleClosureBelow":70,"reviewBoostErrorPsi":3,"reviewTimingCorrectionDeg":3,"reviewIatF":140}'::jsonb,
 'Initial category-level B58TU MHD parser profile. Doug remains the authority for production thresholds and exact channel names.'),
('mhd-b58-v1','MHD','B58',1,
 '{"rpm":["rpm","engine speed"],"boostTargetPsi":["boost target","boost target psi"],"boostActualPsi":["boost","boost actual","boost actual psi"],"throttlePct":["throttle","throttle position"],"lambda":["lambda","lambda actual"],"hpfpPsi":["rail pressure","hpfp","high pressure fuel"],"lpfpPsi":["low pressure fuel","lpfp"],"iatF":["iat","intake air temp"],"wgdcPct":["wgdc","wastegate duty"],"timingCorr1":["timing correction 1","ign correction 1"],"timingCorr2":["timing correction 2","ign correction 2"],"timingCorr3":["timing correction 3","ign correction 3"],"timingCorr4":["timing correction 4","ign correction 4"],"timingCorr5":["timing correction 5","ign correction 5"],"timingCorr6":["timing correction 6","ign correction 6"]}'::jsonb,
 '["rpm","boostTargetPsi","boostActualPsi","throttlePct","lambda","hpfpPsi","iatF"]'::jsonb,
 '{"wotThrottle":80,"reviewThrottleClosureBelow":70,"reviewBoostErrorPsi":3,"reviewTimingCorrectionDeg":3,"reviewIatF":140}'::jsonb,
 'Initial B58 MHD parser profile.'),
('mhd-s55-v1','MHD','S55',1,
 '{"rpm":["rpm","engine speed"],"boostTargetPsi":["boost target","boost target psi"],"boostActualPsi":["boost","boost actual","boost actual psi"],"throttlePct":["throttle","throttle position"],"lambda":["lambda","lambda actual","lambda bank 1"],"hpfpPsi":["rail pressure","hpfp","high pressure fuel"],"lpfpPsi":["low pressure fuel","lpfp"],"iatF":["iat","intake air temp"],"wgdcPct":["wgdc","wastegate duty"],"timingCorr1":["timing correction 1","ign correction 1"],"timingCorr2":["timing correction 2","ign correction 2"],"timingCorr3":["timing correction 3","ign correction 3"],"timingCorr4":["timing correction 4","ign correction 4"],"timingCorr5":["timing correction 5","ign correction 5"],"timingCorr6":["timing correction 6","ign correction 6"]}'::jsonb,
 '["rpm","boostTargetPsi","boostActualPsi","throttlePct","lambda","hpfpPsi","iatF"]'::jsonb,
 '{"wotThrottle":80,"reviewThrottleClosureBelow":70,"reviewBoostErrorPsi":3,"reviewTimingCorrectionDeg":3,"reviewIatF":140}'::jsonb,
 'Initial S55 MHD parser profile.'),
('mhd-s58-v1','MHD','S58',1,
 '{"rpm":["rpm","engine speed"],"boostTargetPsi":["boost target","boost target psi"],"boostActualPsi":["boost","boost actual","boost actual psi"],"throttlePct":["throttle","throttle position"],"lambda":["lambda","lambda actual","lambda bank 1"],"hpfpPsi":["rail pressure","hpfp","high pressure fuel"],"lpfpPsi":["low pressure fuel","lpfp"],"iatF":["iat","intake air temp","charge air temp"],"wgdcPct":["wgdc","wastegate duty"],"ethanolPct":["ethanol","ethanol content"],"timingCorr1":["timing correction 1","ign correction 1"],"timingCorr2":["timing correction 2","ign correction 2"],"timingCorr3":["timing correction 3","ign correction 3"],"timingCorr4":["timing correction 4","ign correction 4"],"timingCorr5":["timing correction 5","ign correction 5"],"timingCorr6":["timing correction 6","ign correction 6"]}'::jsonb,
 '["rpm","boostTargetPsi","boostActualPsi","throttlePct","lambda","hpfpPsi","iatF"]'::jsonb,
 '{"wotThrottle":80,"reviewThrottleClosureBelow":70,"reviewBoostErrorPsi":3,"reviewTimingCorrectionDeg":3,"reviewIatF":140}'::jsonb,
 'Initial S58 MHD parser profile.'),
('bm3-s55-v1','BM3','S55',1,
 '{"rpm":["rpm","engine speed"],"boostTargetPsi":["boost target","target boost"],"boostActualPsi":["boost pressure","boost actual"],"throttlePct":["throttle","throttle angle"],"lambda":["lambda","afr"],"hpfpPsi":["fuel pressure","rail pressure"],"iatF":["iat","intake air temp"],"wgdcPct":["wgdc","wastegate duty"]}'::jsonb,
 '["rpm","boostTargetPsi","boostActualPsi","throttlePct","lambda","hpfpPsi","iatF"]'::jsonb,
 '{"wotThrottle":80,"reviewThrottleClosureBelow":70,"reviewBoostErrorPsi":3,"reviewTimingCorrectionDeg":3,"reviewIatF":140}'::jsonb,
 'BM3 normalization profile placeholder; Doug-approved exact channel mapping remains pending.')
on conflict(profile_key) do update set column_aliases=excluded.column_aliases,required_channels=excluded.required_channels,thresholds=excluded.thresholds,notes=excluded.notes,updated_at=now();

insert into schema_migrations(version,name) values ('0011','log_intelligence') on conflict(version) do nothing;
insert into setup_checkpoints(checkpoint_key,status,detail) values ('log_intelligence','pending','Validate MHD channel mapping, parser confidence, summary metrics and review flags against Doug-approved sample logs before enabling persistent auto-analysis.') on conflict(checkpoint_key) do nothing;
update setup_checkpoints set detail='Migrations 0001–0011 define the current Subpar schema.',updated_at=now() where checkpoint_key='database_schema';

comment on table log_parser_profiles is 'Versioned platform/engine channel alias maps and review thresholds. Exact production thresholds remain tuner-owned.';
comment on column logs.channel_map is 'Canonical channel -> source CSV column mapping used for this parse.';
comment on column logs.analysis_summary is 'Non-authoritative parser summary used to accelerate tuner review.';
comment on column logs.parser_confidence is 'Percent of required canonical channels confidently mapped.';
