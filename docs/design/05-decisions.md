# 05 — Architecture Decision Records

## Source

- `3d-print-marketplace-SRS-firebase-portable-v1.md`: Sections 3–4, 18–29, 32

Do not rewrite accepted history; supersede it with a new ADR.

## ADR-001: Two delivery phases

**Status:** Accepted  
**Date:** 2026-06-27

### Decision

Phase 1 is Mobile-first Web/PWA. Phase 2 is a cross-platform Android/iOS application using the same API.

### Consequences

UI/API must be reusable and native-only capability is deferred.

---

## ADR-002: Firebase-first with portability controls

**Status:** Accepted  
**Date:** 2026-06-27

Use Firebase Auth, Firestore and Cloud Storage in Phase 1 only through adapters and canonical contracts.

---

## ADR-003: No direct Firestore business access from clients

**Status:** Accepted  
**Date:** 2026-06-27

Web/Admin/Mobile use REST/OpenAPI. Firebase client SDK is limited to Auth, App Check and push.

---

## ADR-004: Modular Monolith + Clean/Hexagonal Architecture

**Status:** Accepted  
**Date:** 2026-06-27

Use strict Presentation/Application/Domain/Infrastructure boundaries before considering microservices.

---

## ADR-005: Canonical UUIDv7

**Status:** Accepted  
**Date:** 2026-06-27

All business resources use UUIDv7. Firebase UID and Firestore Auto ID are not primary business IDs.

---

## ADR-006: Ports and Repository Interfaces

**Status:** Accepted  
**Date:** 2026-06-27

Database, identity, storage, payment, queue, search, shipping and notification are adapters behind interfaces.

---

## ADR-007: Top-level Firestore collections

**Status:** Accepted  
**Date:** 2026-06-27

Use top-level collections and ID references for lifecycle-critical data.

---

## ADR-008: REST/JSON + OpenAPI

**Status:** Accepted  
**Date:** 2026-06-27

OpenAPI is the stable client contract; no Firestore cursor/type crosses it.

---

## ADR-009: Transactional Outbox

**Status:** Accepted  
**Date:** 2026-06-27

Business transaction writes aggregate and outbox event together; consumers are idempotent.

---

## ADR-010: Integer minor units for money

**Status:** Accepted  
**Date:** 2026-06-27

No floating-point financial values. Currency is explicit.

---

## ADR-011: Versioned pricing and immutable quotes

**Status:** Accepted  
**Date:** 2026-06-27

Each quote snapshots input, rule/profile/analysis versions, line items, total and expiry.

---

## ADR-012: Monorepo

**Status:** Proposed  
**Date:** 2026-06-27

Use apps/services/packages to share contracts, domain and testkit.

### Follow-up

Select package manager and monorepo tooling.

---

## ADR-013: Web/PWA framework

**Status:** Proposed  
**Date:** 2026-06-27

Default candidate is a TypeScript SSR-capable framework with mature PWA support, such as Next.js.

### Acceptance criteria

Prototype 3D viewer, large upload, SSR auth and service-worker update behavior.

---

## ADR-014: Mobile framework

**Status:** Open  
**Date:** 2026-06-27

Options:

- Flutter
- React Native

Decision criteria: background upload, camera/video, push/deep links, team skill, offline storage and maintenance.

---

## ADR-015: Payment/payout model

**Status:** Open  
**Date:** 2026-06-27

Required: Dynamic PromptPay QR, signed webhook, refund, payout/split settlement or compliant alternative, reconciliation and Thai legal fit.

The platform must not implement an unlicensed wallet.

---

## ADR-016: Search

**Status:** Open  
**Date:** 2026-06-27

Options:

1. Firestore read models
2. Managed search engine
3. PostgreSQL FTS/PostGIS after migration

Decision criteria: Thai search, geo, ranking, cost and portability.

---

## ADR-017: Model analysis/slicing engine

**Status:** Open  
**Date:** 2026-06-27

Decision criteria: formats, deterministic output, license, sandbox, cost, profile versioning and estimate accuracy.

---

## ADR-018: Realtime messaging transport

**Status:** Open  
**Date:** 2026-06-27

Options: polling, SSE, WebSocket or managed realtime adapter. Canonical messages remain API/repository controlled.

---

## Rejected alternatives

### Direct Firestore for order/payment workflow

**Status:** Rejected

Reason: vendor coupling, split authorization and difficult audit/migration.

### Firebase UID as business user ID

**Status:** Rejected

Reason: identity-provider lock-in.

### Deep nested subcollections as main model

**Status:** Rejected

Reason: difficult cross-entity query/export/lifecycle.

### Microservices from first release

**Status:** Rejected for Phase 1

Reason: operational complexity without evidence.

---

## ADR template

```md
## ADR-XXX: Title

**Status:** Proposed | Accepted | Rejected | Superseded
**Date:** YYYY-MM-DD
**Supersedes:** ADR-XXX

### Context
### Decision
### Alternatives considered
### Consequences
### Follow-up
```
