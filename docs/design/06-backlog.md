# 06 — Product Backlog

## Source

- `3d-print-marketplace-SRS-firebase-portable-v1.md`: Functional Requirements Sections 5–17, PWA/Mobile Sections 23–24, Release Scope Section 32
- Priorities: `P0` release-critical, `P1` important, `P2` later

## Epic map

| Epic | Phase | Priority |
|---|---|---:|
| EP-01 Identity and Trust | 1A | P0 |
| EP-02 Provider Supply | 1A | P0 |
| EP-03 Service Requests and Proposals | 1A | P0 |
| EP-04 Order, Payment and Shipping | 1A | P0 |
| EP-05 Messaging and Notifications | 1A | P0 |
| EP-06 Files and Model Analysis | 1B | P0 |
| EP-07 Instant Pricing | 1B | P0 |
| EP-08 Content and Reviews | 1C | P1 |
| EP-09 Product Marketplace | 1C | P1 |
| EP-10 Promotion and Subscription | 1C | P1 |
| EP-11 Admin, Moderation and Disputes | 1A–1C | P0 |
| EP-12 Portability and Operations | 1A–1C | P0 |
| EP-13 Mobile Application | 2A | P1 |
| EP-14 Advanced Platform | 2B | P2 |

## EP-01 Identity and Trust

### US-001: Onboard a new user

As a visitor, I want to sign in and complete onboarding so that I have an internal marketplace account.

**Priority:** P0  
**Source:** FR-ID-001, FR-ID-002

Acceptance Criteria:

- [ ] Support configured Firebase Auth methods
- [ ] Backend verifies token and resolves/creates internal UUID
- [ ] Duplicate external identity does not create duplicate user
- [ ] User selects locale and initial role
- [ ] Suspended/invalid identity is rejected
- [ ] Audit event contains no token data

### US-002: Manage profile and privacy

As a user, I want to manage profile, addresses, notifications and privacy.

**Priority:** P0  
**Source:** FR-ID-003

Acceptance Criteria:

- [ ] Public/private fields are separated
- [ ] Addresses are reusable entities
- [ ] Email/phone change follows verification policy
- [ ] Notification/privacy preferences are stored
- [ ] Update uses optimistic versioning

### US-003: Activate multiple roles

As a user, I want to buy, design, print and sell from one account.

**Priority:** P0  
**Source:** FR-ID-004

Acceptance Criteria:

- [ ] Role activation is server-side
- [ ] KYC-required roles remain pending until approved
- [ ] UI cannot bypass backend policy
- [ ] Role change is audited

### US-004: Submit KYC/business verification

As a provider or seller, I want verification so that buyers can trust me.

**Priority:** P0  
**Source:** FR-ID-005

Acceptance Criteria:

- [ ] Supports all specified KYC statuses
- [ ] Sensitive assets are private
- [ ] Reviewer decision requires reason
- [ ] Public badge reveals no sensitive data
- [ ] Re-submission supports `NEEDS_MORE_INFO`

### US-005: Manage an organization

As a business owner, I want members and scoped permissions.

**Priority:** P1  
**Source:** FR-ID-006

Acceptance Criteria:

- [ ] Invite/accept/revoke lifecycle
- [ ] Finance and operations permissions separated
- [ ] Multi-branch scope supported in model
- [ ] Actions audited

## EP-02 Provider Supply

### US-010: Create provider profile

As a provider, I want a public profile and services.

**Priority:** P0  
**Source:** FR-PRO-001, FR-PRO-002

Acceptance Criteria:

- [ ] Supports DESIGN_ONLY, PRINT_ONLY, DESIGN_AND_PRINT
- [ ] Services activate independently
- [ ] Province, lead time and capability searchable
- [ ] Publish requires minimum completeness
- [ ] Suspended provider cannot receive new order

### US-011: Register printers and capabilities

As a print provider, I want compatible jobs matched to my machines.

**Priority:** P0  
**Source:** FR-PRO-003, FR-PRO-004

Acceptance Criteria:

- [ ] Build volume stored in millimeters
- [ ] Technology/material/quality capability recorded
- [ ] Quantity and availability supported
- [ ] Invalid combinations rejected
- [ ] Domain contains no provider SDK type

### US-012: Configure capacity

As a provider, I want capacity control to prevent overbooking.

**Priority:** P0  
**Source:** FR-PRO-005

Acceptance Criteria:

- [ ] Reservation has expiry
- [ ] Concurrent reserve cannot exceed capacity
- [ ] Provider can close dates/printers
- [ ] Expired checkout releases capacity
- [ ] Conflict has stable error code

### US-013: Display trust indicators

As a buyer, I want verified performance information.

**Priority:** P1  
**Source:** FR-PRO-006

