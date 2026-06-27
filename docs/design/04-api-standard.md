# 04 — API Standard

## Source

- `3d-print-marketplace-SRS-firebase-portable-v1.md`: Sections 3.7, 5–17, 20–21
- Related: [Architecture](01-architecture.md), [Glossary](10-glossary.md)

## Principles

- REST/JSON over HTTPS
- API-first with OpenAPI
- resource endpoints plus explicit transition commands
- contract independent of database
- server authorization/validation
- cursor pagination
- idempotent financial/order commands
- no Firebase IDs/types/cursors/errors
- backward-compatible within major version

## Base URL

```text
https://api.example.com/api/v1
```

- breaking change -> new major URI version
- additive fields optional
- deprecated fields documented
- unknown enum safe handling
- OpenAPI breaking-change CI

## Authentication

```http
Authorization: Bearer <Firebase ID token>
X-App-Check: <token when enforced>
X-Request-Id: <optional>
```

Backend verifies token, resolves internal UUID, loads active roles/scope and applies policy.

## Request conventions

- JSON `camelCase`
- RFC3339 UTC
- money as `*Minor` + currency
- millimeters explicit
- optional semantics documented
- `expectedVersion` for selected update
- `Idempotency-Key` for critical mutations

## Success envelope

```json
{
  "data": {},
  "meta": {
    "requestId": "req_...",
    "nextCursor": null
  }
}
```

## Error envelope

```json
{
  "error": {
    "code": "ORDER_VERSION_CONFLICT",
    "message": "ข้อมูลคำสั่งซื้อมีการเปลี่ยนแปลง",
    "fields": [],
    "details": {},
    "requestId": "req_..."
  }
}
```

## HTTP mapping

| Status | Use |
|---:|---|
| 400 | malformed/validation |
| 401 | unauthenticated |
| 403 | forbidden |
| 404 | missing/concealed |
| 409 | version/state/idempotency conflict |
| 410 | expired resource |
| 413 | too large |
| 415 | unsupported type |
| 422 | semantic business rejection |
| 429 | rate limit |
| 500 | unexpected internal |
| 502/503/504 | dependency failure |

## Stable error codes

- `VALIDATION_ERROR`
- `AUTHENTICATION_REQUIRED`
- `AUTHORIZATION_DENIED`
- `RESOURCE_NOT_FOUND`
- `RESOURCE_VERSION_CONFLICT`
- `INVALID_STATE_TRANSITION`
- `IDEMPOTENCY_CONFLICT`
- `RATE_LIMIT_EXCEEDED`
- `FILE_TYPE_UNSUPPORTED`
- `FILE_SCAN_REJECTED`
- `MODEL_ANALYSIS_FAILED`
- `INSTANT_QUOTE_NOT_ELIGIBLE`
- `QUOTE_EXPIRED`
- `CAPACITY_UNAVAILABLE`
- `PAYMENT_PROVIDER_ERROR`
- `PAYMENT_WEBHOOK_INVALID`
- `ORDER_VERSION_CONFLICT`
- `PROMOTION_POLICY_VIOLATION`

## Pagination/filter/sort

```text
GET /api/v1/orders?limit=20&cursor=opaque&status=PAID&sort=-updatedAt
```

- max limit
- opaque/signed cursor
- stable sort + ID tie-breaker
- allowlisted filters
- full text uses `q`
- no arbitrary DB query

## Idempotency

Required for order creation, proposal acceptance, capacity reservation, payment intent, webhook, refund, payout and shipment.

Behavior:

- key scoped to actor + operation
- request hash stored
- same key/same request returns original result
- same key/different request -> 409
- retention exceeds provider retry window

## Concurrency

Selected command:

```json
{
  "expectedVersion": 7,
  "changes": {}
}
```

Mismatch -> `409 RESOURCE_VERSION_CONFLICT`

## Endpoint catalog

### Identity

```text
POST   /auth/onboarding
GET    /users/me
PATCH  /users/me
POST   /users/me/roles
POST   /verification-cases
GET    /verification-cases/{id}
POST   /organizations
POST   /organizations/{id}/members
```

### Provider

```text
POST   /provider-profiles
GET    /provider-profiles/{id}
PATCH  /provider-profiles/{id}
POST   /provider-services
PATCH  /provider-services/{id}
POST   /printers
PATCH  /printers/{id}
POST   /provider-materials
POST   /pricing-profiles
POST   /capacity-slots
GET    /providers/{id}/availability
```

