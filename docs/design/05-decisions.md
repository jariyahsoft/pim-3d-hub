# 05 — Architecture Decision Records

## Source

- `3d-print-marketplace-SRS-firebase-portable-v1.md`: Sections 3–4, 18–29, 32

Do not rewrite accepted history; supersede it with a new ADR.

## Decision matrix

| Item | Area | Status | Decision | Follow-up |
|---|---|---|---|---|
| `T0001` | Project/repository name | Accepted | Public product name is **3D Print Marketplace Thailand**. Repository slug stays `pim-3d-hub`. Shared packages use the `@pim/*` scope. | Keep product-facing copy separate from repo/package identifiers. |
| `T0002` | Web/PWA framework | Accepted | Use `Next.js` App Router with TypeScript/React for `apps/web` and `apps/admin`, consuming only the REST/OpenAPI contract for business data. | Add PWA install/offline/update behavior in the web app without introducing direct Firestore reads. |
| `T0003` | Package manager/monorepo | Accepted | Use `pnpm` workspaces plus `turbo` for root task orchestration and caching. | Scaffold `apps/`, `services/`, and `packages/` around this layout. |
| `T0004` | Schema/OpenAPI tooling | Accepted | Use `zod` at request/config boundaries, generate an OpenAPI 3.1 artifact under `packages/contracts/openapi`, lint with `@redocly/cli`, and generate TypeScript clients with `openapi-typescript` plus `openapi-fetch`. | Task 07 implements the concrete generation scripts and file layout. |
| `T0005` | Test and E2E tooling | Accepted | Use `vitest` for unit/integration/contract coverage and `@playwright/test` for browser/PWA E2E smoke and critical flows. | Later tasks add Firebase Emulator, contract, and E2E layers on top of this baseline. |
| `T0006` | Queue/event transport | Accepted | Keep `Transactional Outbox` as the business source of truth and use `QueuePort` with Google Cloud Tasks HTTP dispatch for Phase 1 async worker delivery. | Revisit only if measured fan-out or throughput exceeds the single-dispatch model. |
| `T0007` | Payment/payout | Open | Vendor selection is deferred. The accepted constraint is `PaymentGatewayPort` plus a licensed Thailand-capable partner, signed webhooks, refunds, and no internal wallet or unlicensed balance holding. | Requires commercial, legal, settlement, and withholding confirmation before choosing a provider. |
| `T0008` | Model parser/analyzer | Open | Phase 1 file scope is `STL`, `OBJ`, and `3MF`; exact browser viewer, parser, and analyzer libraries are deferred until Tasks 45–46 validate license, mobile performance, and sandbox behavior. | Keep manual quote fallback for unsupported or unsafe files. |
| `T0009` | Search | Accepted | Phase 1 search uses Firestore-backed projection/read models behind `SearchPort`; external search remains optional and threshold-driven. | Reassess when Thai tokenization, geo ranking, or catalog scale exceeds the baseline. |
| `T0010` | KYC/shipping | Accepted with open vendor follow-up | KYC starts with a manual-review workflow behind `KycPort`; shipping starts with a carrier-agnostic shipment model and manual carrier/tracking baseline behind `ShippingPort`. | Vendor selection remains open pending coverage, retention, and contract requirements. |
| `T0011` | ADR updates | Accepted | ADR-012 through ADR-018 are updated below, and ADR-019 through ADR-023 record the newly accepted defaults. | Keep future changes additive via new ADRs. |

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

**Status:** Accepted  
**Date:** 2026-06-27

### Decision

Use a single `pnpm` workspace monorepo with `apps/`, `services/`, and `packages/` as the primary top-level work areas. Use `turbo` for root task orchestration, caching, and dependency-aware execution.

### Consequences

- Later scaffold tasks use `pnpm` commands and workspace manifests by default.
- Shared code is published only inside the repo through the `@pim/*` scope.
- CI and local developer workflows can target one package, a dependency graph, or the full workspace without inventing parallel script conventions.

### Follow-up

Scaffold the workspace root, package manifests, and task pipelines in Tasks 02–05.

---

## ADR-013: Web/PWA framework

**Status:** Accepted  
**Date:** 2026-06-27

### Context

Phase 1 must ship a mobile-first web application with SSR-capable routing, authenticated dashboards, installable PWA behavior, and large-file upload flows without direct Firestore business access.

### Decision

Use `Next.js` App Router with TypeScript and React for the web surfaces in `apps/web` and `apps/admin`. Business features consume only generated REST/OpenAPI clients. PWA behavior is implemented in the web app layer rather than by bypassing the API architecture.

### Alternatives considered

- Generic SSR-capable framework with no opinionated React integration
- Delaying the framework choice until scaffolding

### Consequences

- Future frontend tasks assume file-system routing, SSR-friendly auth shells, and shared React UI packages.
- PWA install/offline/update behavior must be added without caching sensitive API payloads.
- Firebase client SDK use remains limited to Auth, App Check, and push registration.

### Acceptance criteria

Prototype 3D viewer, large upload, SSR auth, and service-worker update behavior remain verification targets for the scaffold and PWA tasks.

---

## ADR-014: Mobile framework

**Status:** Open  
**Date:** 2026-06-27

Options:

- Flutter
- React Native

### Decision criteria

- background upload reliability
- camera/video capture quality
- push/deep-link support
- secure storage and offline draft ergonomics
- generated API client integration from the shared OpenAPI contract
- team skill and maintenance burden

### Consequences

- Mobile work before Task 59 must stay framework-agnostic.
- Shared API contracts and domain packages must not assume a web-only runtime.

---

## ADR-015: Payment/payout model

**Status:** Open  
**Date:** 2026-06-27

### Context

