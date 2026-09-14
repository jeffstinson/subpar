# Subpar OS — Integration Staging

This phase intentionally separates provider connectivity from workflow mutation.

## Safety order

1. Provision the dedicated Subpar Supabase project and run migrations `0001`–`0004`.
2. Validate synthetic persistence, auth, RLS and private storage.
3. Enable signed Wix webhook ingress with `SUBPAR_WIX_WEBHOOK_ENABLED=true` while `SUBPAR_WIX_APPLY_ENABLED=false`.
4. Replay Wix test events and confirm deterministic receipt/idempotency behavior.
5. Only then enable the Wix apply path in a later phase.
6. Configure Gmail OAuth and enable read sync before any outbound send capability.
7. Keep `SUBPAR_GMAIL_SEND_ENABLED=false` until draft/thread matching is production-proven.

`SUBPAR_REAL_DATA_APPROVED` is the global live-data gate and stays false until the project is approved for real customer data.

## Wix

Wix webhook payloads are JWTs. The receiver verifies the JWT with the Wix webhook public key before any processing. A verified event is then normalized into a provider-independent order/customer shape.

Receipt identity is stored in `webhook_receipts` with a unique `(integration, external_event_id)` boundary. Retries return successfully without duplicating order/project work. Raw Wix payloads are not stored by the integration ledger; only a small operational summary is persisted.

Current endpoint:

- `POST /api/v1/integrations/wix/webhook`

Current phase behavior:

- verify signed webhook
- create/check receipt
- normalize order/customer fields
- match existing customer/projects
- produce an apply plan
- mark receipt `planned`
- do **not** create/update customers, orders or projects yet

Official Wix references:

- https://dev.wix.com/docs/build-apps/develop-your-app/api-integrations/events-and-webhooks/about-webhooks
- https://dev.wix.com/docs/build-apps/develop-your-app/auth/verify-requests-received-from-wix

## Gmail

Gmail is modeled as conversation synchronization, not as a replacement inbox. Threads remain the primary conversation grouping. Messages are normalized and attached to the matching Subpar customer/project.

For mailbox change tracking, the intended live model is Gmail `watch` → Google Cloud Pub/Sub notification → Gmail `history.list` partial synchronization. The last successful `historyId` belongs in `integration_sync_state`. If Gmail returns `404` for an expired history cursor, the worker must perform a full sync and establish a new cursor.

Current staging endpoints:

- `POST /api/v1/integrations/simulate` (`provider: gmail`)
- `POST /api/v1/integrations/gmail/draft`
- `POST /api/v1/integrations/gmail/sync`

The draft endpoint never sends in this phase. It exists to prove recipient/project/thread composition before `SUBPAR_GMAIL_SEND_ENABLED` is ever turned on.

Official Google references:

- https://developers.google.com/workspace/gmail/api/guides/sync
- https://developers.google.com/workspace/gmail/api/guides/push
- https://developers.google.com/workspace/gmail/api/guides/threads

## Integration data model

Migration `0004_integration_staging.sql` adds:

- webhook receipt metadata and processed result
- `external_links` for provider ID ↔ Subpar record mapping
- `outbound_actions` for draft/approval/queued/sent lifecycle

All three are server-brokered. Browser sessions receive inspection access only where allowed by RLS.

## Preview surfaces

- `/integration-lab`
- `/api/v1/integrations/readiness`
- `/api/v1/integrations/ledger`
- `/api/health`

The Integration Lab runs synthetic Wix/Gmail data through the same normalization and matching functions used by the provider endpoints, without real customer data or outbound actions.
