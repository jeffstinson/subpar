# Subpar OS Data Core

## Purpose

This layer lets the current synthetic product move into production persistence without rewriting every screen. It deliberately keeps Subpar isolated from Stince AI.

## Domain graph

Customer → Vehicle → Order → Tune Project → Revision → Log

Project-related records:
- requirements
- files
- conversations/messages
- immutable events
- automation runs

## Runtime modes

`SUBPAR_DATA_MODE=demo`
- current default
- reads normalized synthetic records
- all outbound/persistent mutations are dry-run only

Future `SUBPAR_DATA_MODE=supabase`
- must use a dedicated Subpar Supabase project
- server-only service credentials
- no Stince AI environment variables, tables, buckets or OAuth clients

## API

- `GET /api/v1/dashboard`
- `GET /api/v1/projects`
- `GET /api/v1/projects/:id`
- `GET /api/v1/customers`
- `GET /api/v1/vehicles`
- `GET /api/v1/system`
- `POST /api/v1/actions` — dry-run until a persistent mutation adapter is explicitly enabled

## Workflow state machine

Project transitions are defined in `app/server/workflow.js`. Invalid stage jumps are rejected before a future database mutation is attempted.

## Database

`supabase/migrations/0001_core.sql` defines:
- customer/vehicle/order/project relations
- revisions/logs/files
- conversations/messages
- immutable events
- requirements
- automation rules/runs
- integration sync state
- webhook receipt/idempotency records
- indexes
- row-level security enabled by default

No browser-access RLS policies are defined yet. That is intentional: authenticated internal/customer roles should be designed before any live customer data is exposed.

## Live-data gate

Do not enable live mode until:
1. dedicated Subpar Supabase project exists;
2. auth/RLS policies are reviewed;
3. storage buckets are isolated;
4. NDA/data approval is complete;
5. Wix/Gmail credentials are Subpar-specific;
6. webhook verification and idempotency are implemented;
7. synthetic seed/smoke tests pass before real records are ingested.
