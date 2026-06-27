<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 31: Implement Payment Port, Sandbox Adapter and Payment Intents

## 🤖 Recommended Model
> Complexity: **High** — provider-neutral payment initiation, amount integrity and checkout state

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | A | Sonnet 4.6 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ provider-neutral payment initiation, amount integrity and checkout state |
| Gemini | A | Flash 3.5 | high | เหมาะกับการตรวจ consistency และ workflow สำหรับ provider-neutral payment initiation, amount integrity and checkout state |
| GPT | A | GPT-5.5 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ provider-neutral payment initiation, amount integrity and checkout state |
| Budget | A | DeepSeek V4 Pro | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ provider-neutral payment initiation, amount integrity and checkout state |

## Context Files
Read these before starting:
- `docs/design/01-architecture.md`
- `docs/design/03-database-design.md`
- `docs/design/04-api-standard.md`
- `docs/design/07-security-rules.md`

## Source Traceability
- `T0180`
- `T0181`
- `US-034`

## Phase
Phase 1A — Payments

## Prerequisites
- Task 01
- Task 27
- Task 28

## Instructions

1. **Payment port**
   - Define provider-neutral create/get/cancel/refund capability contracts using canonical DTOs.
   - Keep raw provider payloads and SDK types inside the adapter.
   - Implement a deterministic sandbox/fake adapter for automated tests.

2. **Payment intent domain/API**
   - Implement payment intent lifecycle linked to order, amount/currency, provider reference and expiry.
   - Recalculate/verify amount from server-side order snapshot.
   - Require idempotency for intent creation.

3. **Checkout UI**
   - Create generic payment-method selection and provider handoff state without real bank branding.
   - Handle pending, failed, expired and retry without duplicate intent.

## Verify
- Client-supplied total cannot change payment amount
- Same idempotency key returns the same intent
- Provider SDK types do not appear in contracts/domain
- Sandbox happy/failure/expiry tests pass

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