Acceptance Criteria:

- [ ] Badges derive from approved verification
- [ ] Metrics derive from completed orders
- [ ] Sponsored placement does not affect score
- [ ] Low sample size is disclosed

## EP-03 Service Requests and Proposals

### US-020: Create service request

As a buyer, I want to describe a design, print or full-service job.

**Priority:** P0  
**Source:** FR-JOB-001, FR-JOB-002

Acceptance Criteria:

- [ ] Supports assets and requirements
- [ ] Captures service type, budget, due date and privacy
- [ ] Draft and validation
- [ ] Visibility options per approved policy
- [ ] Prohibited-work acknowledgement

### US-021: Discover matching jobs

As a provider, I want jobs matching my capability.

**Priority:** P0  
**Source:** FR-JOB-003

Acceptance Criteria:

- [ ] Eligibility and verification filters
- [ ] Filter service, region, material/category and due date
- [ ] Private assets require grant
- [ ] Closed/expired jobs reject proposal

### US-022: Submit versioned proposal

As a provider, I want to offer price, timeline, milestones and revision terms.

**Priority:** P0  
**Source:** FR-JOB-004, FR-JOB-005

Acceptance Criteria:

- [ ] Integer minor-unit totals
- [ ] Revision history preserved
- [ ] Validity/expiry stated
- [ ] Milestones/deliverables supported
- [ ] Fees and exclusions clear

### US-023: Accept proposal

As a buyer, I want one proposal converted safely to an order.

**Priority:** P0  
**Source:** FR-JOB-006

Acceptance Criteria:

- [ ] Idempotent acceptance
- [ ] Only one accepted proposal
- [ ] Accepted revision snapshotted
- [ ] Other proposals transition correctly
- [ ] No duplicate order

## EP-04 Order, Payment and Shipping

### US-030: Create order from source

As a buyer, I want a confirmed order from proposal/quote.

**Priority:** P0  
**Source:** FR-ORD-001, FR-ORD-003

Acceptance Criteria:

- [ ] Source, buyer, provider and price snapshots
- [ ] Totals reconcile
- [ ] Unique order number
- [ ] Idempotent creation
- [ ] Source cannot be silently mutated

### US-031: Enforce order state machine

As the platform, I want only valid state transitions.

**Priority:** P0  
**Source:** FR-ORD-002

Acceptance Criteria:

- [ ] All transitions unit-tested
- [ ] Actor and preconditions checked
- [ ] Status event appended
- [ ] Invalid transition returns stable error
- [ ] Side effects use outbox

### US-032: Manage milestones

As a buyer/provider, I want to submit and approve design milestones.

**Priority:** P0  
**Source:** FR-ORD-004

Acceptance Criteria:

- [ ] Sequence/amount match order
- [ ] Deliverables private
- [ ] Approval/revision audited
- [ ] Release policy explicit
- [ ] Revision count enforced

### US-033: Request changes

As an order participant, I want explicit scope/price/schedule changes.

**Priority:** P1  
**Source:** FR-ORD-005

Acceptance Criteria:

- [ ] Original scope remains visible
- [ ] Price/time delta recorded
- [ ] Required parties approve
- [ ] Order version increments
- [ ] Paid snapshot is not silently changed

### US-034: Pay securely

As a buyer, I want PromptPay QR or supported payment.

**Priority:** P0  
**Source:** FR-PAY-001 to FR-PAY-004

Acceptance Criteria:

- [ ] Payment adapter creates intent
- [ ] No PAN/CVV stored
- [ ] Signature verified
- [ ] Duplicate webhook harmless
- [ ] Order transitions once
- [ ] Reconciliation retained

### US-035: Refund and payout

As finance staff, I want controlled refund/payout.

**Priority:** P0  
**Source:** FR-PAY-005, FR-PAY-006

Acceptance Criteria:

- [ ] Refund cannot exceed refundable amount
- [ ] Disputed amount held
- [ ] Commands idempotent/audited
- [ ] Provider failure retries safely
- [ ] Finance permission required

### US-036: Ship and confirm delivery

As a provider/seller, I want shipment and proof.

**Priority:** P0  
**Source:** FR-SHIP-001 to FR-SHIP-003

Acceptance Criteria:

- [ ] Parcel, local messenger and pickup
- [ ] Address snapshot
- [ ] Tracking/proof
- [ ] Carrier status mapped safely
- [ ] Confirmation/dispute window

## EP-05 Messaging and Notifications

### US-040: Contextual chat

As a buyer/provider, I want chat tied to a job/order.

**Priority:** P0

Acceptance Criteria:

- [ ] Membership access
- [ ] Cursor pagination
- [ ] Asset permission
- [ ] Moderated/deleted states
- [ ] Spam/contact-sharing controls

