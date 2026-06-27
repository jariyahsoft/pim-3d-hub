# 10 — Glossary

## Source

- `3d-print-marketplace-SRS-firebase-portable-v1.md`: Sections 1.4, 2.2, 5–20
- ใช้คำศัพท์เหล่านี้ให้ตรงกันใน code, API, UI และเอกสาร

## Terms

| Term | Meaning | Notes |
|---|---|---|
| Buyer | ผู้ซื้อบริการหรือสินค้า | Role `BUYER` |
| Provider | ผู้ให้บริการด้าน 3D | umbrella term |
| Designer | ผู้ให้บริการออกแบบ 3D | `DESIGN_PROVIDER` |
| Print Provider | ผู้ให้บริการพิมพ์ 3D | `PRINT_PROVIDER` |
| Full-service Provider | รับออกแบบและพิมพ์ | `FULL_SERVICE_PROVIDER` |
| Product Seller | ผู้ขายเครื่อง/วัสดุ/อุปกรณ์ | `PRODUCT_SELLER` |
| Print Farm | ผู้ให้บริการมีหลายเครื่องและคิว | organization-capable |
| Service Request | คำขอรับบริการ | manual proposal path |
| Proposal | ข้อเสนอจาก provider | versioned |
| Instant Quote | ราคาคำนวณอัตโนมัติ | immutable snapshot |
| Manual Quote | ราคาที่คนประเมิน | proposal |
| Pricing Profile | กฎราคาของ provider | versioned/effective |
| Eligibility | การเข้าเงื่อนไขราคาอัตโนมัติ | reason codes |
| Capacity Slot | กำลังผลิตช่วงเวลา | reservable |
| Order | ธุรกรรม/งานที่ยืนยันแล้ว | service/product |
| Milestone | งวดงาน/ส่งมอบ/ชำระ | design/high-value |
| Change Request | เปลี่ยน scope/ราคา/เวลา | explicit approval |
| Production Update | หลักฐานระหว่างผลิต | text/media |
| Asset | ไฟล์ model/media/document | bytes in storage |
| Model Analysis | ผลวิเคราะห์ไฟล์/geometry | analyzer version |
| Verified Purchase | รีวิวผูกกับ order จริง | server-derived |
| Sponsored | รายการจ่ายเงินเพิ่มการมองเห็น | labeled |
| KYC | การยืนยันตัวตน | sensitive |
| Canonical Model | model กลางไม่ผูก DB | portable |
| Repository | persistence interface | no SDK type |
| Adapter | provider-specific implementation | infrastructure |
| Port | external-service interface | application-facing |
| Outbox | event committed with aggregate | reliable async |
| Read Model | denormalized projection | rebuildable |
| Idempotency | retry without duplicate effect | key/record |
| Optimistic Concurrency | save with expected version | conflict |
| PWA | installable web application | Phase 1 |
| RPO | acceptable data loss window | recovery |
| RTO | acceptable recovery time | recovery |

## Roles

| Code | Meaning |
|---|---|
| `BUYER` | ซื้อบริการ/สินค้า |
| `DESIGN_PROVIDER` | รับออกแบบ |
| `PRINT_PROVIDER` | รับพิมพ์ |
| `FULL_SERVICE_PROVIDER` | ออกแบบและพิมพ์ |
| `PRODUCT_SELLER` | ขายสินค้า |
| `CONTENT_CREATOR` | สร้างคอนเทนต์ |
| `SUPPORT_AGENT` | Support |
| `KYC_REVIEWER` | ตรวจ KYC |
| `FINANCE_ADMIN` | Refund/Payout |
| `MODERATOR` | Moderation |
| `PLATFORM_ADMIN` | Platform admin |

## Entities

| Entity | Description |
|---|---|
| `user` | internal marketplace user |
| `user_identity` | external identity mapping |
| `provider_profile` | public provider/business profile |
| `provider_service` | offered service |
| `printer` | provider machine |
| `printer_capability` | supported process/material/quality |
| `file_asset` | file metadata |
| `model_analysis` | analyzer result |
| `service_request` | buyer request |
| `proposal` | provider offer |
| `instant_quote` | automatic quote |
| `order` | confirmed workflow |
| `payment_intent` | payment record |
| `shipment` | delivery |
| `review` | order-linked review |
| `post` | community content |
| `product` | commerce listing |
| `promotion_campaign` | paid visibility |
| `outbox_event` | async event |
| `audit_log` | append-only sensitive action |

