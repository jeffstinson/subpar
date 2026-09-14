-- Subpar OS identity + private storage
-- Apply after 0001_core.sql inside the dedicated Subpar Supabase project.
-- All buckets remain private. Customer files are served through short-lived signed URLs.

create table if not exists internal_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null check (role in ('owner','tuner','staff')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists customer_portal_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  active boolean not null default true,
  invited_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_internal_users_auth on internal_users(auth_user_id);
create index if not exists idx_portal_users_auth on customer_portal_users(auth_user_id);
create index if not exists idx_portal_users_customer on customer_portal_users(customer_id);

alter table internal_users enable row level security;
alter table customer_portal_users enable row level security;

create or replace function subpar_internal_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from internal_users
  where auth_user_id = auth.uid() and active = true
  limit 1;
$$;

create or replace function subpar_is_internal()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select subpar_internal_role() is not null;
$$;

create or replace function subpar_is_tuner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(subpar_internal_role() in ('owner','tuner'), false);
$$;

create or replace function subpar_is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(subpar_internal_role() = 'owner', false);
$$;

create or replace function subpar_customer_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select customer_id
  from customer_portal_users
  where auth_user_id = auth.uid() and active = true
  limit 1;
$$;

-- Identity tables: users can see their own mapping; owners can manage internal access.
drop policy if exists "internal users read own or owner" on internal_users;
create policy "internal users read own or owner"
on internal_users for select
to authenticated
using (auth_user_id = auth.uid() or subpar_is_owner());

drop policy if exists "owners manage internal users" on internal_users;
create policy "owners manage internal users"
on internal_users for all
to authenticated
using (subpar_is_owner())
with check (subpar_is_owner());

drop policy if exists "portal users read own mapping" on customer_portal_users;
create policy "portal users read own mapping"
on customer_portal_users for select
to authenticated
using (auth_user_id = auth.uid() or subpar_is_internal());

drop policy if exists "internal manages portal users" on customer_portal_users;
create policy "internal manages portal users"
on customer_portal_users for all
to authenticated
using (subpar_is_internal())
with check (subpar_is_internal());

-- Customers.
drop policy if exists "internal read customers" on customers;
create policy "internal read customers" on customers for select to authenticated using (subpar_is_internal());
drop policy if exists "customer read self" on customers;
create policy "customer read self" on customers for select to authenticated using (id = subpar_customer_id());
drop policy if exists "internal write customers" on customers;
create policy "internal write customers" on customers for all to authenticated using (subpar_is_internal()) with check (subpar_is_internal());

-- Vehicles.
drop policy if exists "internal read vehicles" on vehicles;
create policy "internal read vehicles" on vehicles for select to authenticated using (subpar_is_internal());
drop policy if exists "customer read own vehicles" on vehicles;
create policy "customer read own vehicles" on vehicles for select to authenticated using (customer_id = subpar_customer_id());
drop policy if exists "internal write vehicles" on vehicles;
create policy "internal write vehicles" on vehicles for all to authenticated using (subpar_is_internal()) with check (subpar_is_internal());

-- Orders are internal-only by default. Customer portal does not need commerce/payment payload access.
drop policy if exists "internal orders" on orders;
create policy "internal orders" on orders for all to authenticated using (subpar_is_internal()) with check (subpar_is_internal());

-- Tune projects.
drop policy if exists "internal read projects" on tune_projects;
create policy "internal read projects" on tune_projects for select to authenticated using (subpar_is_internal());
drop policy if exists "customer read own projects" on tune_projects;
create policy "customer read own projects" on tune_projects for select to authenticated using (customer_id = subpar_customer_id());
drop policy if exists "tuners write projects" on tune_projects;
create policy "tuners write projects" on tune_projects for all to authenticated using (subpar_is_tuner()) with check (subpar_is_tuner());

-- Requirements.
drop policy if exists "internal requirements" on project_requirements;
create policy "internal requirements" on project_requirements for all to authenticated using (
  subpar_is_internal()
) with check (subpar_is_internal());
drop policy if exists "customer visible requirements" on project_requirements;
create policy "customer visible requirements" on project_requirements for select to authenticated using (
  customer_visible = true and exists (
    select 1 from tune_projects p
    where p.id = project_requirements.project_id and p.customer_id = subpar_customer_id()
  )
);

-- Revisions. Customers only see delivered/final revisions for their own project.
drop policy if exists "internal revisions" on revisions;
create policy "internal revisions" on revisions for all to authenticated using (subpar_is_internal()) with check (subpar_is_tuner());
drop policy if exists "customer delivered revisions" on revisions;
create policy "customer delivered revisions" on revisions for select to authenticated using (
  status in ('delivered','final') and exists (
    select 1 from tune_projects p
    where p.id = revisions.project_id and p.customer_id = subpar_customer_id()
  )
);

-- Logs remain internal raw data. Customer-facing summaries should be represented through project/revision state.
drop policy if exists "internal logs" on logs;
create policy "internal logs" on logs for all to authenticated using (subpar_is_internal()) with check (subpar_is_tuner());

-- File metadata.
drop policy if exists "internal files" on files;
create policy "internal files" on files for all to authenticated using (subpar_is_internal()) with check (subpar_is_internal());
drop policy if exists "customer visible file metadata" on files;
create policy "customer visible file metadata" on files for select to authenticated using (
  visibility = 'customer' and exists (
    select 1 from tune_projects p
    where p.id = files.project_id and p.customer_id = subpar_customer_id()
  )
);

-- Conversations/messages.
drop policy if exists "internal conversations" on conversations;
create policy "internal conversations" on conversations for all to authenticated using (subpar_is_internal()) with check (subpar_is_internal());
drop policy if exists "customer conversations" on conversations;
create policy "customer conversations" on conversations for select to authenticated using (customer_id = subpar_customer_id());

drop policy if exists "internal messages" on messages;
create policy "internal messages" on messages for all to authenticated using (subpar_is_internal()) with check (subpar_is_internal());
drop policy if exists "customer visible messages" on messages;
create policy "customer visible messages" on messages for select to authenticated using (
  customer_visible = true and exists (
    select 1 from tune_projects p
    where p.id = messages.project_id and p.customer_id = subpar_customer_id()
  )
);

-- Event feed. Customers receive only explicitly customer/both events for their own project.
drop policy if exists "internal events" on events;
create policy "internal events" on events for all to authenticated using (subpar_is_internal()) with check (subpar_is_internal());
drop policy if exists "customer visible events" on events;
create policy "customer visible events" on events for select to authenticated using (
  visibility in ('customer','both') and exists (
    select 1 from tune_projects p
    where p.id = events.project_id and p.customer_id = subpar_customer_id()
  )
);

-- Automation/integration tables are internal-only.
drop policy if exists "tuners automation rules" on automation_rules;
create policy "tuners automation rules" on automation_rules for all to authenticated using (subpar_is_tuner()) with check (subpar_is_tuner());
drop policy if exists "internal automation runs" on automation_runs;
create policy "internal automation runs" on automation_runs for select to authenticated using (subpar_is_internal());
drop policy if exists "owner integration state" on integration_sync_state;
create policy "owner integration state" on integration_sync_state for all to authenticated using (subpar_is_owner()) with check (subpar_is_owner());
drop policy if exists "owner webhook receipts" on webhook_receipts;
create policy "owner webhook receipts" on webhook_receipts for all to authenticated using (subpar_is_owner()) with check (subpar_is_owner());

-- Private file buckets. File delivery should occur through server-generated signed URLs.
insert into storage.buckets (id, name, public, file_size_limit)
values
  ('subpar-stock-files','subpar-stock-files',false,52428800),
  ('subpar-revisions','subpar-revisions',false,52428800),
  ('subpar-logs','subpar-logs',false,104857600),
  ('subpar-parameter-packs','subpar-parameter-packs',false,52428800),
  ('subpar-customer-files','subpar-customer-files',false,104857600)
on conflict (id) do update set public = false;

-- Authenticated users do not receive blanket Storage access. Internal/customer downloads and
-- uploads are brokered by Subpar OS after application-level permission checks, using short-lived
-- signed URLs. The service role bypasses Storage RLS for that broker operation.

comment on table internal_users is 'Maps Supabase Auth users to Subpar internal roles.';
comment on table customer_portal_users is 'Maps Supabase Auth users to exactly one customer portal identity.';
