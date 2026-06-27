<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 50: Implement Quote Snapshot, Expiry and Capacity Reservation

## 🤖 Recommended Model
> Complexity: **Very High** — immutable price locking, expiration and concurrent capacity reservation

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | A | Sonnet 4.6 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ immutable price locking, expiration and concurrent capacity reservation |
| Gemini | A | Flash 3.5 | high | เหมาะกับการตรวจ consistency และ workflow สำหรับ immutable price locking, expiration and concurrent capacity reservation |
| GPT | A | GPT-5.5 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ immutable price locking, expiration and concurrent capacity reservation |
| Budget | A | DeepSeek V4 Pro | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ immutable price locking, expiration and concurrent capacity reservation |

## Context Files
Read these before starting:
- `docs/design/03-database-design.md`
- `docs/design/04-api-standard.md`
- `docs/design/06-backlog.md`
- `docs/design/09-testing-guide.md`

## Source Traceability
- `T0345`
- `T0346`
- `US-062`
- `US-063`

## Phase
Phase 1B — Pricing

## Prerequisites
- Task 20
- Task 49

## Instructions

1. **Quote persistence**
   - Persist buyer/provider/file/analysis/profile/rule versions, input snapshot, line items, totals and expiry.
   - Implement ACTIVE, RESERVED, CONSUMED, EXPIRED and INVALIDATED transitions.
   - Make snapshot immutable except controlled status/version fields.

2. **Reservation**
   - Implement idempotent quote reservation linked to capacity reservation and actor.
   - Use transaction/versioning to prevent oversell.
   - Release on expiry/cancel/failed checkout through retry-safe worker.

3. **Order handoff**
   - Create order only from valid reserved/active quote according to accepted flow.
   - Consume quote exactly once and preserve snapshot.

## Verify
- Expired quote cannot create an order
- Concurrent reserve attempts cannot oversell capacity
- Retry returns original reservation/quote result
- Order total exactly matches consumed quote snapshot

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
