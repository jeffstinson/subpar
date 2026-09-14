# Subpar OS Go-Live Runbook

This runbook is for the dedicated Subpar environment only. Do not reuse Stince AI Supabase, OAuth, storage, webhook, Vercel or integration credentials.

## 1. Provision isolated infrastructure

1. Create a dedicated Supabase project for Subpar OS.
2. Add the Subpar-only Supabase URL, anon key and service-role key to Vercel.
3. Generate a 32+ character `SUBPAR_FILE_TICKET_SECRET` and store it as a server-only secret.
4. Keep `SUBPAR_DATA_MODE=demo`, `SUBPAR_AUTH_MODE=demo`, all mutation/integration gates false.
5. Confirm `/go-live`, `/persistence`, `/security`, `/access` and `/api/health` all report preview-safe state.

## 2. Apply database migrations

Run the migrations in order:

1. `0001_core.sql`
2. `0002_identity_storage.sql`
3. `0003_access_hardening.sql`
4. `0004_integration_staging.sql`
5. `0005_go_live_imports.sql`
6. `0006_intake_activation.sql`

Never skip a migration or run them against another project.

## 3. Seed synthetic data first

1. Set `SUBPAR_ALLOW_SYNTHETIC_SEED=true` only for the isolated Subpar project.
2. Run the synthetic seed.
3. Switch `SUBPAR_DATA_MODE=supabase` while keeping real-data/integration gates false.
4. Verify dashboard/project/customer/vehicle counts against the demo seed manifest.
5. Verify Alex SP-1842, Carlos SP-1846 and all synthetic project routes render from Supabase.
6. Turn synthetic seeding back off after parity is proven.

## 4. Prove identity boundaries

1. Configure public Supabase auth variables.
2. Create Doug as an `owner` in `internal_users`.
3. Create a synthetic customer auth user mapped in `customer_portal_users`.
4. Enable internal auth in preview first.
5. Confirm Doug can access tuner/admin routes.
6. Confirm the customer can access only their portal-visible project/file/message data.
7. Confirm customer access to `/project`, `/files`, `/security`, `/go-live`, internal APIs and internal files is denied.
8. Test login refresh, session expiry and logout.

## 5. Prove private storage

For each storage lane — stock files, revisions, datalogs, parameter packs and customer files:

1. Request a signed upload ticket.
2. Upload through the signed provider URL.
3. Finalize the upload through Subpar OS.
4. Confirm the object exists before metadata is registered.
5. Confirm immutable file metadata is tied to the correct project/revision/log.
6. Request a signed download and confirm the URL expires.
7. Confirm customer identity cannot access tuner-only files.

Do not enable real customer/tune files until all five lanes pass.

## 6. Configure Wix with writes still off

Required variables:

- `SUBPAR_WIX_APP_ID`
- `SUBPAR_WIX_APP_SECRET`
- `SUBPAR_WIX_WEBHOOK_PUBLIC_KEY`

Keep these false initially:

- `SUBPAR_REAL_DATA_APPROVED=false`
- `SUBPAR_WIX_WEBHOOK_ENABLED=false`
- `SUBPAR_WIX_APPLY_ENABLED=false`
- `SUBPAR_IMPORT_APPLY_ENABLED=false`

Use the Integration Lab synthetic Wix order to confirm normalization, customer matching, platform inference and idempotency planning.

## 7. Configure Gmail with sync/send off

Required variables:

- `SUBPAR_GOOGLE_CLIENT_ID`
- `SUBPAR_GOOGLE_CLIENT_SECRET`
- `SUBPAR_GOOGLE_REFRESH_TOKEN`
- `SUBPAR_GMAIL_ACCOUNT`
- `SUBPAR_GMAIL_PUBSUB_TOPIC`

Keep these false:

- `SUBPAR_GMAIL_SYNC_ENABLED=false`
- `SUBPAR_GMAIL_SEND_ENABLED=false`

Use the Integration Lab synthetic Gmail thread to confirm customer/project matching and queue routing logic.

## 8. Historical-import dry run

