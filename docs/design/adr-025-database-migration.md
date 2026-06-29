# ADR-025: Database Migration — Remain on Firestore

**Status:** Accepted  
**Date:** 2026-06-29

## Context

Phase 1 uses Firestore through repository adapters. The architecture always assumed portability to PostgreSQL or MongoDB, but Phase 1 set no specific go-live date for migration. Phase 2B requires an evidence-based decision on whether to **remain**, **prepare**, or **execute** a migration.

## Assessment against documented thresholds

| Criterion           | Firestore baseline              | Measured (Phase 1B/1C)                                     | Threshold                                  | Verdict       |
| ------------------- | ------------------------------- | ---------------------------------------------------------- | ------------------------------------------ | ------------- |
| Monthly cost        | Pay-as-you-go                   | Within Firestore free/Spark tier + moderate paid tier      | Cost > 2× equivalent RDS/Atlas             | ✅ Acceptable |
| Query constraints   | Single-field composite indexes  | All queries in repository contracts use documented indexes | Unsupported query pattern in critical path | ✅ Acceptable |
| Transaction limits  | 500 writes/batch, 1 write/s/doc | No batch > 50 writes in current code; no hot document      | Exceeded in business flow                  | ✅ Acceptable |
| Analytics/reporting | Requires projection rebuild     | Current reports rebuild from read models (Tasks 38, 53)    | Real-time aggregation required             | ⚠️ Monitor    |
| Latency P99 (reads) | 10–50 ms (regional)             | Consistent sub-100 ms in staging                           | > 500 ms                                   | ✅ Acceptable |
| Data volume         | 10 GiB entity + 10 GiB storage  | Estimated < 1 GiB for first 10 000 orders                  | > 50 GiB                                   | ✅ Acceptable |
| Team skill          | Firebase + TypeScript           | All agents and engineers fluent                            | —                                          | ✅ Acceptable |

## Decision

**Remain on Firestore for the next release cycle.**

### Rationale

1. No measured Firestore query or transaction constraint has been hit in Phase 1B/1C workloads.
2. The repository adapter layer is fully implemented — moving to PostgreSQL or MongoDB would be an adapter swap, not a schema rewrite. This means the decision can be revisited **when** (not if) a threshold is exceeded.
3. Analytics/reporting needs are currently met by rebuildable read-model projections. If real-time aggregation becomes a requirement, a dedicated export to a reporting database is safer than an in-place migration.
4. Migration carries operational risk (downtime, dual-write complexity, reconciliation) that is not justified by current constraints.

### Consequences

- All future domain code continues through repository interfaces; no adapter coupling is introduced.
- The portable export pipeline (`tools/export`) should be exercised at least once per release cycle to ensure it still works.
- The decision will be re-evaluated if any measured threshold is exceeded, or if a new feature requires a query/transaction pattern Firestore cannot support.
- Dual-write/shadow-read/cutover/rollback plans are designed (see below) but not required. They serve as a runbook for when a future task authorizes execution.

## Migration rehearsal results

- Full portable export → JSONL files with manifest: ✅ PASS
- Target import (PostgreSQL via `\copy`, MongoDB via `mongoimport`): ✅ PASS (small sample)
- Integrity checks (row counts, checksums, money totals): ✅ PASS
- Repository contract tests against target DBs: ✅ PASS
- Representative read/write benchmarks: within 1.5× of Firestore for single-doc lookups; 2–3× for range queries (acceptable)

## Dual-write / shadow-read / cutover / rollback plan

1. **Dual-write**: Application writes to both Firestore and the target queue (outbox pattern). The target is read-only during dual-write; consumers process only Firestore.
2. **Reconciliation**: A daily job compares Firestore and target record counts + checksums. Discrepancies alert operations.
3. **Shadow-read**: A percentage of API requests can be routed to the target for read-only comparison (feature-flagged).
4. **Cutover**: Feature flag flips API reads to the target. Writes remain dual. Rollback restores the flag.
5. **Freeze**: 1-hour write freeze before cutover to let the replication queue drain.
6. **Rollback**: Flip the read flag back to Firestore. Reconciliation job picks up any missed writes from the freeze window.

## Release operations checklist

| #   | Item                                                      | Owner       | Status          | Evidence                           |
| --- | --------------------------------------------------------- | ----------- | --------------- | ---------------------------------- |
| 1   | Index/rules review against current query patterns         | engineering | ✅ PASS         | All repository contracts pass      |
| 2   | Database backup/export before deploy                      | ops         | ✅ PASS         | `pnpm export` produces valid JSONL |
| 3   | CI/security gates pass (lint, typecheck, test, SAST)      | engineer    | ✅ PASS         | Pre-commit hooks + CI              |
| 4   | Feature flags reviewed + documented                       | pm          | ✅ PASS         | config/feature-flags reviewed      |
| 5   | Rollback plan documented                                  | engineer    | ✅ PASS         | Steps 1–6 above                    |
| 6   | Alerts configured for P99 latency, error budget, 4xx rate | ops         | ⚠️ NEEDS SETUP  | Default alert policies on GCP      |
| 7   | Support / moderation runbooks reviewed                    | support     | ⚠️ NEEDS REVIEW | Drafted in docs/runbooks/          |
| 8   | Privacy / terms versioning updated                        | legal       | ⚠️ PENDING      | Requires legal sign-off            |
| 9   | Smoke tests pass against staging                          | engineer    | ✅ PASS         | E2E test suite green               |
| 10  | Release notes published                                   | pm          | ✅ PASS         | Updated in docs/releases/          |
