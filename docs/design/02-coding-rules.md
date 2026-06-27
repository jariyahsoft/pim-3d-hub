# 02 — Coding Rules

## Source

- `3d-print-marketplace-SRS-firebase-portable-v1.md`: Sections 3–4, 18–22, 25–30
- Related: [Architecture](01-architecture.md), [API Standard](04-api-standard.md)

## Purpose

กติกานี้ใช้กับมนุษย์และ AI agents ทุกคน เพื่อป้องกัน coupling กับ Firebase และรักษาความสอดคล้องของระบบ

## Core rules

1. Domain code ต้องเป็น framework-agnostic
2. Business data เข้าถึงผ่าน API และ Repository เท่านั้น
3. Firebase SDK imports อนุญาตเฉพาะ Infrastructure/Client Integration ที่กำหนด
4. ทุก external provider ต้องอยู่หลัง Port/Adapter
5. Public API ต้องมี schema validation และ OpenAPI
6. Money ใช้ integer minor unit
7. Date/time ใน contract ใช้ RFC3339 UTC
8. Identifier ใช้ canonical UUIDv7
9. Mutation สำคัญรองรับ idempotency และ concurrency control
10. Business status เปลี่ยนผ่าน explicit state machine/use case เท่านั้น

## TypeScript conventions

- เปิด `strict`
- ห้ามใช้ `any` ยกเว้น boundary ที่ validate แล้วและมีเหตุผล
- ใช้ `unknown` สำหรับ input ที่ยังไม่ validate
- DTO, Domain Entity และ Persistence Record ต้องแยก type
- Enum ที่มาจาก API ต้องรองรับ unknown/future value
- ใช้ string union หรือ `as const`
- Public function ต้องมี explicit return type
- ใช้ immutable value objects ใน Domain
- ห้ามโยน raw SDK error ขึ้น API

ตัวอย่าง:

```ts
export const OrderStatus = {
  DRAFT: "DRAFT",
  AWAITING_PAYMENT: "AWAITING_PAYMENT",
  PAID: "PAID",
  IN_PRODUCTION: "IN_PRODUCTION",
  SHIPPED: "SHIPPED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  DISPUTED: "DISPUTED",
} as const;

export type OrderStatus =
  (typeof OrderStatus)[keyof typeof OrderStatus];
```

## Layer boundaries

### Domain

อนุญาต:

- entities, value objects, policies, domain events
- repository interfaces
- domain-specific errors
- state machines

ห้าม:

- Firebase/Google Cloud imports
- HTTP request/response
- framework decorators
- database query syntax
- environment variables
- logging SDK

### Application

อนุญาต:

- use cases
- authorization policy orchestration
- ports
- transaction boundaries
- DTO mapping
- outbox orchestration

ห้าม:

- Firestore collection namesใน business logic
- raw payment/storage/search SDK

### Infrastructure

รับผิดชอบ:

- Firestore/PostgreSQL/MongoDB mapping
- Firebase Auth verification
- Object Storage
- Payment/Search/Shipping/Notification adapters
- SDK error translation
- retry/timeout implementation

### Presentation

รับผิดชอบ:

- HTTP parsing
- auth context
- schema validation
- status code and response envelope
- ไม่มี business decisions

## Naming

- folders/files: `kebab-case`
- components/classes/types: `PascalCase`
- variables/functions: `camelCase`
- constants: `UPPER_SNAKE_CASE`
- API/database fields: `camelCase`
- permissions: `<domain>.<resource>.<action>`
- events: `<domain>.<entity>.<past_tense>`

## Entity rules

ทุก entity หลักมี:

```ts
type EntityBase = {
  id: string;
  schemaVersion: number;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};
```

- `id` เป็น UUIDv7
- `version` ใช้ optimistic concurrency
- status เปลี่ยนผ่าน Domain
- financial/order snapshots immutable ตาม policy
- ไม่ expose persistence metadata ที่ client ไม่ต้องใช้

## Data mapping

ต้องมี mapper แยก:

```text
API DTO <-> Application Command/Result
Persistence Record <-> Domain Entity
Domain Event <-> Integration Event
```

Firestore mapper เป็นจุดเดียวที่แปลง Firestore Timestamp, GeoPoint, Document data และ transaction representation

ห้ามส่ง `DocumentSnapshot`, `DocumentReference`, `Timestamp`, `FieldValue` ออกจาก adapter

## Validation

- Validate request ที่ boundary
- Validate environment ตอน startup
- Validate webhook signature ก่อน business parsing
- Validate file MIME, extension, size และ checksum
- Domain validation ป้องกัน invariant ซ้ำ
- อย่าเชื่อ price, role, owner ID หรือ total จาก client
- flexible metadata ต้องมี versioned schema