The SRS requires PromptPay QR, signed webhooks, refund handling, payout tracking, and Thai legal compliance. Choosing a provider without merchant, payout, and regulatory information would be guesswork.

### Interim decision

Keep the vendor open. The accepted architecture is:

- `PaymentGatewayPort` for every provider interaction
- idempotent payment intent and webhook handling
- no internal stored-balance wallet or unlicensed escrow behavior
- manual or provider-mediated payout acceptable until legal/commercial confirmation exists

### Exit criteria

- supported Thai merchant onboarding path
- PromptPay QR and webhook documentation reviewed
- refund and payout/split-settlement fit confirmed
- reconciliation and withholding/tax metadata available
- legal/owner approval on fund flow

### Consequences

- Early payment tasks build a sandbox/fake adapter first.
- Final payout automation can be blocked without contradicting the rest of the foundation.

---

## ADR-016: Search

**Status:** Accepted  
**Date:** 2026-06-27

### Context

The SRS explicitly allows a Firestore-based first step as long as search stays behind a `SearchPort` and can migrate later.

### Decision

Use Firestore-backed projection/read models for Phase 1 provider and product discovery behind `SearchPort`. Keep ranking logic in canonical application/read-model code so the same search contract can later move to an external engine.

### Alternatives considered

1. Firestore read models
2. Managed search engine
3. PostgreSQL FTS/PostGIS after migration

### Review trigger

Revisit the engine when Thai tokenization quality, geo search, ranking requirements, or catalog/content volume exceed what the Firestore baseline can support at acceptable latency and cost.

### Consequences

- Search tasks can proceed without waiting for an external vendor.
- The search API must not leak Firestore query shapes or ranking shortcuts into the public contract.

---

## ADR-017: Model analysis/slicing engine

**Status:** Open  
**Date:** 2026-06-27

### Context

Task 45 and Task 46 explicitly require a spike before enabling browser preview or native analysis. The repository does not yet contain performance, licensing, or sandbox evidence.

### Interim constraints

- Phase 1 must target `STL`, `OBJ`, and `3MF`.
- Private source assets remain private; preview data must be derived and access-controlled.
- Native or heavy analysis runs only in a sandboxed worker path, not inline with public API requests.
- Unsupported, corrupt, or unsafe files must fall back to manual quote.

### Decision criteria

- browser/mobile performance
- deterministic bounds/volume output
- license compatibility
- sandbox/resource control
- cost and operational fit
- analyzer/profile versioning
- estimate accuracy

### Consequences

- Later tasks can lock supported file formats now without prematurely selecting a library.
- Task 45/46 owns the final parser/viewer/analyzer decision.

---

## ADR-018: Realtime messaging transport

**Status:** Accepted  
**Date:** 2026-06-27

### Decision

Use canonical REST APIs as the source of truth, with polling as the correctness baseline and Server-Sent Events for active conversation/order update streams where near-realtime UX is needed. Do not use direct Firestore listeners for business messaging.

### Alternatives considered

- polling only
- WebSocket-first transport
- managed realtime adapter tied directly to persistence

### Consequences

- Messaging tasks can deliver a reliable baseline before introducing heavier connection state.
- Event cursors and authorization remain API-managed.
- A future WebSocket or managed realtime transport may be added behind the same application contract if SSE proves insufficient.

---

## ADR-019: Repository identity and package scope

**Status:** Accepted  
**Date:** 2026-06-27

### Decision

Use **3D Print Marketplace Thailand** as the product name in user-facing documentation, keep the repository slug as `pim-3d-hub`, and reserve `@pim/*` for internal workspace packages.

### Consequences

- Public naming can evolve without forcing a package rename.
- Package imports stay short and stable across apps and services.

---

## ADR-020: API contract and validation toolchain

**Status:** Accepted  
**Date:** 2026-06-27

### Decision

Use `zod` for runtime request/config validation, generate an OpenAPI 3.1 artifact under `packages/contracts/openapi`, lint and bundle it with `@redocly/cli`, and generate TypeScript clients with `openapi-typescript` and `openapi-fetch`.

### Consequences

- Boundary validation and API documentation stay aligned.
- Web, admin, and future mobile clients can share one generated contract.
- CI can detect schema drift and breaking changes without exposing provider SDK payloads.

---

## ADR-021: Test stack baseline

**Status:** Accepted  
**Date:** 2026-06-27

### Decision

Use `vitest` for unit, integration, and repository-contract testing, and use `@playwright/test` for browser/PWA E2E and smoke validation.

### Consequences

- Tasks 03–13 can standardize on one JS/TS-native test runner baseline.
- Critical E2E flows can run across Chromium, WebKit, and Firefox without adding a second browser framework.

---

## ADR-022: Queue dispatch for Phase 1 workers

**Status:** Accepted  
**Date:** 2026-06-27

### Decision

Persist business events via the accepted Transactional Outbox and dispatch async work through `QueuePort` using Google Cloud Tasks HTTP targets in Phase 1.

### Consequences

- Worker endpoints can run on Cloud Functions 2nd Gen or Cloud Run behind authenticated HTTP targets.
- Retry, backoff, and rate control remain infrastructure concerns and do not leak into Domain code.
- If a future event bus is needed, it replaces the queue adapter rather than the outbox or application contracts.

---

## ADR-023: Manual-first KYC and shipping baseline

**Status:** Accepted  
**Date:** 2026-06-27

### Decision

Start with a manual-review KYC workflow behind `KycPort` and a carrier-agnostic shipment model behind `ShippingPort`, including manual tracking updates and local pickup/digital delivery support. External vendors remain optional follow-up decisions.

### Consequences

- Identity, order, and shipping tasks can proceed without waiting for commercial contracts.
- Sensitive KYC data handling and retention still need vendor-specific review before automation is enabled.

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
