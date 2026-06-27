# 07 — Security Rules

## Source

- `3d-print-marketplace-SRS-firebase-portable-v1.md`: Sections 21, 25, 29–31
- Related: [Architecture](01-architecture.md), [Database Design](03-database-design.md)

## Objectives

- protect private designs, KYC, financial and marketplace data
- centralize business authorization in backend
- use Firebase Rules/App Check as defense in depth
- maintain least privilege and auditability
- reduce fraud, malicious files and webhook abuse
- support PDPA and minimization

## Threat summary

| Threat | Example | Controls |
|---|---|---|
| Account takeover | stolen token | Auth, revocation, recent-auth/MFA policy |
| IDOR | read another order | participant/resource policy |
| Privilege escalation | buyer calls admin | permission middleware |
| Malicious file | crafted STL/parser exploit | quarantine, scan, sandbox, quota |
| File theft | public URL | private storage, signed access, audit |
| Payment spoof | fake webhook | signature, idempotency, reconciliation |
| Duplicate financial effect | replay/race | provider event unique, transaction |
| Overbooking | concurrent checkout | capacity reservation |
| Content/product abuse | spam/illegal item | rate limits, report, moderation |
| Insider misuse | unnecessary KYC view | field masking, audit, scope |
| Vendor outage | payment/search down | timeout/retry/degraded mode |
| Data loss/lock-in | provider issue | backup, portable export, restore test |

## Authentication

- Firebase Authentication is Phase 1 IdP
- Backend verifies token
- External identity maps to internal UUID
- Suspended internal account overrides valid token
- high-risk action may require recent auth/MFA
- service-to-service uses workload identity
- admin policy stronger than normal user policy

## Authorization

Decision includes:

```text
identity + permission + organization scope + ownership/participation
+ resource state + verification + risk policy
```

Pseudocode:

```ts
canViewOrder(actor, order) =
  actor.has("orders.read.all")
  || order.buyerId === actor.userId
  || actor.providerScopes.includes(order.providerId)
  || order.participantIds.includes(actor.userId)

canTransitionOrder(actor, order, transition) =
  canViewOrder(actor, order)
  && actor.has(requiredPermission(transition))
  && transitionAllowed(order.status, transition)
  && preconditionsMet(order, transition)
```

## Role/resource matrix

Legend: R read, C create, U update/command, A admin.

| Resource | Buyer | Provider | Seller | Support | KYC | Finance | Moderator | Admin |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Own profile | R/U | R/U | R/U | limited | limited | limited | limited | A |
| Provider profile | R | R/U own | R | R | R | R | R | A |
| KYC case | own C/R | own C/R | own C/R | no | A | no | limited | A |
| Service request | own C/R/U | eligible R | no | limited | no | no | case | A |
| Proposal | buyer R | own C/R/U | no | limited | no | no | no | A |
| Order | participant | participant | product participant | limited | no | finance subset | case subset | A |
| Payment/payout | own summary | own summary | own summary | limited | no | A | no | A |
| Private asset | grant | grant | grant | case | KYC scope | no | case | break-glass |
| Post/product | public/own | public/own | own | limited | no | no | A | A |
| Audit log | no | no | no | limited | own action | finance | moderation | A |

## Resource rules

### Orders

- buyer/provider/seller participants and authorized staff only
- staff access scoped to case/operation
- no direct client Firestore
- admin transition requires reason/audit

### Files

- owner or explicit grant
- KYC/private purpose-specific policy
- short-lived access
- access may expire
- public content uses derived media, not source model

### Messages

- membership required
- attachment permission independently checked
- moderator only via report/case
- spam/rate controls

### Reviews

- completed eligible order
- reviewer derived from auth/order
- verified flag server-generated
- promotion cannot change score

## Data classification

| Class | Examples | Controls |
|---|---|---|
| Public | public provider/post/product | integrity, moderation, CDN |
| Internal | flags/metrics | staff/service |
| Confidential | order/chat/address/private model | participant access, encryption |
| Highly sensitive | KYC/payment token | strict access, masking, audit |
| Financial | payment/refund/payout/totals | immutable history, reconciliation |

## PDPA/privacy

- consent and purpose records
- notice version
- export/correction/deletion
- legal retention exceptions
- vendor processing inventory
- sensitive access logs
- minimize KYC copies
- showcase consent

## Firebase strategy

### Firestore

Default:

```text
Client business collection read/write: deny
Backend Admin SDK: application authorization
```

Illustrative rule:

```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Any direct client access requires ADR, narrow ownership/field validation and Emulator tests.

### Storage

Illustrative:

```rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /private/{assetId}/{fileName} {
      allow read, write: if false;
    }
    match /public-content/{assetId}/{fileName} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

Uploads use backend-created session/signed access, generated key, size/type constraint, quarantine and completion verification.

## App Check

Rollout:

1. debug/development
2. production monitor
3. analyze invalid traffic
4. enforce selected endpoints
5. expand with fallback plan

Not a replacement for auth.

## Secrets

- Secret Manager
- no secrets in source/client/log
- separate environment
- minimum IAM
- rotation/revocation
- webhook key overlap during rotation
- short-lived CI identity

## Payment security

- no PAN/CVV
- hosted/partner UI
- raw-body signature
- unique provider event
- idempotent processing
- amount/currency/order match
- reconciliation
- role/reason for refund/payout
- masked log
- alert mismatch

## File security

- extension/MIME/magic validation
- size/count quota
- checksum
- malware scan
- parser/slicer sandbox with CPU/memory/time limits
- never build shell command from filename
- isolated temporary directory
- private by default
- temporary access/audit
- reject unsafe archives

## Abuse controls

- IP/user/device/resource rate limits
- CAPTCHA for high-risk anonymous flow
- upload quota
- message/comment/reaction throttle
- proposal spam control
- duplicate listing detection
- prohibited-item detection + human review
- report/block
- account/device risk
- promotion review

## Audit log

Required for role changes, KYC, suspension, admin order transition, refund/payout, dispute, private staff file access, moderation, config, export/restore and break-glass.

Fields:

- event ID
- UTC time
- actor/service
- action
- resource
- reason/ticket
- request/trace ID
- outcome
- safe diff
- no secret/full payload

## Testing

Automated:

- authorization unit
- Firestore/Storage rules
- API negative/IDOR
- webhook replay
- file fuzz/resource exhaustion
- dependency/SAST/secret scan
- container scan
- rate limit
- boundary lint for Firebase imports

Manual/periodic:

- threat model review
- penetration test
- recovery tabletop
- staff access review
- vendor review
- PDPA data-flow review

## Release checklist

- [ ] no critical/high unresolved issue
- [ ] auth/authz tests
- [ ] rules tests
- [ ] secret scan
- [ ] webhook replay
- [ ] private file access
- [ ] PII logging review
- [ ] backup/export healthy
- [ ] incident runbook
- [ ] admin audit
- [ ] sponsored/content policy

## Open questions

- MFA/recent-auth rules
- KYC vendor/retention
- prohibited-item policy
- payout/fund flow
- realtime transport
- WAF/bot management
- penetration cadence
- legal retention
