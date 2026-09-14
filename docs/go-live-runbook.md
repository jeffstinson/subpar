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
7. `0007_provisioning_state.sql`
8. `0008_customer_intake_activation.sql`

Never skip a migration or run them against another project. Confirm all eight are recorded in `schema_migrations` before cutover.

## 3. Seed synthetic data first

1. Set `SUBPAR_ALLOW_SYNTHETIC_SEED=true` only for the isolated Subpar project.
2. Run the synthetic seed.
3. Switch `SUBPAR_DATA_MODE=supabase` while keeping real-data/integration gates false.
4. Verify dashboard/project/customer/vehicle counts against the demo seed manifest.
5. Verify Alex SP-1842, Carlos SP-1846 and all synthetic project routes render from Supabase.
6. Keep synthetic seeding enabled only long enough to run intake/auth/storage validation.

## 4. Prove identity boundaries

1. Configure public Supabase auth variables.
2. Create Doug as an `owner` in `internal_users`.
3. Create a synthetic customer auth user mapped in `customer_portal_users`.
4. Enable internal auth in preview first.
5. Confirm Doug can access tuner/admin routes.
6. Confirm the customer can access only their portal-visible project/file/message data.
7. Confirm customer access to `/project`, `/files`, `/security`, `/go-live`, `/messages`, `/outbound`, `/intake-queue`, internal APIs and internal files is denied.
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

## 6. Prove paid-order customer intake

Before connecting real Wix orders, validate the complete synthetic intake flow:

1. Open `/intake-queue` and create a secure customer intake link.
2. Confirm only the token hash is stored in `intake_access_tokens`; the raw token is returned once.
3. Open `/customer-intake/<token>` and submit the synthetic vehicle.
4. Confirm intake moves to `ready` and compatibility remains `review`, not automatically approved.
5. Approve compatibility as Doug.
6. Activate the intake.
7. Confirm exactly one vehicle, one tune project and the correct starting requirements are created.
8. Retry the activation and confirm the same project is returned instead of a duplicate.
9. Confirm the intake token is revoked after conversion.

After synthetic parity passes, turn `SUBPAR_ALLOW_SYNTHETIC_SEED=false`.

## 7. Configure Wix with reads/writes still off

Required variables:

- `SUBPAR_WIX_APP_ID`
- `SUBPAR_WIX_APP_SECRET`
- `SUBPAR_WIX_INSTANCE_ID`
- `SUBPAR_WIX_WEBHOOK_PUBLIC_KEY`

Keep these false initially:

- `SUBPAR_REAL_DATA_APPROVED=false`
- `SUBPAR_CONNECTION_TESTS_ENABLED=false`
- `SUBPAR_WIX_READ_ENABLED=false`
- `SUBPAR_WIX_WEBHOOK_ENABLED=false`
- `SUBPAR_WIX_APPLY_ENABLED=false`
- `SUBPAR_IMPORT_APPLY_ENABLED=false`

When Doug approves access, enable connection tests first and prove OAuth. Historical read, webhook receipt and database apply are deliberately three different switches.

## 8. Configure Gmail with sync/send off

Required variables:

- `SUBPAR_GOOGLE_CLIENT_ID`
- `SUBPAR_GOOGLE_CLIENT_SECRET`
- `SUBPAR_GOOGLE_REFRESH_TOKEN`
- `SUBPAR_GMAIL_ACCOUNT`
- `SUBPAR_GMAIL_PUBSUB_TOPIC`

Keep these false:

- `SUBPAR_GMAIL_SYNC_ENABLED=false`
- `SUBPAR_GMAIL_SEND_ENABLED=false`

Use connection preflight to verify OAuth before enabling mailbox ingestion.

## 9. Historical-import dry run

Use `/go-live` to plan Wix and Gmail imports before applying records.

### Wix

Recommended starting defaults:

- 36 month lookback
- 100 orders per batch

Enable `SUBPAR_WIX_READ_ENABLED=true` only after connection testing succeeds. Process one cursor page per worker invocation. Classify each record as matched, would create, skipped duplicate, conflict or failed.

Do not auto-merge two existing customers with different emails. Do not overwrite VIN/chassis conflicts. Ambiguous vehicle/project matches must go to manual review.

### Gmail

Recommended starting defaults:

