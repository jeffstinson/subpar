# Subpar OS Product Audit

Date: 2026-09-14

## Audit scope

Reviewed the public demo architecture and all current workflow routes in `jeffstinson/subpar` with the goal of turning the product into one coherent working dashboard for Doug Talmadge.

## What was fixed in this pass

### 1. Unified the dashboard
The old main screen was a large legacy component wrapped by `app/page.js`, with DOM mutation used to make selected demo rows clickable. That was brittle and hard to extend.

The new `app/page.js` is now the actual dashboard shell with explicit state/navigation and proper links/actions. No DOM observer is required to make the primary dashboard usable.

### 2. Centralized synthetic data
Created `app/lib/demo-data.js` so customers, vehicles, projects, messages, integrations, automations and dashboard metrics are no longer scattered across multiple top-level dashboard constants.

Deep workflow pages still contain purpose-built synthetic data because they are scenario demos, but the main operating dashboard now has one source for its records.

### 3. Connected the major workflows
The dashboard now exposes every important phase:

1. New order / intake
2. Active tuner project
3. Datalog review
4. Revision creation / delivery
5. Customer portal
6. Tuner/customer handoff simulation
7. Final closeout / archive
8. Automation rules

### 4. Made the main dashboard functional
Working demo interactions now include:
- queue filtering
- priority ownership (`Doug` vs `Customer`)
- global search
- clickable notifications
- customer message selection and demo replies
- generic project drawer for all synthetic queue records
- new-tune modal
- E85 calculation
- customer / vehicle / portal / archive views
- integration readiness view
- production-readiness audit view
- deep workflow launcher

### 5. Added app-level resilience
Added:
- `app/loading.js`
- `app/error.js`
- `app/not-found.js`

These give the demo intentional loading, failure recovery and bad-route behavior.

### 6. Preserved data isolation
No real customer records, tune files, credentials or connected service data were introduced. The dashboard explicitly distinguishes demo readiness from production connectivity.

---

## Route inventory

| Route | Purpose | Current state |
| --- | --- | --- |
| `/` | Unified internal tuning dashboard | Working demo |
| `/preview` | Shareable Doug-facing preview | Working demo |
| `/mobile` | Mobile command center | Working demo |
| `/automations` | Vehicle-aware automation studio | Working demo |
| `/intake/SP-1846` | New Wix order → intake → compatibility | Working demo |
| `/project/SP-1842` | Full internal tune project | Working demo |
| `/log-review/SP-1842` | Log review / comparison / decision | Working demo |
| `/revision/SP-1842` | Revision build and delivery | Working demo |
| `/portal/SP-1842` | Customer-facing tune portal | Working demo |
| `/workflow/SP-1842` | Tuner/customer state handoff simulator | Working demo |
| `/closeout/SP-1842` | Final QA / archive / reopen | Working demo |

---

## UX audit

### Strong now
- Tuner-first question: “What needs Doug right now?”
- One dashboard spans MHD, bootmod3 and EcuTek.
- Customer and vehicle records are visible as durable objects.
- Queue ownership is explicit.
- Deep workflow screens are purpose-built instead of generic CRUD pages.
- Customer portal hides tuner-only reasoning.
- Mobile command center exists separately from desktop.
- Closeout preserves history rather than deleting a project from the workflow.

### Still production work
- Deep workflow pages are separate scenario states rather than reading one persistent project record.
- Some workflow buttons intentionally simulate actions with local React state/toasts.
- Generic queue records use a project drawer; only the Alex/Carlos scenarios have fully modeled deep routes.
- Customer authentication and authorization are not implemented.
- File controls are UI-only.

---

## Technical audit

### Pass
- Next.js App Router is active through `app/`.
- Vercel project remains isolated as `subpar`.
- Current Next.js version is 15.5.24.
- Dashboard no longer depends on the old root `page.js` wrapper.
- New dashboard code is scoped with `os-` CSS classes to avoid collisions with older demo styles.
- Responsive desktop/tablet/mobile rules are present.
- Loading/error/not-found boundaries exist.

### Cleanup debt
- Root-level legacy `page.js` and `layout.js` remain in the repository but are no longer required by the active `app/` dashboard. They can be removed once the new dashboard is fully accepted.
- `app/subpar-logo.png/route.js` is an unusual compatibility route used because the logo binary lives at repository root instead of `public/`. Move the actual logo into `public/` in a later binary-asset cleanup.
- Older `globals.css`, `app/extra.css` and `app/mobile.css` remain because deep demo routes still use those styles. Do not remove them until every deep screen has been migrated to the shared design system.

---

## Production backend required

### Database
Create an isolated Subpar Supabase project with durable tables around:
- customers
- vehicles
- orders
- tune_projects
- revisions
- logs
- files
- conversations
- messages
- events
- requirements
- automation_rules
- automation_runs
- integration_sync_state

### Identity
- Doug/internal auth
- customer account or secure magic-link portal auth
- row-level access boundaries
- internal-only vs customer-visible fields

### Files
Isolated Subpar storage buckets for:
- stock/source files
- tune revisions
- datalogs
- parameter packs
- customer attachments

Files should be immutable/versioned where appropriate and linked to the project/revision that produced them.

### Wix
- paid-order webhook
- customer matching
- tune-product mapping
- idempotent project creation
- order/customer reconciliation

### Gmail
- Doug OAuth
- customer-thread matching
- outbound sends through Doug's mailbox
- inbound message sync
- EcuTek alert parsing
- durable message IDs to avoid duplicates

### Log workflow
- CSV parser
- MHD channel aliases
- validation against Doug's versioned parameter packs
- metric normalization
- flags and comparisons
- Datazap URL association
- BM3/EcuTek ingestion strategy

### Automation engine
See `docs/automation-spec.md`.

Production rules need:
- enable/disable
- dry-run mode
- idempotency keys
- audit trail
- rule versioning
- retry/error state
- manual override
- visible reason for every action

### Reliability
- webhook/event idempotency
- durable job queue
- retries with caps
- sync locks where needed
- integration health/status
- structured audit events
- alerting for failed ingestion

---

## Recommended production order

1. Doug validates the full synthetic workflow and terminology.
2. Complete NDA/data gate.
3. Create isolated Supabase database/auth/storage.
4. Move shared synthetic model to typed server-backed project records.
5. Connect Wix paid orders and idempotent intake creation.
6. Connect Gmail sync/send.
7. Add file storage and revision/log upload paths.
8. Implement MHD-first parser + parameter-pack validation.
9. Persist automation rules/runs.
10. Add BM3/EcuTek/Datazap ingestion paths.
11. Replace remaining local-state demo actions with server mutations.
12. Add production telemetry, audit logging and backup/recovery procedures.

## Definition of “full working dashboard” for this stage

The preview is now full enough for Doug to evaluate the product as one operating system: every lifecycle phase has a working screen, all top-level operational areas exist, the main dashboard is connected, and synthetic interactions behave coherently.

It is not yet a production CRM/tuning system because persistence, authentication, file storage and external integrations are intentionally not connected. Those should only be added after Doug accepts the workflow and the real-data gate is cleared.
