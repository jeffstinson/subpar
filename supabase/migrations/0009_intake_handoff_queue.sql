-- Subpar OS paid-order intake handoff queue
-- Apply after 0008_customer_intake_activation.sql.
-- Stages a customer intake invitation without persisting raw intake tokens or sending email automatically.

alter table outbound_actions
  add column if not exists intake_request_id uuid references intake_requests(id) on delete cascade;

alter table intake_requests
  add column if not exists handoff_status text not null default 'not_staged',
  add column if not exists invite_action_id uuid references outbound_actions(id) on delete set null,
  add column if not exists invite_sent_at timestamptz;

do $$ begin
  alter table intake_requests add constraint intake_handoff_status_check
    check (handoff_status in ('not_staged','drafted','approved','sent','canceled','manual'));
exception when duplicate_object then null;
end $$;

create index if not exists idx_outbound_actions_intake on outbound_actions(intake_request_id, created_at desc);
create index if not exists idx_intake_handoff_status on intake_requests(handoff_status, created_at desc);

insert into schema_migrations(version,name)
values ('0009','intake_handoff_queue')
on conflict(version) do nothing;

insert into setup_checkpoints(checkpoint_key,status,detail)
values ('intake_email_handoff','pending','Prove Wix apply stages one intake invite draft, approval creates an expiring link at send-time, and Gmail provider send remains separately gated.')
on conflict(checkpoint_key) do nothing;

update setup_checkpoints
set detail='Migrations 0001–0009 define the current Subpar schema.',updated_at=now()
where checkpoint_key='database_schema';

comment on column outbound_actions.intake_request_id is 'Optional paid-order intake relationship for pre-project communications.';
comment on column intake_requests.handoff_status is 'Tracks staged/approved/sent customer intake invitation state independently from tune project activation.';