Use `/go-live` to plan Wix and Gmail imports before fetching/applying records.

### Wix

Recommended starting defaults:

- 36 month lookback
- 100 orders per batch

Dry-run every batch and classify each record as:

- matched
- would create
- skipped duplicate
- conflict
- failed

Do not auto-merge two existing customers with different emails. Do not overwrite VIN/chassis conflicts. Ambiguous vehicle/project matches must go to manual review.

### Gmail

Recommended starting defaults:

- 24 month lookback
- 250 threads per batch

Dedupe by Gmail thread ID + message ID. Link by customer email, then project context. Multiple candidate projects require review instead of automatic assignment.

## 9. Apply historical data before live ingress

Only after dry-run counts/conflicts are approved:

1. Set `SUBPAR_REAL_DATA_APPROVED=true`.
2. Set `SUBPAR_MUTATIONS_ENABLED=true`.
3. Set `SUBPAR_IMPORT_APPLY_ENABLED=true`.
4. Apply Wix historical orders in resumable batches.
5. Reconcile provider count vs scanned / created / matched / skipped / conflict / failed counts.
6. Apply Gmail historical threads/messages in resumable batches.
7. Reconcile again.
8. Turn `SUBPAR_IMPORT_APPLY_ENABLED=false` when the historical window is complete.

Each applied Wix order should create or match a customer, upsert one Wix order, and create one `intake_requests` record. It should not create a tune project until vehicle/chassis intake is complete.

## 10. Enable live Wix

1. Set `SUBPAR_WIX_WEBHOOK_ENABLED=true` while `SUBPAR_WIX_APPLY_ENABLED=false`.
2. Send real signed test events from Wix.
3. Confirm one `webhook_receipts` record per external event.
4. Replay the same event and confirm duplicate detection.
5. Confirm planned customer/order/intake actions are correct.
6. Set `SUBPAR_WIX_APPLY_ENABLED=true`.
7. Replay a planned event; it should safely advance from planned to applied exactly once.
8. Confirm no duplicate customers/orders/intakes are created.

## 11. Enable Gmail read sync

1. Start a Gmail watch and capture the current history ID/cutover point.
2. Set `SUBPAR_GMAIL_SYNC_ENABLED=true`.
3. Run partial history sync from the cutover history ID.
4. Hydrate every changed thread through the Gmail thread endpoint.
5. Confirm conversation/message dedupe.
6. Confirm inbound customer replies move the linked project to `waiting_on=tuner` with a clear next action.
7. Test an expired history cursor and confirm controlled full-sync fallback.

## 12. Enable outbound Gmail last

Keep `SUBPAR_GMAIL_SEND_ENABLED=false` until:

- historical sync is reconciled
- customer/project matching is reliable
- message drafts are reviewed
- outbound idempotency is proven
- Doug approves the live send behavior

Then enable outbound send separately. A draft/queue record must exist before provider send, and provider message IDs must be written back after send.

## 13. Cutover completion criteria

The deployment is considered operational only when all of these are true:

- database parity passed
- Doug internal identity passed
- customer isolation passed
- cross-boundary denial passed
- private file round-trip passed
- Wix replay safety passed
- Wix ambiguous-match handling passed
- Gmail history resume passed
- Gmail expired-cursor fallback passed
- outbound email gate passed
- historical import reconciliation has zero unexplained records
- live Wix and Gmail cursors/cutover checkpoints are recorded

## Rollback rules

If anything looks wrong:

1. Set `SUBPAR_WIX_APPLY_ENABLED=false`.
2. Set `SUBPAR_GMAIL_SYNC_ENABLED=false`.
3. Set `SUBPAR_GMAIL_SEND_ENABLED=false`.
4. Leave signed Wix receipt capture on only if diagnosis needs provider events recorded.
5. Do not delete integration history. Pause and inspect receipt/import/cutover ledgers.
6. Never “fix” a duplicate/conflict by deleting customer/tune history blindly.

The design goal is that every live capability can be paused independently without taking the whole dashboard offline.
