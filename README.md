# Subpar OS

Independent Subpar Tuning application for Doug Talmadge. Do not merge with or deploy over Stince-AI.

## Current product preview

Subpar OS is now a connected end-to-end tuning operations demo rather than a collection of isolated mockups.

### Main dashboard
- operations dashboard and priority queue
- new orders / intake
- datalog review queue
- tune revisions
- Gmail-style customer messages
- customer CRM
- vehicle garage / history
- customer portal list
- closed tune archive
- E85 calculator
- integration readiness
- system / production-readiness audit
- mobile command center
- vehicle-aware Automation Studio

### Deep workflow demos
- `/intake/SP-1846` — Wix order → intake → compatibility → project readiness
- `/project/SP-1842` — full tuner project workspace
- `/log-review/SP-1842` — datalog review and revision decision
- `/revision/SP-1842` — Rev 5 build + customer delivery
- `/portal/SP-1842` — customer-facing project portal
- `/workflow/SP-1842` — tuner/customer handoff simulator
- `/closeout/SP-1842` — final QA, delivery, archive and reopen flow
- `/automations` — automation rule studio
- `/mobile` — phone-first command center
- `/preview` — Doug-facing social/share preview

## Product model

Customer → Vehicle → Order → Tune Project → Revision → Log → Conversation / Event / File

The production build should preserve immutable revision/log history and keep customer-visible content separate from tuner-only notes, rules and calibration context.

## Stack
- Next.js 15.5.24
- React 19
- Vercel
- lucide-react
- future isolated Supabase project for database, auth and storage

## Production target
Vercel project: `subpar`
Project ID: `prj_geNsYFLFvD1uwLq7rKdVSdEW3tX1`

## Isolation / data gate
- Subpar OS remains technically isolated from Stince-AI.
- Do not reuse Stince-AI environment variables, Supabase, OAuth credentials, storage or deployment history.
- Current records are synthetic demo data.
- Live Wix, Gmail, MHD, bootmod3, EcuTek, Datazap, customer, tune-file and credential ingestion stays disabled until the corrected Jeff Stinson / Doug Talmadge NDA and live-data approval gate are satisfied.

See `docs/product-audit.md` and `docs/automation-spec.md` for the current production gap and workflow requirements.
