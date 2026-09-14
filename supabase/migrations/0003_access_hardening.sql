-- Subpar OS access hardening
-- Apply after 0002_identity_storage.sql.
-- Tightens authenticated writes so the browser cannot mutate immutable history or file metadata directly.
-- Server broker operations use the service role after application-level authorization.

-- Portal identity administration follows the same user.manage rule as the app: owner only.
drop policy if exists "internal manages portal users" on customer_portal_users;
create policy "owner manages portal users"
on customer_portal_users for all
to authenticated
using (subpar_is_owner())
with check (subpar_is_owner());

-- Revisions: all internal users may read, only owner/tuner may mutate.
drop policy if exists "internal revisions" on revisions;
drop policy if exists "internal read revisions" on revisions;
drop policy if exists "tuners insert revisions" on revisions;
drop policy if exists "tuners update revisions" on revisions;
drop policy if exists "tuners delete revisions" on revisions;

create policy "internal read revisions"
on revisions for select
to authenticated
using (subpar_is_internal());

create policy "tuners insert revisions"
on revisions for insert
to authenticated
with check (subpar_is_tuner());

create policy "tuners update revisions"
on revisions for update
to authenticated
using (subpar_is_tuner())
with check (subpar_is_tuner());

create policy "tuners delete revisions"
on revisions for delete
to authenticated
using (subpar_is_tuner());

-- Logs: internal users can inspect raw logs; only owner/tuner can mutate review state.
drop policy if exists "internal logs" on logs;
drop policy if exists "internal read logs" on logs;
drop policy if exists "tuners insert logs" on logs;
drop policy if exists "tuners update logs" on logs;
drop policy if exists "tuners delete logs" on logs;

create policy "internal read logs"
on logs for select
to authenticated
using (subpar_is_internal());

create policy "tuners insert logs"
on logs for insert
to authenticated
with check (subpar_is_tuner());

create policy "tuners update logs"
on logs for update
to authenticated
using (subpar_is_tuner())
with check (subpar_is_tuner());

create policy "tuners delete logs"
on logs for delete
to authenticated
using (subpar_is_tuner());

-- File metadata is registered by the server broker after a signed upload is verified.
-- Authenticated clients receive read access only; service role performs inserts.
drop policy if exists "internal files" on files;
drop policy if exists "internal read files" on files;
create policy "internal read files"
on files for select
to authenticated
using (subpar_is_internal());

-- Conversations/messages are read through authenticated sessions, but all outbound/inbound
-- persistence goes through the server integration layer so IDs and audit events cannot be forged.
drop policy if exists "internal conversations" on conversations;
drop policy if exists "internal read conversations" on conversations;
create policy "internal read conversations"
on conversations for select
to authenticated
using (subpar_is_internal());

drop policy if exists "internal messages" on messages;
drop policy if exists "internal read messages" on messages;
create policy "internal read messages"
on messages for select
to authenticated
using (subpar_is_internal());

-- Events are immutable audit history to authenticated clients.
-- Only the service-role-backed event writer may append them.
drop policy if exists "internal events" on events;
drop policy if exists "internal read events" on events;
create policy "internal read events"
on events for select
to authenticated
using (subpar_is_internal());

-- Automation execution history is also immutable to authenticated clients.
drop policy if exists "internal automation runs" on automation_runs;
drop policy if exists "internal read automation runs" on automation_runs;
create policy "internal read automation runs"
on automation_runs for select
to authenticated
using (subpar_is_internal());

-- Webhook receipts and sync state are managed by the server integration layer.
-- Owners may inspect them but cannot mutate them directly from a browser session.
drop policy if exists "owner integration state" on integration_sync_state;
drop policy if exists "owner read integration state" on integration_sync_state;
create policy "owner read integration state"
on integration_sync_state for select
to authenticated
using (subpar_is_owner());

drop policy if exists "owner webhook receipts" on webhook_receipts;
drop policy if exists "owner read webhook receipts" on webhook_receipts;
create policy "owner read webhook receipts"
on webhook_receipts for select
to authenticated
using (subpar_is_owner());

comment on table events is 'Append-only audit history for authenticated users; server integration layer writes via service role.';
comment on table files is 'Private file metadata registered by the Subpar OS server broker after signed upload verification.';
comment on table messages is 'Conversation history is client-readable by policy; persistence is brokered by server integrations.';
