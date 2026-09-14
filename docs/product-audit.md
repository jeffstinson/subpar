# Subpar OS Product Audit

Date: 2026-09-14

## Audit scope

Reviewed the current Subpar OS demo after the premium BMW-focused redesign, including the main dashboard, Vehicle Garage, mobile behavior, intake/project/log/revision/customer/closeout flows, navigation, visual consistency, synthetic data boundaries, asset strategy, calculator logic, deployment health and production-readiness gaps.

This audit intentionally separates **demo quality** from **production readiness**. The current build is suitable for Doug Talmadge to evaluate the workflow and product direction, but real customer/tune data remains gated.

---

## Executive result

### Product / design: PASS for stakeholder preview
The application now reads as one premium BMW tuning operating system rather than a collection of wireframes. The dashboard, queue, garage, intake, log review, revision delivery, customer portal and closeout tell one coherent story.

### Workflow completeness: PASS for synthetic end-to-end evaluation
A tune can be followed visually from paid order through intake, project creation, datalog review, revision delivery, customer handoff and final closeout.

### Production data layer: NOT YET ENABLED by design
Persistence, authentication, file storage, Wix/Gmail connections and tuning-platform ingestion are intentionally not live yet.

---

## Changes completed in this audit pass

### Premium visual system
- Main dashboard uses a darker automotive presentation with restrained Subpar green.
- Vehicle Garage uses large photography-driven cards and a dedicated vehicle detail surface.
- Main information hierarchy is clearer: status, owner, next action, vehicle, platform, fuel and revision.
- Deep workflow routes receive a matching premium visual overlay through `app/premium-flows.css`.
- Mobile layouts remain available for the dashboard and deep workflow pages.

### Chassis-aware E85 calculator
Added a dedicated `/calculator` route with a maintained vehicle/tank database in `app/lib/fuel-vehicles.js`.

The calculator now supports:
- BMW/Toyota model + chassis selection.
- Factory fuel-tank capacity loaded automatically.
- Model year and engine-family context.
- Manual `My car isn’t listed` mode.
- Current gallons in tank.
- Current ethanol percentage.
- Actual measured E85 percentage.
- Pump-gas ethanol percentage.
- Target blend presets and custom target.
- Gallon and liter outputs.
- Quarter / half / three-quarter / full quick volume controls.
- Achievability detection instead of silently clamping an impossible target.
- Final estimated blend verification.

Vehicle families currently covered:
- E9X / F3X / G20 3 Series performance cars.
- F22/F23/G42 M235i/M240i.
- F87/G87 M2.
- F80/G80 M3.
- F82/F83/G82/G83 M4.
- G30 540i/M550i and F90 M5.
- G01/G02 X3/X4 M40i.
- F97/F98 X3M/X4M.
- G05/G06 X5/X6 40i.
- F95/F96 X5M/X6M.
- G29 Z4 M40i.
- A90/A91 Toyota GR Supra 3.0.

Tank capacities were cross-checked against published BMW Group / Toyota specifications for the representative chassis families used by the calculator. Manual mode remains available because usable volume can vary with modified tanks/fuel cells and some market-specific configurations.

---

## Route inventory

| Route | Purpose | Audit state |
| --- | --- | --- |
| `/` | Unified internal tuning dashboard | PASS |
| `/preview` | Shareable Doug-facing product preview | PASS |
| `/mobile` | Mobile command center | PASS |
| `/automations` | Vehicle-aware automation studio | PASS / synthetic |
| `/calculator` | Chassis-aware E85 calculator | PASS |
| `/intake/SP-1846` | Paid order → intake → compatibility | PASS / synthetic |
| `/project/SP-1842` | Internal tune project workspace | PASS / synthetic |
| `/log-review/SP-1842` | Log review / comparison / decision | PASS / synthetic |
| `/revision/SP-1842` | Revision creation + delivery | PASS / synthetic |
| `/portal/SP-1842` | Customer-facing portal | PASS / synthetic |
| `/workflow/SP-1842` | Tuner/customer handoff simulator | PASS / synthetic |
| `/closeout/SP-1842` | Final QA / archive / reopen | PASS / synthetic |
| `/api/health` | Deployment/integration-mode health | PASS |

---

## UX audit

### Strong
- The first question remains tuner-first: **what needs Doug right now?**
- Queue ownership clearly distinguishes Doug vs customer waiting states.
- Vehicle identity is first-class rather than buried under an order number.
- MHD, bootmod3 and EcuTek can share one operational queue without pretending they are the same platform.
- Garage photography materially improves customer/vehicle recognition.
- Customer portal removes internal tuner notes and raw automation detail.
- Revision and closeout screens preserve immutable history rather than overwriting the previous state.
- Mobile command view supports a fast “check what needs attention” workflow.
- The dedicated calculator now behaves like a BMW tuner utility instead of a generic math form.

### UX debt / recommendations
1. **Route-per-view architecture:** several main dashboard sections still use local SPA state instead of first-class URLs. Deep workflow routes already use real URLs. Queue, Garage, Messages, Customers, Integrations and Audit should eventually become route-addressable too.
2. **Typography floor:** premium layouts still use some 8–9px metadata labels. Keep the condensed uppercase style, but raise important operational text to a minimum ~10–11px on desktop and ~11–12px on mobile.
3. **Keyboard/accessibility:** most clickable surfaces are buttons/links, but a later accessibility pass should add labels/tooltips to icon-only controls and verify focus states on every custom card.
4. **Vehicle photo consistency:** current dashboard photography is externally hosted and visually strong, but a production build should use a curated, licensed, locally controlled image set so URLs/crops cannot change unexpectedly.
5. **Time-aware greeting:** dashboard greeting is currently presentation copy rather than a timezone-aware value. Make it dynamic once user/profile settings are persistent.