## Error handling

มาตรฐาน error:

- `ValidationError`
- `AuthenticationError`
- `AuthorizationError`
- `NotFoundError`
- `ConflictError`
- `StateTransitionError`
- `RateLimitError`
- `ExternalProviderError`
- `InfrastructureError`

ข้อกำหนด:

- API ส่ง stable error code
- internal details log ฝั่ง server เท่านั้น
- external timeout/retry map เป็น controlled error
- ห้าม catch แล้ว ignore
- background failure ต้องมี attempt และ dead-letter state

## Logging

ใช้ structured logging:

```json
{
  "severity": "INFO",
  "event": "order.transition.completed",
  "requestId": "req_...",
  "traceId": "trace_...",
  "orderId": "uuid",
  "fromStatus": "PAID",
  "toStatus": "IN_PRODUCTION",
  "durationMs": 42
}
```

ห้าม log password, token, secret, PAN/CVV, KYC document, signed URL, private file content หรือ PII ที่ไม่ mask

## Configuration

- อ่าน environment ใน composition root
- module รับ typed config
- ไม่มี `process.env` ใน Domain/Application
- config schema reject ค่า invalid
- secret ใช้ Secret Manager
- แยก environment
- risky rollout ใช้ feature flag

## API/client boundary

- Client ใช้ generated API client
- Client-side validationเพื่อ UX เท่านั้น
- Server เป็น source of truth
- cursor opaque
- financial mutation ใช้ `Idempotency-Key`
- aggregate update ใช้ `expectedVersion` หรือ ADR-approved ETag
- breaking change ออก API version ใหม่

## Firebase-specific rules

Client Firebase SDK ใช้เฉพาะ:

- Authentication
- App Check
- FCM/PWA push token

Client ห้าม:

- query Firestore business collections
- upload private fileโดยไม่มี upload session
- trust client role/claim เป็น authorization หลัก

Backend:

- verify token
- map external UID -> internal UUID
- Admin SDK อยู่ใน adapter
- rulesเป็น defense in depth
- emulator rules tests required

## Money and pricing

- field ลงท้าย `Minor`
- currency required
- no floating point
- pricing profile versioned
- quote stores immutable input/output snapshot
- rounding policy explicit and tested
- fee/discount/tax เป็น line items
- client total ไม่ใช่ source of truth

## State machines

ทุก transition ระบุ:

- allowed source
- target
- actor permission
- preconditions
- domain/outbox events
- admin reason
- retry/idempotency behavior

ห้าม update status fieldตรงจาก controller

## Events/jobs

- unique event ID
- idempotent consumer
- versioned payload
- transient/permanent retry classification
- timeout on external calls
- dead-letter and replay
- duplicate payment/refund/message prohibited

## Frontend

- Mobile-first
- semantic HTML
- keyboard/screen-reader support
- loading/empty/error/success/offline states
- preserve form draft
- i18n keys
- permission UI ไม่ใช่ security boundary
- uploadมี progress/cancel/retry
- private URLs ไม่เข้า analytics/logs

## i18n

- default `th-TH`, fallback `en`
- canonical codesไม่ใช้ translated labels
- store UTC; display Asia/Bangkok by default
- locale-aware money/date/number
- avoid concatenated translations

## Accessibility

- WCAG AA target for critical flows
- visible focus
- minimum touch target
- field labels/error summary
- statusไม่ใช้สีอย่างเดียว
- reduced motion
- accessible 3D viewer alternative
- captions/descriptions where needed

## Security checklist

- [ ] server authorization
- [ ] input validation
- [ ] no Firebase type in Domain/API
- [ ] no secret/PII in logs
- [ ] idempotency
- [ ] concurrency/version
- [ ] least-privilege file access
- [ ] webhook signature
- [ ] content sanitization
- [ ] rate limit
- [ ] audit for high-risk action
- [ ] dependency scan

## Code review checklist

- [ ] User Story/FR linked
- [ ] module boundary respected
- [ ] Domain rules tested
- [ ] API schema updated
- [ ] adapter mapping tested
- [ ] error/edge states handled
- [ ] accessibility reviewed
- [ ] safe telemetry
- [ ] migration compatibility
- [ ] docs/ADR updated

## Definition of Done

- acceptance criteria pass
- lint/typecheck/build pass
- unit/integration/contract tests pass
- security/rules tests pass
- no high-severity dependency issue
- no unapproved API breaking change
- staging smoke test passes
- documentation/task status updated