- 24 month lookback
- 250 threads per planning batch
- small hydrated thread chunks per worker invocation

Dedupe by Gmail thread ID + message ID. Link by customer email, then project context. Multiple candidate projects require review instead of automatic assignment.

## 10. Apply historical data before live ingress

Only after dry-run counts/conflicts are approved:

1. Set `SUBPAR_REAL_DATA_APPROVED=true`.
2. Set `SUBPAR_MUTATIONS_ENABLED=true`.
3. Set `SUBPAR_IMPORT_APPLY_ENABLED=true`.
4. Apply Wix historical orders in resumable batches.
5. Reconcile provider count vs scanned / created / matched / skipped / conflict / failed counts.
6. Apply Gmail historical threads/messages in resumable batches.
7. Reconcile again.
8. Turn `SUBPAR_IMPORT_APPLY_ENABLED=false` when the historical window is complete.

Each applied Wix order should create or match a customer, upsert one Wix order, and create one `intake_requests` record. It must not create a tune project until vehicle/chassis intake is reviewed and approved.

## 11. Enable live Wix

1. Set `SUBPAR_WIX_WEBHOOK_ENABLED=true` while `SUBPAR_WIX_APPLY_ENABLED=false`.
2. Send real signed test events from Wix.
3. Confirm one `webhook_receipts` record per external event.
4. Replay the same event and confirm duplicate detection.
5. Confirm planned customer/order/intake actions are correct.
6. Set `SUBPAR_WIX_APPLY_ENABLED=true`.
7. Replay a planned event; it should safely advance from planned to applied exactly once.
8. Confirm no duplicate customers/orders/intakes are created.

## 12. Enable Gmail read sync

1. Start a Gmail watch and capture the current history ID/cutover point.
2. Set `SUBPAR_GMAIL_SYNC_ENABLED=true`.
3. Run partial history sync from the cutover history ID.
4. Hydrate every changed thread through the Gmail thread endpoint.
5. Confirm conversation/message dedupe.
6. Confirm inbound customer replies move the linked project to `waiting_on=tuner` with a clear next action.
7. Test an expired history cursor and confirm controlled full-sync fallback.

## 13. Prove communications + outbound approval

1. Open `/messages` and verify each Gmail thread shows customer, vehicle and active tune context.
2. Queue a customer reply. It should become an outbound draft, not a provider send.
3. Open `/outbound`.
4. Confirm staff can prepare drafts but cannot approve/provider-send them.
5. Confirm owner/tuner approval is required.
6. Confirm provider send is impossible while `SUBPAR_GMAIL_SEND_ENABLED=false`.
7. Confirm sent messages write the Gmail provider message ID back to the queue and conversation history.

## 14. Enable outbound Gmail last

Keep `SUBPAR_GMAIL_SEND_ENABLED=false` until:

- historical sync is reconciled
- customer/project matching is reliable
- message drafts are reviewed
- outbound idempotency is proven
- Doug approves the live send behavior

Then enable outbound send separately. A queue record must exist and be approved before provider send.

## 15. Cutover completion criteria

The deployment is considered operational only when all of these are true:

- database parity passed
- all eight schema migrations verified
- Doug internal identity passed
- customer isolation passed
- cross-boundary denial passed
- private file round-trip passed
- customer intake token/review/activation passed
- Wix OAuth/read access passed
- Wix replay safety passed
- Wix ambiguous-match handling passed
- Gmail history resume passed
- Gmail expired-cursor fallback passed
- communications project matching passed
- outbound email approval/send gate passed
- historical import reconciliation has zero unexplained records
- live Wix and Gmail cursors/cutover checkpoints are recorded

## Rollback rules

If anything looks wrong:

1. Set `SUBPAR_WIX_APPLY_ENABLED=false`.
2. Set `SUBPAR_GMAIL_SYNC_ENABLED=false`.
3. Set `SUBPAR_GMAIL_SEND_ENABLED=false`.
4. Set `SUBPAR_IMPORT_APPLY_ENABLED=false` for historical-import problems.
5. Leave signed Wix receipt capture on only if diagnosis needs provider events recorded.
6. Do not delete integration history. Pause and inspect receipt/import/cutover ledgers.
7. Never “fix” a duplicate/conflict by deleting customer/tune history blindly.

Every live capability is deliberately pausable without taking the rest of Subpar OS offline.
