-- Subpar OS customer intake activation
-- Apply after 0007_provisioning_state.sql.
-- Adds secure magic-link intake access and the review state needed to convert a paid order into a real tune project.

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

comment on table intake_access_tokens is 'Server-only hashes for expiring customer intake magic links. Raw tokens are never persisted.';
comment on function subpar_next_project_number() is 'Service-role project-number allocator used only after reviewed intake activation.';
