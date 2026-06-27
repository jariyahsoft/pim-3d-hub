<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 32: Implement Signed Payment Webhooks, Idempotency and Reconciliation

## 🤖 Recommended Model
> Complexity: **Very High** — replay-safe financial events, signature verification and exactly-once business effects

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | A | Sonnet 4.6 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ replay-safe financial events, signature verification and exactly-once business effects |
| Gemini | A | Flash 3.5 | high | เหมาะกับการตรวจ consistency และ workflow สำหรับ replay-safe financial events, signature verification and exactly-once business effects |
| GPT | A | GPT-5.5 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ replay-safe financial events, signature verification and exactly-once business effects |
| Budget | A | DeepSeek V4 Pro | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ replay-safe financial events, signature verification and exactly-once business effects |

## Context Files
Read these before starting:
- `docs/design/04-api-standard.md`
- `docs/design/07-security-rules.md`
- `docs/design/09-testing-guide.md`
- `docs/design/03-database-design.md`

## Source Traceability
- `T0182`
- `T0183`
- `US-034`

## Phase
Phase 1A — Payments

## Prerequisites
- Task 09
- Task 31

## Instructions

1. **Webhook boundary**
   - Implement raw-body signature verification before JSON/business transformation.
   - Validate provider, event type, external event ID, amount, currency and internal reference.
   - Return safe responses for known duplicates and unsupported events.

2. **Idempotent processing**
   - Persist unique provider event/idempotency record.
   - Update payment intent and order through an atomic/controlled transaction and outbox.
   - Handle out-of-order events without regressing terminal state.

3. **Reconciliation**
   - Create a reconciliation query/report comparing internal and provider test records.
   - Alert on amount/currency/reference mismatch and repeated signature failures.

4. **Tests**
   - Add replay, concurrent duplicate, invalid signature, amount mismatch and out-of-order fixtures.

## Verify
- One provider event produces one payment/order effect
- Invalid signature changes no business state
- Amount/currency mismatch is held/alerted
- Reconciliation identifies deliberate mismatch

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