### Files

```text
POST   /files/upload-sessions
POST   /files/{id}/complete-upload
GET    /files/{id}
DELETE /files/{id}
POST   /files/{id}/analysis
GET    /files/{id}/analyses/latest
POST   /files/{id}/access-grants
```

### Jobs/proposals

```text
POST   /service-requests
GET    /service-requests/{id}
PATCH  /service-requests/{id}
POST   /service-requests/{id}/publish
POST   /service-requests/{id}/close
GET    /service-requests/{id}/proposals
POST   /service-requests/{id}/proposals
POST   /proposals/{id}/revisions
POST   /proposals/{id}/accept
```

### Instant pricing

```text
POST   /instant-quotes/eligibility
POST   /instant-quotes
GET    /instant-quotes/{id}
POST   /instant-quotes/{id}/reserve
```

### Orders

```text
POST   /orders
GET    /orders
GET    /orders/{id}
POST   /orders/{id}/transitions
POST   /orders/{id}/milestones/{milestoneId}/submit
POST   /orders/{id}/milestones/{milestoneId}/approve
POST   /orders/{id}/change-requests
POST   /orders/{id}/production-updates
GET    /orders/{id}/timeline
```

### Payment/shipping

```text
POST   /orders/{id}/payment-intents
GET    /payment-intents/{id}
POST   /webhooks/payments/{provider}
POST   /payment-intents/{id}/refunds
GET    /seller/payouts
POST   /orders/{id}/shipments
GET    /shipments/{id}
POST   /shipments/{id}/dispatch
POST   /webhooks/shipping/{provider}
```

### Messaging/trust

```text
GET    /conversations
POST   /conversations
GET    /conversations/{id}/messages
POST   /conversations/{id}/messages
POST   /orders/{id}/reviews
POST   /orders/{id}/disputes
POST   /disputes/{id}/evidence
POST   /reports
```

### Content/commerce

```text
POST   /posts
GET    /posts/{id}
PATCH  /posts/{id}
GET    /feed
POST   /posts/{id}/comments
POST   /posts/{id}/reactions
POST   /follows
POST   /saved-items

POST   /products
GET    /products/{id}
PATCH  /products/{id}
POST   /products/{id}/publish
POST   /product-orders
POST   /products/{id}/used-printer-evidence
```

### Search/promotion/notification/admin

```text
GET  /search/providers
GET  /search/services
GET  /search/content
GET  /search/products
GET  /search/jobs

POST /promotion-campaigns
POST /promotion-campaigns/{id}/activate
POST /subscriptions

GET    /notifications
POST   /notifications/{id}/read
POST   /notification-endpoints
PATCH  /notification-preferences

GET  /admin/dashboard
GET  /admin/verification-cases
POST /admin/verification-cases/{id}/decisions
GET  /admin/moderation-cases
POST /admin/moderation-cases/{id}/actions
GET  /admin/audit-logs
```

## Webhook/internal event

```json
{
  "eventId": "evt_uuid",
  "eventType": "payments.payment_succeeded",
  "eventVersion": 1,
  "occurredAt": "2026-06-27T10:00:00Z",
  "source": "payment-adapter",
  "subjectId": "payment-intent-uuid",
  "data": {}
}
```

- verify raw signature
- persist external event ID
- duplicate event returns safe success
- transform provider payload before Domain
- unknown event safe handling

## Notification template keys

- `proposal.received`
- `proposal.accepted`
- `payment.succeeded`
- `order.production_started`
- `order.production_update`
- `shipment.dispatched`
- `shipment.delivered`
- `review.requested`
- `dispute.updated`
- `content.comment_received`
- `promotion.expiring`

## API security checklist

- [ ] token/internal identity
- [ ] App Check
- [ ] ownership/role/org policy
- [ ] schema validation
- [ ] no mass assignment
- [ ] idempotency/version
- [ ] rate limit
- [ ] high-risk audit
- [ ] response privacy
- [ ] sanitized provider errors
- [ ] OpenAPI updated

## Open decisions

- query parameter convention
- ETag vs expectedVersion
- realtime chat transport
- partner/public API auth
- exact rate limits