---

## Functional audit

### Main dashboard
PASS for demo.

Working:
- Global search.
- Tune queue filters.
- New tune modal.
- Notifications.
- Activity feed.
- Vehicle Garage cards.
- Order/intake visibility.
- Customer ownership states.

Still synthetic:
- Sync activity.
- Revenue metrics.
- New tune persistence.
- Notification read state.

### Vehicle Garage
PASS for demo.

Working:
- Photography-led cards.
- Vehicle search/filter presentation.
- Customer, chassis, engine, platform and status context.
- Deep-link behavior to modeled projects.

Production gap:
- Vehicle records are not yet backed by persistent customer/vehicle tables.
- Vehicle photos should eventually be customer-uploaded or curated per chassis rather than remote stock URLs.

### E85 calculator
PASS after rebuild.

Logic safeguards:
- Current fuel is capped at selected tank capacity.
- Tank space is calculated automatically.
- Blend equation accounts for ethanol already present in the tank.
- Pump gasoline ethanol percentage is not assumed to be fixed.
- “E85” percentage is editable.
- Impossible fill-to-full targets are surfaced with an achievable E-range rather than returning a misleading clamped result.
- Manual tank mode covers unlisted or modified cars.

Important product note:
The result is a fuel-mixing estimate. It should not imply that a given ethanol content is safe for a customer’s tune, fuel system or hardware. Tune/fuel compatibility remains Doug’s decision.

---

## Technical audit

### Pass
- Next.js App Router under `app/` is the active application.
- Vercel project remains isolated as `subpar`.
- Next.js remains on 15.5.24.
- Duplicate root app shell was removed.
- Main synthetic dataset is centralized in `app/lib/demo-data.js`.
- Fuel/chassis presets are isolated in `app/lib/fuel-vehicles.js` rather than embedded in UI code.
- Loading/error/not-found boundaries exist.
- `/api/health` is present.
- Main dashboard styling is scoped with `os-` classes.
- Deep flow visual polish is layered separately rather than rewriting all workflow behavior.

### Technical debt
1. `app/subpar-logo.png/route.js` remains a compatibility redirect because the logo binary is not yet in a conventional `public/` asset location.
2. Vehicle photos currently use remote Unsplash URLs and regular `<img>` elements. Production should move to locally controlled/licensed assets and `next/image` where appropriate.
3. Deep workflow screens still own their own local scenario state instead of reading one shared project object.
4. Some main dashboard views are local state tabs rather than route segments.
5. There is no automated test suite yet for workflow transitions or calculator math.
6. No production telemetry/error reporting is connected yet.

---

## Security / data audit

### Current demo state: LOW DATA RISK
- Synthetic customer data only.
- No Wix credentials.
- No Gmail OAuth tokens.
- No tune files from real customers.
- No real datalogs.
- No customer authentication surface exposed as if it were secure.

### Required before live data
- Isolated Subpar Supabase project.
- Internal authentication for Doug/team.
- Customer portal authentication or expiring magic-link model.
- Row-level authorization.
- Server-side credential storage only.
- Storage access policies for tune files/logs.
- Audit events for file access, revision delivery and automated messages.
- Webhook signature verification.
- Idempotent order/event processing.
- Rate limits on externally accessible endpoints.
- Backup/recovery procedure.

---

## Performance audit

### Current
Acceptable for stakeholder preview.

### Before production
- Replace externally hosted garage photos with optimized controlled assets.
- Adopt `next/image` for large automotive photography.
- Lazy-load off-screen vehicle imagery.
- Route-split large operational screens instead of keeping every dashboard view in one client bundle.
- Move large synthetic/static datasets out of the root client component as server-backed data becomes available.
- Monitor bundle size after integrations and charting libraries are added.

---

## Production backend required

### Database
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
- team roles later if needed
- customer portal authentication
- internal-only vs customer-visible field boundaries

### Files
Separate Subpar storage for:
- stock/source files
- tune revisions
- datalogs
- parameter packs
- customer attachments

### Wix
- paid-order webhook
- customer matching
- product mapping
- idempotent project creation
- order reconciliation

### Gmail
- Doug OAuth
- thread matching
- inbound/outbound sync
- EcuTek alert parsing
- durable provider message IDs

### Log pipeline
- MHD CSV parser first
- channel alias normalization
- versioned parameter-pack validation
- metric/flag extraction
- Datazap association
- BM3/EcuTek ingestion strategy

### Automation engine
Production rules need:
- enable/disable
- dry-run
- idempotency key
- audit trail
- versioning
- retry state
- manual override
- explanation of why each rule fired

---

## Recommended next production order

1. Doug validates this premium synthetic build and terminology.
2. Complete the NDA/data gate.
3. Create isolated Supabase auth/database/storage.
4. Convert dashboard tabs to first-class routes while moving data server-side.
5. Persist customers/vehicles/orders/projects.
6. Connect Wix paid orders.
7. Connect Gmail sync/send.
8. Implement storage for stock files, revisions and logs.
9. Build MHD-first parser + parameter pack validation.
10. Persist automation rules and runs.
11. Add BM3/EcuTek/Datazap ingestion paths.
12. Add telemetry, automated tests, backups and recovery procedures.

## Current conclusion

The current Vercel build is now strong enough to show Doug as a cohesive product concept and workflow prototype. The highest-value next work is persistence and real integrations—not adding more disconnected mock screens. Design refinement can continue in parallel, especially typography, controlled vehicle photography and route-level navigation.