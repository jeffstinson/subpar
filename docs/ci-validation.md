# Subpar OS CI / Regression Gates

Subpar OS has an independent GitHub Actions quality gate so repository health can be proven even when Vercel is rate-limiting deployments.

A green CI run does **not** mean a commit is deployed. Deployment status is verified separately.

## Workflow

`.github/workflows/subpar-ci.yml`

Runs on:
- pushes to `main`
- pull requests
- manual workflow dispatch

The workflow always runs with demo data/auth and every dangerous integration/mutation gate disabled.

## Gate 1 — Repository invariants

Command:

```text
npm run validate:repo
```

Implemented by `scripts/validate-repo.mjs` using only Node's standard library.

It fails the build if any of these drift:
- exactly one migration exists for every version `0001–0016`
- no duplicate or missing migration versions
- expected migration filenames match the canonical manifest
- `.env.example` defaults to demo mode with mutation/auth/live-provider gates OFF
- repository/Go Live/Activation schema manifests agree on `0016`
- `/activation` and `/validation` remain internal-protected routes
- portal auth boundary remains present
- archive final-download path remains customer-authenticated and pinned to the closeout final file
- operational-integrity RPC remains service-role only
- tuner-library publish RPC remains service-role only
- tuner-library tables remain included in schema preflight
- critical API routes still exist

This validator already caught a real pre-provisioning defect: two migration files had both been numbered `0011`. Since no Subpar Supabase project had been provisioned, the tuner-library migration was safely moved to `0016_tuner_library.sql` and the duplicate `0011_tuner_library.sql` was removed.

## Gate 2 — Production build

Command:

```text
npm run build
```

This compiles the real Next.js production application. It catches server/client import issues, route compilation failures, CSS module errors and other build-time regressions without requiring live Wix/Gmail/Supabase credentials.

## Gate 3 — Built-app demo smoke

After the production build, CI starts it locally on port 3000 and runs:

```text
npm run smoke:demo
```

The smoke suite verifies:
- `/api/health`
- `/api/v1/readiness`
- internal dashboard API with the demo owner principal
- SP-1842 repository/project API
- customer tune-history API
- archived final-tune download stays dry-run with no signed URL in demo mode
- generic action endpoint stays dry-run
- Activation Audit is reachable
- Activation Audit sees schema `0016`
- synthetic code foundation passes
- real-data gate remains closed

## Local reproduction

Use the same order as CI:

```text
npm install
npm run validate:repo
npm run build
npm run start -- -p 3000
npm run smoke:demo
```

The server should be started with the safe demo defaults from `.env.example` or equivalent environment variables.

## Deployment status is separate

CI answers:
> Does this commit satisfy repository invariants, compile, boot and pass safe runtime smoke?

Vercel answers:
> Was this exact commit accepted and deployed by the production hosting project?

Do not call a commit live solely because CI passed. Conversely, a Vercel `build-rate-limit` status is a hosting-capacity rejection and should not be described as a compiler failure unless CI or an accepted Vercel build also reports one.

## Go-live use

Before recording `production_activation`:
1. the exact release commit should have a green Subpar OS CI run
2. schema/database integrity must pass `/activation`
3. Wix/Gmail provider evidence must be current
4. historical reconciliation/replay/history/outbound checkpoints must be complete
5. the exact release commit's Vercel deployment must be separately verified
