# Task 13 Foundation Portability Sign-off

Date: `2026-06-27`
Representative entity: `provider_profiles`

## Quality gate result

Task `13` foundation verification passed with the current Phase 0 baseline.

- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm build`
- `corepack pnpm test:unit`
- `corepack pnpm openapi:lint`
- `corepack pnpm openapi:check`
- `corepack pnpm test:rules`
- `corepack pnpm test:contract`
- `corepack pnpm test:contract:firestore`
- `corepack pnpm firestore:indexes:check`
- `corepack pnpm smoke:health`
- `corepack pnpm portability:rehearsal`

## Boundary review

- `packages/domain` and `packages/application` were scanned for `@google-cloud`, `firebase-admin`, and `firebase`.
- Result: no matches in source or package manifests.
- Infrastructure-only Firebase/Firestore usage remains isolated to `packages/infrastructure`.

## Contract verification

- The shared `ProviderProfileRepository` contract suite passes for the in-memory adapter.
- The emulator-backed Firestore adapter passes the same six contract cases.
- Additional Firestore mapping coverage confirms `Timestamp`, `null`, soft-delete, and version persistence behavior.
- `provider_profiles` has no money fields, so money mapping was recorded as not applicable for this representative adapter.

## Portability rehearsal

- Canonical sample export: `tests/fixtures/portability/provider_profiles.jsonl`
- Local import targets: PostgreSQL 16 and MongoDB 7 via Docker containers
- Verified fields: record counts, IDs, `ownerUserId` references, timestamps, null semantics, schema version, and record version
- Result: zero unexplained mismatches across the canonical JSONL sample and both imported stores

## Residual risks and owners

- Firestore emulator runs emit a non-fatal Google metadata lookup warning before the emulator transport settles. Owner: Platform engineering.
- The rehearsal currently covers `provider_profiles`, which exercises filtering, soft delete, versioning, and references but not money fields. Extend the portability suite to a money-bearing entity before pricing/payment migration work. Owner: Platform + Payments.
