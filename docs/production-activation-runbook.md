# Subpar OS Production Activation Runbook

This is the final cutover runbook for the dedicated Subpar environment. It complements `docs/go-live-runbook.md` and is intentionally stricter: no real customer ingestion, Wix apply, or Gmail provider send is considered production-ready until `/activation` reports the corresponding evidence.

Never reuse Stince AI Supabase, OAuth, storage, webhook, Vercel, Google, Wix or cron credentials.

## 1. Provision the isolated Subpar stack

1. Create the dedicated Subpar Supabase project.
2. Configure Subpar-only server URL/service-role and public anon key in the Subpar Vercel project.
3. Configure the five private storage buckets and a 32+ character `SUBPAR_FILE_TICKET_SECRET`.
4. Keep these gates OFF:
   - `SUBPAR_REAL_DATA_APPROVED=false`
   - `SUBPAR_IMPORT_APPLY_ENABLED=false`
   - `SUBPAR_WIX_READ_ENABLED=false`
   - `SUBPAR_WIX_WEBHOOK_ENABLED=false`
   - `SUBPAR_WIX_APPLY_ENABLED=false`
   - `SUBPAR_GMAIL_SYNC_ENABLED=false`
   - `SUBPAR_GMAIL_SEND_ENABLED=false`
5. Keep follow-up automation OFF until closeout behavior is proven.

## 2. Apply schema 0001–0016 in order

Current schema head: `0016_tuner_library`.

Run, in order:

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
15. `0015_activation_readiness.sql`
16. `0016_tuner_library.sql`

Then open `/activation` and run the Subpar audit. The schema ledger must show every version through `0016`.

`0016` is intentionally the tuner-owned configuration library. It gives Doug versioned draft/review/publish control over logging recipes, parameter packs and workflow profiles. Do not enable customer automation around those assets until Doug-approved production revisions are published.

## 3. Prove identities and private files before real data

Create Doug as an owner in `internal_users` and at least one synthetic customer in `customer_portal_users`.

Enable auth in preview and prove:

- Doug can access internal tuner/admin routes.
- Customer cannot access `/activation`, `/validation`, `/go-live`, `/reviews`, `/delivery`, `/closeout`, `/lifecycle` or internal APIs/files.
- Customer can access only their own portal/project-visible records.
- login refresh, logout and session expiry behave correctly.
- each private storage lane supports signed upload → finalization → short-lived signed download.
- `tune_revision` uploads remain internal until revision QA/approval/release.

## 4. Run synthetic end-to-end proof

Before removing synthetic fixtures, prove the complete workflow:

`Wix-like paid order → intake invite → customer intake → compatibility approval → project activation → vehicle intelligence → log upload → parser → Review Cockpit → next revision → private tune artifact → QA → approval → portal release → install acknowledgement → next log → review → final delivery → closeout → archived signed final download → Cycle 2 retune`

Also prove:

- no cross-cycle automatic log comparison.
- archived-cycle review mutations are rejected.
- Cycle 2 does not expose Cycle 1 internal files.
- Cycle 1 final tune remains available through the archive-specific signed-download route.
- follow-up worker stages drafts only.

When complete, mark `synthetic_end_to_end` passed in `/activation`. After that, the fixtures may be removed without making future production audits fail.

## 5. Run operational integrity audit

Migration `0015` installs `subpar_operational_integrity_snapshot()`.

Every blocker count must be zero:

- projects missing current cycle
- project/current-cycle ownership mismatch
- multiple active cycles
- cycle-owned records missing a cycle
- customer-visible tune files that bypassed controlled delivery
- released delivery/file ownership or SHA mismatch
- closed closeout/file/revision mismatch
- completed project/current-cycle mismatch
- archived-cycle logs still queued as active work
- provider-sent outbound email without approval

Overdue follow-ups are warnings, not file/data-integrity blockers.

Mark `activation_integrity` passed only after the audit is clean.

## 6. Validate tuner-owned production library

Before customer automation sends logging assets or relies on a changed workflow profile:

1. Open the tuner library in demo/Supabase preview.
2. Create a draft from an existing logging recipe, parameter pack or workflow profile.
3. Review the snapshot and change summary.
4. Attach any private parameter-pack asset through the dedicated storage path.
5. Publish as Doug/owner-tuner.
6. Confirm the previous approved revision is retained as history/retired rather than overwritten.
7. Confirm the publish action is written to the tuner-library audit ledger.
8. Re-run CI and the synthetic workflow checks after publishing a meaningful workflow change.

