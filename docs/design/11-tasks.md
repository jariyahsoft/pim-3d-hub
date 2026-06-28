# 11 — Implementation Tasks

## Source

- `3d-print-marketplace-SRS-firebase-portable-v1.md`: Sections 25–33
- Backlog: [06-backlog.md](06-backlog.md)
- Status: `[ ] todo`, `[/] in progress`, `[x] done`, `[!] blocked`

## Current phase

**Phase 0 — Foundation and decision closure**

No application scaffold is included in this bundle.

## Global Definition of Done

- [ ] linked User Story/FR
- [ ] acceptance criteria implemented
- [ ] module boundaries pass
- [ ] no Firebase type in Domain/contract
- [ ] API schema updated
- [ ] unit/integration/contract tests
- [ ] security/privacy review
- [ ] accessibility states
- [ ] safe telemetry
- [ ] docs/ADR/task status
- [ ] staging smoke

## Phase 0 — Foundation

### Decisions

- [x] T0001 Confirm project/repository name
- [x] T0002 Select Web/PWA framework
- [x] T0003 Select package manager/monorepo
- [x] T0004 Select schema/OpenAPI tooling
- [x] T0005 Select test/E2E tooling
- [x] T0006 Select queue/event transport
- [x] T0007 Select payment/payout partner
- [x] T0008 Select model parser/analyzer
- [x] T0009 Select search
- [x] T0010 Select KYC/shipping
- [x] T0011 Update ADRs

### Scaffold

- [x] T0020 Create apps/services/packages
- [ ] T0021 Strict TypeScript config
- [ ] T0022 Lint/format/import boundaries
- [ ] T0023 Typed config/env validation
- [ ] T0024 Scripts: lint/typecheck/test/build/emulators
- [ ] T0025 CI pipeline
- [ ] T0026 `.env.example`
- [ ] T0027 Quality hooks
- [ ] T0028 Dependency/secret scan

### Contracts/testkit

- [ ] T0030 Canonical ID/Money/Timestamp/Page types
- [ ] T0031 API envelopes
- [x] T0032 OpenAPI/generation
- [x] T0033 In-memory repository
- [x] T0034 Contract test framework
- [x] T0035 Fake clock/UUID/event collector
- [x] T0036 Structured logger/context

### Firebase/infra

- [x] T0040 Dev/staging/prod projects
- [x] T0041 Auth provider config
- [x] T0042 Deny-by-default rules
- [x] T0043 Emulator config
- [x] T0044 Index source
- [x] T0045 Secrets/IAM
- [x] T0046 Preview/staging deploy
- [x] T0047 Export job skeleton

### Verification

- [x] T0050 CI baseline passes
- [x] T0051 Domain has no cloud SDK
- [x] T0052 In-memory/Firestore contract passes
- [x] T0053 PostgreSQL/MongoDB import rehearsal
- [x] T0054 Architecture/security sign-off

## Phase 1A — Marketplace Foundation

### Identity

- [x] T0100 Firebase token adapter
- [x] T0101 Internal user/identity mapping
- [x] T0102 Onboarding UI/API
- [x] T0103 Profile/address/preferences
- [x] T0104 Roles/permissions
- [x] T0105 KYC baseline
- [x] T0106 Organization/member
- [x] T0107 Authz negative tests

### Provider

- [x] T0120 Provider profile/service
- [x] T0121 Service activation
- [x] T0122 Printer/capability
- [x] T0123 Material catalog/provider material
- [x] T0124 Provider onboarding UI
- [x] T0125 Public profile/card
- [x] T0126 Trust projection

### Jobs/proposals

- [x] T0140 Request draft/publish
- [x] T0141 Asset grants
- [ ] T0142 Job discovery
- [ ] T0143 Proposal/revision/milestone
- [ ] T0144 Comparison UI
- [ ] T0145 Acceptance transaction
- [ ] T0146 Events/notifications

### Orders

- [ ] T0160 Approve state matrix
- [ ] T0161 Order/snapshots
- [ ] T0162 Transitions/status events
- [ ] T0163 Milestones
- [ ] T0164 Change request
- [ ] T0165 Production update
- [ ] T0166 Buyer/provider workspaces
- [ ] T0167 State tests

### Payments

- [ ] T0180 PaymentPort/sandbox
- [ ] T0181 Payment intent
- [ ] T0182 Signed webhook
- [ ] T0183 Idempotency/reconciliation
- [ ] T0184 Refund
- [ ] T0185 Payout/hold
- [ ] T0186 Finance admin
- [ ] T0187 Security review

### Shipping

- [ ] T0200 Shipment aggregate
- [ ] T0201 Parcel/pickup/local
- [ ] T0202 Tracking/proof
- [ ] T0203 Address snapshot
- [ ] T0204 Carrier adapter

### Messaging/notification