## Status values

### KYC

`NOT_STARTED`, `PENDING`, `NEEDS_MORE_INFO`, `APPROVED`, `REJECTED`, `SUSPENDED`

### File

`PENDING_UPLOAD`, `UPLOADED`, `QUARANTINED`, `SCANNING`, `READY`, `REJECTED`, `DELETED`

### Service request — proposed

`DRAFT`, `PUBLISHED`, `MATCHING`, `PROPOSAL_SELECTED`, `CLOSED`, `CANCELLED`, `EXPIRED`

### Proposal

`DRAFT`, `SUBMITTED`, `REVISED`, `ACCEPTED`, `REJECTED`, `WITHDRAWN`, `EXPIRED`

### Quote

`PENDING`, `ACTIVE`, `RESERVED`, `CONSUMED`, `EXPIRED`, `INVALIDATED`

### Service order — proposed

`DRAFT`, `AWAITING_PROVIDER_CONFIRMATION`, `AWAITING_PAYMENT`, `PAID`, `PREPARING`, `IN_PRODUCTION`, `POST_PROCESSING`, `QUALITY_CHECK`, `READY_TO_SHIP`, `SHIPPED`, `DELIVERED`, `COMPLETED`, `CANCELLED`, `DISPUTED`

### Payment

`CREATED`, `PENDING`, `SUCCEEDED`, `FAILED`, `EXPIRED`, `PARTIALLY_REFUNDED`, `REFUNDED`

### Shipment

`DRAFT`, `READY`, `DISPATCHED`, `IN_TRANSIT`, `DELIVERED`, `FAILED`, `RETURNED`, `CANCELLED`

### Content/product moderation

`DRAFT`, `PENDING_REVIEW`, `PUBLISHED`, `HIDDEN`, `REJECTED`, `REMOVED`, `SUSPENDED`

Exact enumsต้องอนุมัติใน contracts/ADR.

## Permission naming

Pattern:

```text
<domain>.<resource>.<action>
```

Examples:

- `users.profile.update.self`
- `providers.profile.manage.self`
- `jobs.proposal.create`
- `orders.read.participant`
- `orders.transition.production`
- `payments.refund.execute`
- `payouts.approve`
- `kyc.case.review`
- `content.moderate`
- `audit.read`
- `platform.config.update`

## Error codes

| Code | Meaning |
|---|---|
| `VALIDATION_ERROR` | invalid input |
| `AUTHENTICATION_REQUIRED` | no valid identity |
| `AUTHORIZATION_DENIED` | forbidden |
| `RESOURCE_NOT_FOUND` | missing/concealed |
| `RESOURCE_VERSION_CONFLICT` | concurrency conflict |
| `INVALID_STATE_TRANSITION` | transition not allowed |
| `IDEMPOTENCY_CONFLICT` | key reused differently |
| `RATE_LIMIT_EXCEEDED` | throttled |
| `FILE_TYPE_UNSUPPORTED` | unsupported file |
| `FILE_SCAN_REJECTED` | unsafe file |
| `MODEL_ANALYSIS_FAILED` | analysis failed |
| `INSTANT_QUOTE_NOT_ELIGIBLE` | manual path required |
| `QUOTE_EXPIRED` | expired |
| `CAPACITY_UNAVAILABLE` | no capacity |
| `PAYMENT_PROVIDER_ERROR` | provider failure |
| `PAYMENT_WEBHOOK_INVALID` | invalid webhook |
| `ORDER_VERSION_CONFLICT` | order changed |

## Event names

- `identity.user.onboarded`
- `files.asset.uploaded`
- `files.analysis.completed`
- `jobs.request.published`
- `jobs.proposal.submitted`
- `jobs.proposal.accepted`
- `pricing.quote.created`
- `pricing.capacity.reserved`
- `orders.order.created`
- `orders.order.status_changed`
- `payments.payment.succeeded`
- `payments.refund.completed`
- `shipping.shipment.dispatched`
- `trust.review.created`
- `trust.dispute.opened`
- `content.post.published`
- `commerce.product.published`
- `promotion.campaign.activated`
