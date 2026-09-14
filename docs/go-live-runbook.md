# Subpar OS Go-Live Runbook

This runbook is for the dedicated Subpar environment only. Never reuse Stince AI Supabase, OAuth, storage, webhook, Vercel, Wix, Google or cron credentials.

For the final cutover procedure and guarded production checkpoint, also read `docs/production-activation-runbook.md`.

## 1. Provision isolated infrastructure

1. Create the dedicated Subpar Supabase project.
2. Add the Subpar-only server URL/service-role key plus public anon key to the Subpar Vercel project.
3. Create the private storage buckets defined in `.env.example`.
4. Generate a strong server-only `SUBPAR_FILE_TICKET_SECRET`.
5. Keep real-data, import apply, Wix apply, Gmail sync/send and follow-up automation gates OFF.

## 2. Apply migrations in order

Current schema head: `0015_activation_readiness`.

Run `0001_core.sql` through `0015_activation_readiness.sql` in numeric order. Never skip a migration and never run them against another project.

After provisioning, `/go-live`, `/persistence`, `/security`, `/activation` and `/api/health` must all agree that the schema head is `0015`.

## 3. Seed synthetic data and prove parity

1. Temporarily allow the deterministic synthetic seed in the isolated Subpar database.
2. Switch reads to Supabase while real-data/provider mutation gates remain OFF.
3. Confirm customer, vehicle, order and project counts match the seed manifest.
4. Confirm SP-1842 and SP-1846 render from Supabase rather than demo memory.
5. Disable synthetic seeding after parity is proven.

## 4. Validate identity and private storage

Create Doug as owner and a synthetic portal customer.

Prove:
- owner/tuner/staff/customer role boundaries
- customer denial from internal routes/APIs/files
- session refresh/logout/expiry
- signed private upload/finalization/download
- tune revisions remain internal until QA-approved release
- archived final tunes are downloadable only through the closed-cycle archive endpoint

## 5. Validate vehicle/log intelligence

With Doug-approved representative examples, verify:
- G20/B58TU/MHD
- F82/S55/BM3
- G80/S58/EcuTek
- unknown combinations fall back to manual review

Then validate MHD parser aliases/units/required channels/flags using real approved sample logs for B58, B58TU, S55 and S58. The parser remains assistive and never approves a calibration.

## 6. Validate the complete synthetic tuning lifecycle

Prove this whole path before real customer data:

`paid order → intake invitation → customer intake → compatibility approval → project → private log → parser → Review Cockpit → Rev N+1 → private tune file → QA/hash → approval → atomic delivery → customer install → next log → review → final delivery → closeout → archive → archived final download → Cycle 2 retune`

Required integrity checks include:
- review comparisons never silently cross tune cycles
- archived-cycle review mutations are rejected
- generic tune uploads cannot bypass delivery controls
- QA pins exact file ID + SHA-256
- release rechecks the exact artifact
- closeout rechecks final artifact integrity
- Cycle 2 does not rewrite or expose Cycle 1 internal history
- customer messages remain continuous across cycles
- follow-up automation stages Gmail drafts only

Record `synthetic_end_to_end` passed before removing synthetic fixtures.

## 7. Run Production Activation audit

Open `/activation`.

The audit separates:
- code foundation
- infrastructure
- provider readiness
- historical reconciliation
- safe-for-live-data state
- full production state

Migration `0015` installs a service-only operational integrity probe. All blocking counts must be zero before cutover, including cross-cycle ownership problems, customer-visible tune files that bypassed release, delivery/file hash mismatches, closeout/file mismatches, archived logs still in active queues and sent email lacking approval.

## 8. Configure Wix/Gmail and test connections

Set `SUBPAR_CONNECTION_TESTS_ENABLED=true` only after credentials are configured.

Connection testing is intentionally separate from ingestion. It can prove:
- Wix site-scoped OAuth
- Gmail OAuth refresh + mailbox profile access

without enabling Wix historical reads/apply, Gmail history sync or Gmail provider send.

Run Provider Preflight from `/activation` and require PASS evidence for Wix and Gmail in the connection-test ledger.

## 9. Historical import dry-run

Wix recommendation: 36-month lookback, resumable pages.
Gmail recommendation: 24-month lookback, resumable thread/message pages.

For every record classify matched / would-create / skipped / conflict / failed. Never auto-merge conflicting identities, overwrite VIN/chassis conflicts or guess between multiple candidate projects.

## 10. Apply and reconcile history

After dry-run approval only:
1. enable real-data approval
2. enable mutations
3. temporarily enable historical import apply
4. apply Wix history
5. reconcile counts
6. apply Gmail history
7. reconcile counts
8. disable import apply again

Record `historical_reconciliation` passed only when there are zero unexplained records.

## 11. Enable live providers in order

Wix:
1. signed webhook ingress ON, apply OFF
2. replay one signed event and prove one receipt/effect
3. record `wix_replay` passed
4. then enable live apply

Gmail:
1. capture cutover history ID
2. enable read sync
3. prove normal history resume
4. prove expired-history fallback
5. record `gmail_history` passed

Outbound Gmail comes last:
`compose → draft → owner/tuner approval → provider send → provider ID → history`

Record `outbound_email` passed only after idempotency/recovery is proven.

## 12. Final production activation

Run `/activation` again with provider preflight.

The `production_activation` checkpoint is server-guarded and cannot be forced through the browser. It re-runs the activation audit and refuses PASS unless there are zero blockers and the required historical/provider/replay/outbound evidence is complete.

Only after this checkpoint passes should the deployment be considered fully operational.

## Rollback

Disable the narrowest affected gate first:
- Gmail provider send
- Wix apply
- Gmail sync
- historical import apply
- Wix reads if necessary

Do not delete webhook receipts, import ledgers, messages, revisions, logs, tune cycles, deliveries, closeouts, audit runs or customer history to repair a mismatch. Pause the capability, inspect the ledger and reconcile the cause.
