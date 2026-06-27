<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 27: Approve Order State Matrix and Implement Order Snapshots

## 🤖 Recommended Model
> Complexity: **Very High** — core order lifecycle invariants and immutable commercial snapshots

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | A | Sonnet 4.6 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ core order lifecycle invariants and immutable commercial snapshots |
| Gemini | A | Flash 3.5 | high | เหมาะกับการตรวจ consistency และ workflow สำหรับ core order lifecycle invariants and immutable commercial snapshots |
| GPT | A | GPT-5.5 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ core order lifecycle invariants and immutable commercial snapshots |
| Budget | A | DeepSeek V4 Pro | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ core order lifecycle invariants and immutable commercial snapshots |

## Context Files
Read these before starting:
- `docs/design/03-database-design.md`
- `docs/design/04-api-standard.md`
- `docs/design/05-decisions.md`
- `docs/design/06-backlog.md`
- `docs/design/10-glossary.md`

## Source Traceability
- `T0160`
- `T0161`
- `US-030`
- `US-031`

## Phase
Phase 1A — Orders

## Prerequisites
- Task 01
- Task 06
- Task 26

## Instructions

1. **State matrix decision**
   - Define every service-order state, allowed transition, actor, precondition and terminal behavior.
   - Resolve provider confirmation, payment, cancellation, dispute and completion semantics.
   - Record the accepted matrix in an ADR/contract; do not silently invent policy.

2. **Order aggregate**
   - Implement order, items and participant model with source type/source ID and unique order number.
   - Snapshot accepted proposal/quote, buyer/provider public identity, address and totals.
   - Enforce immutable financial/source snapshots.

3. **Creation flow**
   - Complete order creation from proposal acceptance using idempotency and repository transaction.
   - Emit `orders.order.created` through outbox.

## Verify
- State matrix has no ambiguous transition or missing actor
- Order total and source snapshot reconcile
- Changing original proposal does not alter order
- Duplicate creation command returns one order

## Open Questions
- What provider-confirmation timeout and cancellation/refund rules are approved?
- When does an order become completed automatically versus buyer-confirmed?

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
