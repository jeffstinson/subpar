# Subpar OS Go-Live Runbook

This runbook is for the dedicated Subpar environment only. Do not reuse Stince AI Supabase, OAuth, storage, webhook, Vercel or integration credentials.

## 1. Provision isolated infrastructure

1. Create a dedicated Supabase project for Subpar OS.
2. Add the Subpar-only Supabase URL, anon key and service-role key to Vercel.
3. Generate a 32+ character `SUBPAR_FILE_TICKET_SECRET` and store it as a server-only secret.
4. Keep `SUBPAR_DATA_MODE=demo`, `SUBPAR_AUTH_MODE=demo`, all mutation/integration gates false.
5. Confirm `/go-live`, `/persistence`, `/security`, `/access` and `/api/health` all report preview-safe state.

## 2. Apply database migrations

Run these in order against the Subpar-only Supabase project:

1. `0001_core.sql`
2. `0002_identity_storage.sql`
3. `0003_access_hardening.sql`
4. `0004_integration_staging.sql`
5. `0005_go_live_imports.sql`
6. `0006_intake_activation.sql`
7. `0007_provisioning_state.sql`
8. `0008_customer_intake_activation.sql`
9. `0009_intake_handoff_queue.sql`
10. `0010_vehicle_platform_intelligence.sql`
11. `0011_log_intelligence.sql`

Never skip a migration or run them against another project. The `schema_migrations` ledger should report the same ordered versions after provisioning.

## 3. Seed synthetic data first

1. Set `SUBPAR_ALLOW_SYNTHETIC_SEED=true` only for the isolated Subpar project.
2. Run the synthetic seed.
3. Switch `SUBPAR_DATA_MODE=supabase` while keeping real-data/integration gates false.
4. Verify dashboard/project/customer/vehicle counts against the demo seed manifest.
5. Verify Alex SP-1842, Carlos SP-1846 and all synthetic project routes render from Supabase.
6. Turn synthetic seeding back off after parity is proven.

## 4. Validate vehicle/platform intelligence

Before any real order can activate a project, validate the data-driven intelligence layer with Doug.

Required representative tests:

- G20 M340i / B58TU / MHD / ethanol target
- F82 M4 / S55 / bootmod3 / pump gas
- G80 M3 / S58 / EcuTek / ethanol target

For each example confirm:

1. Chassis and engine resolve to the intended curated vehicle.
2. Platform workflow resolves to the intended state.
3. Required files/prerequisites are correct.
4. Logging recipe is correct at the category level.
5. Parameter/logging pack mapping is correct.
6. Modern DME/ROM or unlock verification remains an internal requirement where appropriate.
7. Ethanol projects add a verified fuel-content requirement.
8. Unknown vehicles/platforms fall back to manual review instead of guessing.

`workflow_ready` means Subpar has a defined workflow. It does not guarantee a specific ROM/DME is supported or unlocked. Doug remains the compatibility approval gate.

The initial parameter-pack rows are placeholders. Replace them with Doug-approved production versions before any automation sends them to customers.

## 5. Validate datalog intelligence

Use `/log-lab` before enabling persistent automatic log analysis.

Start with representative MHD logs supplied/approved by Doug for the engines he actually tunes most often. At minimum validate B58TU, B58, S55 and S58 examples before trusting their parser profiles.

For each sample:

1. Confirm the source CSV columns map to the intended canonical channels.
2. Confirm required-channel coverage and parser confidence are accurate.
3. Confirm boost target/actual, lambda, fuel-pressure, IAT, WGDC, ethanol and timing-correction values are interpreted with the correct units.
4. Confirm the WOT segment heuristic is reasonable for Doug's review process.
5. Confirm throttle-closure, boost-error, timing-correction and IAT review flags trigger only where Doug expects them.
6. Intentionally remove or rename a required channel and confirm parser confidence drops rather than silently guessing.
7. Confirm unknown columns remain visible as unmapped source columns.
8. Confirm the parser summary is clearly assistive and never marks a tune/calibration safe or approved.
9. Replace starter aliases/thresholds with Doug-approved versions in `log_parser_profiles` before persistent auto-analysis is enabled.
10. Keep BM3/EcuTek parser profiles staged/manual until sample logs prove their channel mappings.

The log parser is a review accelerator, not a tuning authority. A clean heuristic result is not approval to deliver a calibration.

## 6. Prove identity boundaries

1. Configure public Supabase auth variables.
2. Create Doug as an `owner` in `internal_users`.
3. Create a synthetic customer auth user mapped in `customer_portal_users`.
4. Enable internal auth in preview first.
5. Confirm Doug can access tuner/admin routes, including `/intelligence`, `/log-lab`, `/intake-queue`, `/messages`, `/outbound`, `/go-live` and live workspaces.
6. Confirm the customer can access only their portal-visible project/file/message data.
7. Confirm customer access to internal routes/APIs/files is denied.
8. Test login refresh, session expiry and logout.

## 7. Prove private storage

For each storage lane — stock files, revisions, datalogs, parameter packs and customer files:

1. Request a signed upload ticket.
2. Upload through the signed provider URL.
3. Finalize the upload through Subpar OS.
4. Confirm the object exists before metadata is registered.
5. Confirm immutable file metadata is tied to the correct project/revision/log.
6. Request a signed download and confirm the URL expires.
7. Confirm customer identity cannot access tuner-only files.

Do not enable real customer/tune files until all lanes pass.

## 8. Prove paid-order intake handoff

With synthetic data first:

1. Apply one synthetic paid Wix order into Customer → Order → Intake Request.
2. Confirm one intake invitation draft is staged, not sent.
3. Approve the draft as owner/tuner.
4. Confirm the raw secure intake token is generated only at send time and is never persisted.
5. Complete the customer intake using a known BMW/Supra preset.
6. Confirm the internal Intake Queue shows the resolved intelligence profile, logging recipe, pack placeholder and warnings.
7. Approve compatibility explicitly.
8. Activate the intake.
9. Confirm one vehicle and one tune project are created atomically.
10. Confirm activation seeds requirements from the resolved engine/platform workflow.
11. Replay activation and confirm the existing project is returned instead of creating duplicates.
12. Confirm the project workspace still shows the intelligence profile after activation.

## 9. Configure Wix with writes still off

Required variables:

- `SUBPAR_WIX_APP_ID`
- `SUBPAR_WIX_APP_SECRET`
- `SUBPAR_WIX_INSTANCE_ID`
- `SUBPAR_WIX_WEBHOOK_PUBLIC_KEY`

Keep these false initially:

- `SUBPAR_REAL_DATA_APPROVED=false`
- `SUBPAR_WIX_READ_ENABLED=false`
- `SUBPAR_WIX_WEBHOOK_ENABLED=false`
- `SUBPAR_WIX_APPLY_ENABLED=false`
- `SUBPAR_IMPORT_APPLY_ENABLED=false`

Use the Integration Lab synthetic Wix order to confirm normalization, customer matching, platform inference, idempotency planning and intake handoff staging.

## 10. Configure Gmail with sync/send off

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

## 11. Historical-import dry run

Use `/go-live` to plan Wix and Gmail imports before applying records.

### Wix

Recommended starting defaults:

- 36 month lookback
- 100 orders per batch

Classify every record as matched, would-create, skipped duplicate, conflict or failed. Do not auto-merge two existing customers with different emails. Do not overwrite VIN/chassis conflicts. Ambiguous vehicle/project matches go to manual review.

### Gmail

Recommended starting defaults:

- 24 month lookback
- small resumable worker pages even if the logical batch is larger

Dedupe by Gmail thread ID + message ID. Link by customer email, then project context. Multiple candidate projects require review instead of automatic assignment.

## 12. Apply historical data before live ingress

Only after dry-run counts/conflicts are approved:

1. Set `SUBPAR_REAL_DATA_APPROVED=true`.
2. Set `SUBPAR_MUTATIONS_ENABLED=true`.
3. Set `SUBPAR_IMPORT_APPLY_ENABLED=true`.
4. Apply Wix historical orders in resumable pages.
5. Reconcile provider count vs scanned / created / matched / skipped / conflict / failed counts.
6. Apply Gmail historical threads/messages in resumable pages.
7. Reconcile again.
8. Turn `SUBPAR_IMPORT_APPLY_ENABLED=false` when the historical window is complete.

Each applied Wix order creates/matches a customer, upserts one Wix order and creates one `intake_requests` record. It does not create a tune project until customer intake and Doug compatibility review are complete.

## 13. Enable live Wix

1. Set `SUBPAR_WIX_WEBHOOK_ENABLED=true` while `SUBPAR_WIX_APPLY_ENABLED=false`.
2. Send real signed test events from Wix.
3. Confirm one `webhook_receipts` record per external event.
4. Replay the same event and confirm duplicate detection.
5. Confirm planned customer/order/intake actions are correct.
6. Set `SUBPAR_WIX_APPLY_ENABLED=true`.
7. Confirm one intake record and one staged invitation draft are produced.
8. Confirm no duplicate customers/orders/intakes are created on replay.

## 14. Enable Gmail read sync

1. Start a Gmail watch and capture the current history ID/cutover point.
2. Set `SUBPAR_GMAIL_SYNC_ENABLED=true`.
3. Run partial history sync from the cutover history ID.
4. Hydrate every changed thread through the Gmail thread endpoint.
5. Confirm conversation/message dedupe.
6. Confirm inbound customer replies move the linked project to `waiting_on=tuner` with a clear next action.
7. Test an expired history cursor and confirm controlled full-sync fallback.

## 15. Enable outbound Gmail last

Keep `SUBPAR_GMAIL_SEND_ENABLED=false` until historical sync is reconciled, project matching is reliable, drafts are reviewed, provider idempotency/recovery is proven and Doug approves the behavior.

Outbound flow is intentionally:

`compose → draft → owner/tuner approval → provider send → provider message/thread ID → Subpar conversation history`

The intake invitation uses the same approval boundary. Its raw secure intake link is created only immediately before provider send.

## 16. Cutover completion criteria

The deployment is operational only when all of these are true:

- database parity passed
- migration ledger shows 0001–0011
- vehicle intelligence representative tests passed
- datalog intelligence sample-log validation passed
- Doug internal identity passed
- customer isolation passed
- cross-boundary denial passed
- private file round-trip passed
- secure intake token behavior passed
- intake activation replay safety passed
- Wix replay safety passed
- Wix ambiguous-match handling passed
- Gmail history resume passed
- Gmail expired-cursor fallback passed
- outbound email approval/send gate passed
- historical import reconciliation has zero unexplained records
- live Wix and Gmail cutover checkpoints are recorded

## Rollback rules

If anything looks wrong:

1. Set `SUBPAR_WIX_APPLY_ENABLED=false`.
2. Set `SUBPAR_GMAIL_SYNC_ENABLED=false`.
3. Set `SUBPAR_GMAIL_SEND_ENABLED=false`.
4. Set `SUBPAR_IMPORT_APPLY_ENABLED=false` if a backfill is active.
5. Leave signed Wix receipt capture on only if diagnosis needs provider events recorded.
6. Do not delete integration history, intelligence profiles, parser profiles or project history. Pause and inspect the ledgers.
7. Never “fix” a duplicate/conflict by deleting customer/tune history blindly.

Every live capability is designed to pause independently without taking the dashboard offline.
