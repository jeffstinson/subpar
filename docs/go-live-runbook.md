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
12. `0012_log_review_workflow.sql`
13. `0013_revision_delivery_loop.sql`
14. `0014_tune_lifecycle_closeout.sql`

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

## 5A. Validate the tuner Review Cockpit

Use `/reviews` with synthetic records first, then Doug-approved sample logs.

1. Confirm the current pull and comparison pull belong to the same project.
2. Confirm revision/pull deltas use persisted parser metrics instead of hardcoded demo values.
3. Add an RPM/metric annotation and confirm it remains attached to the review session.
4. Confirm internal tuner notes and customer-safe summaries remain separate.
5. Test `create_revision`, `request_relog`, `complete` and `hold` independently.
6. Replay a completed decision and confirm it does not create duplicate revisions or duplicate history.
7. Link a Datazap URL and confirm it is stored as reference-only context.
8. Attempt to reuse that Datazap URL on another project and confirm automatic reassignment is blocked.
9. Confirm Datazap references never become numeric parser evidence without a verified source file.

## 5B. Validate the closed revision-delivery loop

Use `/delivery/SP-1842` and `/portal/SP-1842/delivery?preview=alex` in demo first, then repeat against the synthetic Supabase project.

1. Create the next draft revision from `/reviews`.
2. Upload a tune artifact and confirm `tune_revision` is forced `internal` by the server regardless of requested visibility.
3. Confirm the file is immutable and tied to the exact revision.
4. Save separate internal QA notes and customer-visible change summary.
5. Choose `request_log`, `feedback_only` or `complete` explicitly.
6. Run delivery QA and confirm all delivery gates are deterministic and inspectable.
7. Confirm QA records the exact `primary_file_id` and SHA-256.
8. Approve the revision and confirm the file remains internal/customer-inaccessible.
9. Attach another tune file after approval and confirm release remains pinned to the originally QA-approved file.
10. Modify/replace the approved storage object in a controlled test and confirm the release hash check blocks delivery.
11. Deliver the approved revision and confirm file visibility, revision status, project state and delivery ledger advance atomically.
12. Confirm Gmail notification is staged only after the portal release transaction succeeds.
13. Keep Gmail provider send disabled and confirm portal delivery still succeeds independently.
14. Confirm the customer receives only the exact approved file through a short-lived signed URL.
15. Confirm customer receipt acknowledgement is recorded.
16. Confirm install acknowledgement opens the correct next step.
17. For `request_log`, upload a customer MHD CSV and confirm: pending log row → private object → immutable file registration → parser → project returns to `waiting_on=tuner` → `/reviews` queue.
18. Force a parser error and confirm the uploaded file is retained while Doug receives a parser-attention next action.
19. For `feedback_only`, confirm no log upload is requested automatically.
20. For `complete`, confirm install acknowledgement returns the project to Doug for final closeout.

Approval and delivery are intentionally separate states. No tune artifact becomes customer-visible at upload or QA time.

## 5C. Validate closeout, archive and future retunes

Use `/lifecycle`, `/closeout/SP-1842` and `/portal/SP-1842/history?preview=alex`.

1. Confirm migration `0014` creates Cycle 1 for existing projects and points `current_cycle_id` at it.
2. Confirm requirements, revisions, logs, files and events are assigned to the current cycle.
3. Save the completion summary + aftercare note.
4. Run closeout QA and confirm it blocks if the final install is not acknowledged.
5. Confirm unresolved logs or required prerequisites block closeout.
6. Confirm closeout QA re-reads the exact final tune artifact and verifies its SHA-256.
7. Approve closeout, then archive the tune.
8. Confirm final revision → `final`, delivery → `closed`, cycle → `completed`, project → `completed` in one database transaction.
9. Confirm the completion Gmail message is staged only after the archive transaction succeeds.
10. Confirm a 7-day follow-up row is scheduled when enabled.
11. Confirm the follow-up worker stages a Gmail draft only and cannot provider-send it.
12. Confirm customer tune history exposes only customer-safe package items.
13. Start Cycle 2 using a hardware/fuel change.
14. Confirm Cycle 1 revisions/logs/files/events remain unchanged and queryable through the archive.
15. Confirm the active project surfaces only Cycle 2 requirements/revisions/logs/files/events while messages remain continuous across cycles.
16. Confirm `/lifecycle` lists the retune as an active Cycle 2.

See `docs/tune-lifecycle.md` for the lifecycle-specific operator/runbook details.

## 6. Prove identity boundaries

1. Configure public Supabase auth variables.
2. Create Doug as an `owner` in `internal_users`.
3. Create a synthetic customer auth user mapped in `customer_portal_users`.
4. Enable internal auth in preview first.
5. Confirm Doug can access tuner/admin routes, including `/intelligence`, `/log-lab`, `/reviews`, `/delivery/SP-1842`, `/closeout/SP-1842`, `/lifecycle`, `/intake-queue`, `/messages`, `/outbound`, `/go-live` and live workspaces.
6. Confirm the customer can access only their portal-visible project/file/message/delivery/history data.
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
8. Confirm generic File Manager upload cannot make a `tune_revision` customer-visible.
9. Confirm only the approved revision-delivery release can switch a tune artifact from internal to customer visibility.

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

Revision delivery uses the same separation: portal release is authoritative; the customer-notification email is staged afterward and provider send remains separately gated.

Closeout/follow-up uses the same rule: archive is authoritative; completion/follow-up messages are staged afterward and remain approval-gated.

The intake invitation also uses the same approval boundary. Its raw secure intake link is created only immediately before provider send.

## 16. Cutover completion criteria

The deployment is operational only when all of these are true:

- database parity passed
- migration ledger shows 0001–0014
- vehicle intelligence representative tests passed
- datalog intelligence sample-log validation passed
- Review Cockpit decision/replay validation passed
- Datazap reference boundary passed
- revision artifact pin/hash/atomic-release tests passed
- customer delivery acknowledgement passed
- customer next-log upload → parser → Doug review return passed
- closeout QA/hash/atomic archive passed
- customer-safe tune history passed
- follow-up draft-only boundary passed
- Cycle 2 retune preserves Cycle 1 history and scopes active project records correctly
- Doug internal identity passed
- customer isolation passed
- cross-boundary denial passed
- private file round-trip passed
- generic tune upload cannot bypass revision release
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
5. Set `SUBPAR_FOLLOWUP_AUTOMATION_ENABLED=false` if lifecycle follow-ups are being staged unexpectedly.
6. Leave signed Wix receipt capture on only if diagnosis needs provider events recorded.
7. Do not delete integration history, intelligence profiles, parser profiles, review sessions, revision-delivery records, tune-cycle records, closeouts or project history. Pause and inspect the ledgers.
8. Never make an approved tune file public manually to work around a delivery problem; fix the QA/release failure and rerun the controlled flow.
9. Never move historical revisions/logs/files manually between tune cycles to “clean up” a retune.
10. Never “fix” a duplicate/conflict by deleting customer/tune history blindly.

Every live capability is designed to pause independently without taking the dashboard offline.