### US-041: Lifecycle notifications

As a user, I want proposal, payment and order alerts.

**Priority:** P0  
**Source:** FR-NOTI-001 to FR-NOTI-003

Acceptance Criteria:

- [ ] In-app and email baseline
- [ ] PWA push registration
- [ ] Preference handling
- [ ] Duplicate event does not duplicate notification
- [ ] Localized templates

## EP-06 Files and Model Analysis

### US-050: Resumable private upload

As a buyer, I want to upload large models securely.

**Priority:** P0  
**Source:** FR-FILE-001, FR-FILE-002

Acceptance Criteria:

- [ ] Time-limited upload session
- [ ] Size/type enforcement
- [ ] Resume where supported
- [ ] Checksum verified
- [ ] Quarantine before approval

### US-051: Preview model metadata

As a buyer, I want dimensions and a 3D preview.

**Priority:** P0  
**Source:** FR-FILE-003

Acceptance Criteria:

- [ ] Supported format documented
- [ ] Unit ambiguity requires confirmation
- [ ] Dimensions in mm
- [ ] Accessible textual alternative
- [ ] Low-device fallback

### US-052: Analyze printability

As the platform, I want analysis for pricing eligibility.

**Priority:** P0  
**Source:** FR-FILE-004

Acceptance Criteria:

- [ ] Async/retryable
- [ ] Analyzer version recorded
- [ ] Mesh/bounds/volume canonical
- [ ] Failure offers manual fallback
- [ ] Native parser sandboxed/limited

### US-053: Control file access/retention

As an owner, I want private files and lifecycle control.

**Priority:** P0  
**Source:** FR-FILE-005, FR-FILE-006

Acceptance Criteria:

- [ ] Short-lived access grants
- [ ] Access audit
- [ ] NDA/private project
- [ ] Deletion respects retention
- [ ] No public bucket

## EP-07 Instant Pricing

### US-060: Check eligibility

As a buyer, I want to know whether price is instant.

**Priority:** P0  
**Source:** FR-PRICE-001

Acceptance Criteria:

- [ ] File, dimensions, material, printer, capacity and special requirement checked
- [ ] Machine-readable reason codes
- [ ] Manual fallback preserves input
- [ ] Rule version recorded

### US-061: Configure pricing profile

As a provider, I want versioned pricing rules.

**Priority:** P0  
**Source:** FR-PRICE-002

Acceptance Criteria:

- [ ] Minimum/material/machine/setup/support/labor/risk/rush/quantity
- [ ] Test calculator
- [ ] Old quotes unchanged
- [ ] Effective date/scope
- [ ] Invalid rate rejected

### US-062: Generate quote snapshot

As a buyer, I want an auditable automatic price.

**Priority:** P0  
**Source:** FR-PRICE-003, FR-PRICE-004

Acceptance Criteria:

- [ ] Deterministic for same versions/input
- [ ] Line items reconcile
- [ ] Currency/rounding explicit
- [ ] Expiry
- [ ] All relevant versions stored

### US-063: Lock price and capacity

As a buyer, I want race-safe checkout.

**Priority:** P0  
**Source:** FR-PRICE-006

Acceptance Criteria:

- [ ] Idempotent reservation
- [ ] No oversell
- [ ] Expiry releases
- [ ] Order uses locked snapshot
- [ ] Scope change requires new flow

## EP-08 Content and Reviews

### US-070: Publish showcase/review content

**Priority:** P1  
**Source:** FR-CONT-001, FR-CONT-002

Acceptance Criteria:

- [ ] Draft/publish/moderation states
- [ ] Media permission
- [ ] Allowed entity links
- [ ] Alt text/caption
- [ ] Reporting

### US-071: Verified purchase review

**Priority:** P0  
**Source:** FR-CONT-003

Acceptance Criteria:

- [ ] Eligibility from completed order
- [ ] One review per policy
- [ ] Dimensions/media
- [ ] Seller response separate
- [ ] Promotion cannot modify score

### US-072: Follow/react/comment/save

**Priority:** P1  
**Source:** FR-CONT-004

Acceptance Criteria:

- [ ] Unique constraints
- [ ] Rebuildable counts
- [ ] Pagination/moderation
- [ ] Abuse throttles

### US-073: Showcase consent

**Priority:** P0  
**Source:** FR-CONT-005

Acceptance Criteria:

- [ ] Consent scope recorded
- [ ] NDA/private job blocked
- [ ] Withdrawal workflow
- [ ] Original model never public automatically

## EP-09 Product Marketplace

### US-080: List product

**Priority:** P1  
**Source:** FR-COM-001, FR-COM-002

Acceptance Criteria:

- [ ] Category schema
- [ ] New/used/refurbished
- [ ] Price, stock, shipping/pickup
- [ ] Media/policy validation
- [ ] Draft/publish/suspend

### US-081: Used-printer evidence

**Priority:** P1  
**Source:** FR-COM-003

Acceptance Criteria:

- [ ] Checklist/defects
- [ ] Test print/video
- [ ] Serial visibility policy
- [ ] Mismatch reporting

### US-082: Purchase product

**Priority:** P1  
**Source:** FR-COM-004

Acceptance Criteria:

- [ ] Inventory reservation
- [ ] Payment/shipping ports reused
- [ ] Product snapshot
- [ ] Return/dispute policy

## EP-10 Promotion and Subscription

### US-090: Promote shop/service/content/product

**Priority:** P1  
**Source:** FR-CONT-007, FR-COM-005

Acceptance Criteria:

- [ ] Policy-approved target/placement
- [ ] Sponsored label
- [ ] Unsafe/suspended seller blocked
- [ ] Budget/period
- [ ] Organic score separate

### US-091: Seller subscription

**Priority:** P2

Acceptance Criteria:

- [ ] Entitlements server-side
- [ ] Effective-dated plan
- [ ] Billing adapter
- [ ] Downgrade behavior

## EP-11 Admin, Moderation and Disputes

### US-100: Admin operations

**Priority:** P0  
**Source:** FR-ADM-001 to FR-ADM-005

Acceptance Criteria:

- [ ] Least privilege
- [ ] Sensitive masking
- [ ] High-risk reason required
- [ ] Audit log
- [ ] No routine direct DB editing

### US-101: Resolve dispute

**Priority:** P0

Acceptance Criteria:

- [ ] Immutable evidence timeline
- [ ] Payout hold
- [ ] Constrained decision types
- [ ] Refund/reprint/partial resolution
- [ ] Notifications

### US-102: Moderate content/listing/account

**Priority:** P0

Acceptance Criteria:

- [ ] Report-case link
- [ ] Reason/duration
- [ ] Appeal extension possible
- [ ] Sponsored has no exemption
- [ ] Audit

## EP-12 Portability and Operations

### US-110: Repository contract suite

**Priority:** P0  
**Source:** Section 25.3

Acceptance Criteria:

- [ ] In-memory and Firestore pass same suite
- [ ] PostgreSQL/MongoDB harness
- [ ] CRUD/filter/pagination/concurrency/soft-delete
- [ ] No SDK type in interface

### US-111: Portable export

**Priority:** P0  
**Source:** Section 27

Acceptance Criteria:

- [ ] Manifest/count/version/checksum
- [ ] Restricted output
- [ ] Failed record report
- [ ] Scheduled/on-demand
- [ ] Restore/import test

### US-112: Observe and recover

**Priority:** P0  
**Source:** Sections 30–31

Acceptance Criteria:

- [ ] Request/trace IDs
- [ ] Queue/payment/export alerts
- [ ] Restore rehearsal
- [ ] RPO/RTO
- [ ] No PII telemetry leak

## EP-13 Mobile Application

### US-120: Android/iOS access

**Priority:** P1  
**Source:** MOB-001 to MOB-004

Acceptance Criteria:

- [ ] Shared API
- [ ] Native push/deep link
- [ ] Camera/background upload
- [ ] Secure storage
- [ ] Offline draft/versioning

### US-121: Seller mobile workspace

**Priority:** P1

Acceptance Criteria:

- [ ] accept/decline policy
- [ ] camera production evidence
- [ ] shipment scan/add
- [ ] pause service/machine
- [ ] earnings summary

## EP-14 Advanced Platform

### US-130: Cloud slicing and smart matching

**Priority:** P2

- [ ] Versioned slicer/profile
- [ ] Sandbox/resource quota
- [ ] time/material/support estimate
- [ ] explain matching
- [ ] manual fallback

### US-131: Print farm partner API

**Priority:** P2

- [ ] partner auth
- [ ] capacity/queue sync
- [ ] idempotent webhook
- [ ] audit/revocation
- [ ] no direct DB access

## Global non-functional backlog

- [ ] P95 read ≤ 800 ms
- [ ] P95 write ≤ 1,500 ms
- [ ] Search ≤ 1,500 ms
- [ ] Core API availability 99.5%
- [ ] WCAG AA critical flows
- [ ] Thai/English localization
- [ ] structured logs/traces/metrics
- [ ] backup/export/recovery rehearsal
- [ ] emulator/security tests
- [ ] dependency/secret scan
- [ ] OpenAPI compatibility

## Blockers

- Payment/payout legal/vendor
- KYC approach
- Search
- Slicer/analyzer license/sandbox
- Shipping
- Cancellation/refund/dispute policies
- Tax invoice responsibility
- Initial provider supply