- [ ] T0220 Conversation/message
- [ ] T0221 Chat UI
- [ ] T0222 Attachment access
- [ ] T0223 In-app notification
- [ ] T0224 Email templates
- [ ] T0225 PWA push
- [ ] T0226 Abuse controls

### Review/admin

- [ ] T0240 Verified review
- [ ] T0241 Review UI
- [ ] T0242 Report/moderation
- [ ] T0243 Dispute/evidence/hold
- [ ] T0244 Admin/audit
- [ ] T0245 Staff masking

### Verify 1A

- [ ] T0260 Manual-order E2E
- [ ] T0261 Webhook replay
- [ ] T0262 IDOR/authz
- [ ] T0263 Backup/export/restore
- [ ] T0264 Responsive/a11y
- [ ] T0265 Readiness review

## Phase 1B — Files and Instant Pricing

### Files

- [ ] T0300 File asset/upload session
- [ ] T0301 Resumable upload
- [ ] T0302 Completion/checksum
- [ ] T0303 Quarantine/scan
- [ ] T0304 Access grants
- [ ] T0305 Retention job
- [ ] T0306 Offline/retry UI

### Viewer/analysis

- [ ] T0320 Select parser/viewer
- [ ] T0321 Safe preview
- [ ] T0322 Dimensions/unit confirmation
- [ ] T0323 Sandbox analyzer worker
- [ ] T0324 Versioned analysis
- [ ] T0325 Analysis UI
- [ ] T0326 Corrupt/oversize/fuzz tests

### Pricing/capacity

- [ ] T0340 Formula/rounding
- [ ] T0341 Pricing profile/version
- [ ] T0342 Provider calculator
- [ ] T0343 Eligibility/reasons
- [ ] T0344 Pricing engine
- [ ] T0345 Quote snapshot/expiry
- [x] T0346 Capacity/reservation
- [ ] T0347 Comparison/checkout
- [ ] T0348 Manual fallback
- [ ] T0349 Deterministic/concurrency tests

### Verify 1B

- [ ] T0360 Instant-quote E2E
- [ ] T0361 Fallback E2E
- [ ] T0362 Version reproducibility
- [ ] T0363 Capacity race load
- [ ] T0364 Queue/dead-letter
- [ ] T0365 Private-file penetration

## Phase 1C — Content, Commerce, Monetization

### Content

- [ ] T0400 Post/media
- [ ] T0401 Feed projection
- [ ] T0402 Comment/reaction/follow/save
- [ ] T0403 Verified link
- [ ] T0404 Showcase consent
- [ ] T0405 Moderation
- [ ] T0406 Creator/provider profile

### Commerce

- [ ] T0420 Product category schemas
- [ ] T0421 Product/variant/inventory
- [ ] T0422 Used-printer evidence
- [ ] T0423 Search/detail/compare
- [ ] T0424 Product order
- [ ] T0425 Seller store
- [ ] T0426 Inventory race tests

### Promotion/subscription

- [ ] T0440 Placement/policy
- [ ] T0441 Campaign/placement
- [ ] T0442 Sponsored labels
- [ ] T0443 Metrics
- [ ] T0444 Subscription/entitlement
- [ ] T0445 Organic/review isolation test

### Verify 1C

- [ ] T0460 Content conversion E2E
- [ ] T0461 Used-printer E2E
- [ ] T0462 Moderation/sponsored QA
- [ ] T0463 Spam/rate tests
- [ ] T0464 Analytics validation

## Phase 2A — Mobile

- [ ] T0500 Select Flutter/React Native
- [ ] T0501 Mobile API client
- [ ] T0502 Auth/secure storage
- [ ] T0503 Core flows
- [ ] T0504 Push/deep link
- [ ] T0505 Camera/media
- [ ] T0506 Background upload
- [ ] T0507 Offline/conflict
- [ ] T0508 Seller workspace
- [ ] T0509 Security/a11y/performance
- [ ] T0510 Store deployment

## Phase 2B — Advanced

- [ ] T0600 Cloud slicer
- [ ] T0601 Smart matching
- [ ] T0602 Dynamic pricing
- [ ] T0603 Print farm API
- [ ] T0604 Affiliate
- [ ] T0605 Official Store
- [ ] T0606 Advanced analytics
- [ ] T0607 Migration trigger review

## Deployment checklist

- [ ] scope approved
- [ ] indexes/rules reviewed
- [ ] backup/export
- [ ] CI/security green
- [ ] flags/rollback
- [ ] staging/payment smoke
- [ ] alerts
- [ ] support/moderation runbook
- [ ] privacy/terms version
- [ ] production smoke
- [ ] release notes

## Notes for AI agents

- Read SRS and relevant design files first
- Do not invent legal/business policy; add open question
- Add ADR for technology decisions
- Never leak Firebase types
- Implement vertical slice with tests
- Update task status only after executable verification passes
