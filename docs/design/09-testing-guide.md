# 09 — Testing Guide

## Source

- `3d-print-marketplace-SRS-firebase-portable-v1.md`: Sections 22, 25–31, 33
- Related: [Backlog](06-backlog.md), [Security Rules](07-security-rules.md)

## Goals

- deterministic Domain tests
- equivalent repository adapters
- critical buyer/provider/payment E2E
- negative security coverage
- safe file processing
- continuous export/import rehearsal
- API compatibility CI

## Pyramid

```text
                 E2E / Manual QA
              Contract / Integration
        Domain Unit / Policy / State Machine
```

## Unit tests

- Money/dimensions/IDs/date
- order state machine
- proposal acceptance
- pricing/rounding
- eligibility reasons
- capacity reservation
- permissions
- quote expiry/lock
- refund/payout calculation
- review/content eligibility
- retention decisions

Rules:

- no emulator
- fake clock/UUID
- fake ports
- table-driven transitions
- property testing for pricing invariants when useful

## Integration tests

- API + Application + in-memory/emulator repository
- Firestore transaction/concurrency
- Storage upload completion
- Auth identity mapping
- Payment sandbox/webhook
- Outbox/notification
- Search projection
- Job retry/dead-letter

No production credential.

## Repository contract suite

Runs against:

- in-memory
- Firestore
- PostgreSQL
- MongoDB

Cases:

- CRUD
- expected-version conflict
- soft delete
- filters
- stable cursor
- transaction
- uniqueness/reservation
- date/money mapping
- null semantics
- schema version
- export iteration

## API contract

- request/response OpenAPI validation
- generated client smoke
- stable error codes
- unknown enum
- cursor
- idempotency replay
- breaking-change diff
- sensitive field exclusion

## Security tests

### Auth/authz

- no/invalid/expired token
- suspended account
- missing identity mapping
- role escalation
- unrelated order
- staff KYC scope
- organization isolation

### File

- extension/MIME mismatch
- oversize
- corrupt/malicious
- path traversal
- parser resource exhaustion
- URL expiry
- unauthorized access
- private source exposed in post

### Payment

- invalid signature
- replay
- amount/currency mismatch
- unknown order
- out-of-order events
- duplicate refund
- payout during dispute

### Content/commerce

- stored XSS
- spam/rate
- prohibited listing
- hidden sponsored label attempt
- fake verified review
- inventory race

### Firebase rules

Emulator asserts deny-by-default and approved storage behavior.

## Critical E2E

### E2E-01 Manual service order

Signup -> request -> proposal -> accept -> payment webhook -> milestones/production -> ship -> confirm -> verified review

### E2E-02 Instant quote

Upload -> analysis -> configure -> eligibility -> quote -> capacity reserve -> pay -> production/shipping -> complete

### E2E-03 Manual fallback

Unsupported analysis -> reason -> convert request -> preserve data -> proposal flow

### E2E-04 Dispute/refund

Delivered -> dispute/evidence -> payout hold -> decision -> refund/reprint -> audit

### E2E-05 Content commerce

Completed order -> verified content -> consented showcase -> link provider -> sponsored label -> conversion tracking

### E2E-06 Product marketplace

Used listing -> search/compare -> reserve -> pay/ship -> review/dispute

### E2E-07 Portability

Representative data -> JSONL export -> PostgreSQL import -> MongoDB import -> counts/references/checksums -> repository reads

## PWA tests

- manifest/install
- service-worker update
- offline shell/draft
- no sensitive cache
- interrupted upload
- push register/unsubscribe
- mobile browser smoke
- slow network

## Mobile Phase 2

- deep link
- secure storage
- background upload
- push context
- camera permission
- offline sync/conflict
- biometric where used
- API compatibility

## Accessibility

Automated:

- semantic/ARIA
- contrast
- labels
- keyboard smoke

Manual:

- screen reader
- text zoom
- focus/dialog
- upload/analysis announcement
- 3D textual alternative
- reduced motion

## Performance targets

| Operation | P95 |
|---|---:|
| General read | ≤ 800 ms |
| General write | ≤ 1,500 ms |
| Search | ≤ 1,500 ms |
| Upload session | ≤ 1,000 ms |

Scenarios:

- provider search
- feed pagination
- concurrent quote
- capacity contention
- webhook burst
- chat
- export
- analysis queue backlog
- dependency degradation

## Fixtures

- synthetic Thai data only
- deterministic IDs
- valid/ambiguous/corrupt/oversized/fuzz 3D files
- signed payment fixtures
- printer/material/pricing
- orders per status
- versioned schemas

## Proposed coverage

- Domain/Application statements ≥ 85%
- critical state/pricing/permission branches ≥ 95%
- 100% state transition rows/pricing rules
- adapter quality via contract tests, not percentage alone

## CI gates

1. lint/format
2. typecheck
3. unit
4. OpenAPI validation/diff
5. repository contract
6. Firebase Emulator
7. rules/security
8. build
9. dependency/SAST/secret
10. E2E smoke
11. scheduled portability
12. production smoke

## Proposed commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:contract
pnpm test:integration
pnpm test:rules
pnpm test:e2e
pnpm test:a11y
pnpm test:performance
pnpm test:portability
pnpm build
```

## Manual QA

- [ ] Thai/English
- [ ] mobile/touch
- [ ] loading/empty/error/offline
- [ ] upload retry
- [ ] quote expiry/capacity conflict
- [ ] payment pending without duplicate
- [ ] role actions
- [ ] private file
- [ ] sponsored/verified labels
- [ ] admin reason/audit
- [ ] timezone/THB
- [ ] preferences
- [ ] suspension/denied

## Release exit

- P0 acceptance pass
- no critical/high security
- rules/authz green
- payment reconciliation smoke
- backup/export confirmed
- rollback ready
- alerts configured
- owner approves critical journeys
- limitations documented
