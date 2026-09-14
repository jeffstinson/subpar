# Subpar OS Tune Lifecycle / Closeout Runbook

This runbook covers migration `0014_tune_lifecycle_closeout.sql` and the production workflow after a final revision is delivered and installed.

## Goal

One permanent customer + vehicle + project can contain multiple tuning cycles without rewriting prior calibration history.

Example:

`Cycle 1 — stock turbo E40 → Rev 1…5 → completed`

Later:

`Cycle 2 — hybrid turbo + HPFP E50 → Rev 6…N → completed`

Revision numbers continue forward because `revisions(project_id, revision_number)` remains globally unique. Cycle boundaries provide the historical grouping.

## Data model

` tune_cycles `
- one row per tuning cycle
- current project points at `tune_projects.current_cycle_id`
- new project-owned requirements/revisions/logs/files/events automatically inherit the current cycle through the database trigger

` project_closeouts `
- one closeout per tune cycle
- pins the final revision and exact final file
- stores the final SHA-256, baseline snapshot, package manifest, customer summary, aftercare guidance and QA snapshot

` lifecycle_followups `
- one optional post-closeout follow-up per closeout
- scheduled independently from Gmail provider send
- automation can only stage a Gmail draft; it cannot bypass owner/tuner approval or the Gmail send gate

## Final closeout sequence

1. Customer installs the final delivered revision.
2. The revision delivery record contains `installed_at`.
3. Doug opens `/closeout/<project-number>`.
4. Save customer completion summary + aftercare guidance.
5. Select follow-up delay (default 7 days, 0 disables it).
6. Run Closeout QA.
7. QA must prove:
   - active/current tune cycle exists
   - final revision is delivered/final
   - exact final tune artifact exists
   - final file is immutable
   - final file is customer-visible from the completed revision delivery
   - SHA-256 is registered and re-readable from private storage
   - customer install is acknowledged
   - no unresolved datalogs remain in the current cycle
   - all required current-cycle prerequisites are complete/waived
   - customer completion summary exists
   - hardware/fuel-change guidance exists
8. Approve closeout as owner/tuner.
9. Archive the completed tune.
10. `subpar_close_tune_cycle` atomically changes:
    - final revision → `final`
    - final revision delivery → `closed`
    - tune cycle → `completed`
    - project → `completed`, `stage=complete`, `waiting_on=none`, `closed_at=now()`
    - closeout → `closed`
    - optional follow-up → `scheduled`
11. Only after the authoritative database close succeeds does Subpar OS stage the completion Gmail draft.

## Final package

Subpar OS stores a manifest rather than creating a permanent public ZIP.

The manifest records:
- exact final tune artifact
- customer-visible parameter/logging packs
- stock-file archive references
- completion summary
- aftercare guidance

Customer downloads still use short-lived signed storage URLs. Internal-only stock-file references are removed from the customer history API.

## Follow-up safety

Environment variables:

```text
SUBPAR_FOLLOWUP_AUTOMATION_ENABLED=false
SUBPAR_CRON_SECRET=
```

Worker endpoint:

```text
GET /api/v1/lifecycle/followups/run
Authorization: Bearer <SUBPAR_CRON_SECRET>
```

The worker:
1. finds due `scheduled` lifecycle follow-ups
2. creates an idempotent Gmail outbound action in `draft` state
3. marks the follow-up `drafted`
4. does not approve or provider-send the message

Do not enable the scheduler until Gmail identity/project matching and outbound approval have passed the main Go Live validation suite.

## Starting a future retune

Doug opens the archived closeout and selects Start next tune cycle.

Required input:
- reason (`hardware_change`, `fuel_change`, `retune`, `support`, etc.)
- change summary
- optional hardware notes
- optional new fuel target

`subpar_start_new_tune_cycle` then:
1. requires the existing project to be completed/closed
2. creates the next `tune_cycles` row
3. points `tune_projects.current_cycle_id` at the new cycle
4. clears `closed_at`
5. moves the project to compatibility review
6. seeds fresh current-cycle requirements for change review, compatibility and logging setup
7. adds a fuel-verification requirement when the fuel target changed
8. writes a cycle-start event

Old revisions, logs, files, events and the prior closeout remain assigned to Cycle 1 and are not deleted or renumbered.

## Cycle scoping

After migration 0014, the normal repository project read scopes these records to `current_cycle_id`:
- requirements
- revisions
- logs
- files
- events

Messages stay project-level so the full customer conversation remains continuous.

Historical cycles are surfaced through:
- `/lifecycle` — internal Lifecycle Center
- `/closeout/<project-number>` — closeout/retune cockpit
- `/portal/<project-number>/history` — customer-safe tune history

## Required synthetic validation

Before real customer data:

1. Complete Alex `SP-1842` Rev 5 delivery/install in preview.
2. Open `/closeout/SP-1842`.
3. Save closeout copy and run QA.
4. Verify all ten closeout gates pass.
5. Approve closeout.
6. Archive Cycle 1.
7. Verify customer history shows Cycle 1 and the customer-safe package only.
8. Verify a 7-day follow-up is scheduled but not provider-sent.
9. Stage the follow-up draft and confirm it enters the normal outbound approval queue.
10. Start Cycle 2 with a simulated hybrid turbo / fuel change.
11. Confirm Cycle 1 remains unchanged and queryable.
12. Confirm the active project now exposes only Cycle 2 requirements/revisions/logs/files/events.
13. Confirm customer messages remain continuous across cycles.
14. Confirm `/lifecycle` shows the retune as an active Cycle 2.

## Failure / rollback behavior

If closeout QA fails, do not override it. Resolve the specific gate.

If Gmail draft staging fails after archive, the tune remains correctly archived; email can be retried independently.

If follow-up staging fails, the follow-up record keeps the failure reason and the archived tune remains unchanged.

If a new cycle has already started, never move historical records manually between cycles. Inspect `current_cycle_id`, the cycle trigger and the project event ledger first.

Never delete Cycle 1 to “clean up” a retune. The entire point of the lifecycle model is to preserve the old calibration state for support, audit and future comparison.