The publish RPC is service-role only; authenticated browser roles cannot execute it directly.

## 7. Test Wix and Gmail credentials before ingestion

Set:

`SUBPAR_CONNECTION_TESTS_ENABLED=true`

This gate permits connection probes only. It does not enable Wix order reads/imports, webhook applies, Gmail history sync, or Gmail provider send.

From `/activation`, run Provider Preflight.

Wix proof:
- site-scoped OAuth token succeeds.
- token is never returned to the browser or stored in the audit ledger.

Gmail proof:
- refresh-token exchange succeeds.
- mailbox profile metadata can be read.
- no thread/message history is ingested by the connection probe.

The latest Wix and Gmail connection tests must both be PASS and less than 24 hours old for final activation. Then mark `provider_preflight` passed.

## 8. Dry-run historical imports

Still keep live apply/send gates OFF.

Wix:
- recommended initial lookback: 36 months
- paginate safely
- classify every order as matched / would-create / skipped / conflict / failed
- never auto-merge conflicting customer identities or overwrite VIN/chassis conflicts

Gmail:
- recommended initial lookback: 24 months
- dedupe by Gmail thread/message IDs
- match customer email first, then project context
- ambiguous projects go to manual review

Resolve every unexplained conflict before apply mode.

## 9. Apply and reconcile history

Only after dry-run results are approved:

1. Turn on `SUBPAR_REAL_DATA_APPROVED=true`.
2. Turn on `SUBPAR_MUTATIONS_ENABLED=true`.
3. Temporarily turn on `SUBPAR_IMPORT_APPLY_ENABLED=true`.
4. Apply Wix history in resumable batches.
5. Reconcile provider count vs scanned/created/matched/skipped/conflict/failed.
6. Apply Gmail history in resumable batches.
7. Reconcile again.
8. Turn `SUBPAR_IMPORT_APPLY_ENABLED=false` when backfill is complete.

No unexplained records are acceptable. Mark `historical_reconciliation` passed.

## 10. Enable live reads before provider actions

Wix:
1. Enable signed webhook ingress while apply remains OFF.
2. Replay the same signed event and prove one receipt/one planned effect.
3. Record `wix_replay` passed.
4. Only then enable Wix live apply.

Gmail:
1. Capture the cutover history ID.
2. Enable Gmail read sync.
3. Prove normal history resume.
4. Prove expired-history fallback.
5. Record `gmail_history` passed.

## 11. Enable Gmail provider send last

Required flow remains:

`compose → draft → owner/tuner approval → provider send → provider ID → Subpar history`

Prove idempotency/recovery and confirm a staff-created draft cannot bypass tuner/owner approval.

Record `outbound_email` passed.

## 12. CI / quality gate before final cutover

Open `/validation` and confirm the repository quality gate is green for the exact commit being considered for activation.

The GitHub Actions workflow must pass:

1. repository invariants
2. Next.js production build
3. demo runtime smoke

The repository validator enforces the unique, gap-free migration chain `0001–0016`, safe default environment gates, protected activation/portal boundaries, service-only RPCs and schema-manifest consistency.

A green CI run proves repository/build/runtime health. It does not by itself prove the Vercel deployment is live or that provider credentials are valid; those remain separate activation evidence.

## 13. Final production activation

Open `/activation` and run Provider Preflight, then run the Subpar audit again.

The `production_activation` checkpoint cannot be manually forced through. The server re-runs the activation audit and refuses a pass unless:

- zero blocking audit checks remain
- infrastructure is ready
- schema ledger is complete through `0016`
- stored Wix/Gmail connection evidence is PASS and fresh
- historical reconciliation is passed
- real-data approval is enabled
- Wix replay is passed
- Gmail history behavior is passed
- outbound-email behavior is passed
- the exact release commit passed CI

Only then press `Activate` for `production_activation`.

## 14. Rollback switches

If anything becomes suspicious after cutover, turn off the narrowest affected gate first:

- `SUBPAR_GMAIL_SEND_ENABLED=false`
- `SUBPAR_WIX_APPLY_ENABLED=false`
- `SUBPAR_GMAIL_SYNC_ENABLED=false`
- `SUBPAR_IMPORT_APPLY_ENABLED=false`
- `SUBPAR_WIX_READ_ENABLED=false` if historical/API reads themselves need to stop

Do not delete audit history, webhooks, integration ledgers, tune cycles, revisions, logs, deliveries, closeouts or messages to “fix” a discrepancy. Pause, inspect the ledger and reconcile the cause.

The dashboard can remain online while individual integration capabilities are disabled.
