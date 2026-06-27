<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 26: Build Proposal Comparison and Idempotent Acceptance

## 🤖 Recommended Model
> Complexity: **High** — single-winner acceptance transaction, order handoff and async events

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | A | Sonnet 4.6 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ single-winner acceptance transaction, order handoff and async events |
| Gemini | A | Flash 3.5 | high | เหมาะกับการตรวจ consistency และ workflow สำหรับ single-winner acceptance transaction, order handoff and async events |
| GPT | A | GPT-5.5 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ single-winner acceptance transaction, order handoff and async events |
| Budget | A | DeepSeek V4 Pro | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ single-winner acceptance transaction, order handoff and async events |

## Context Files
Read these before starting:
- `docs/design/04-api-standard.md`
- `docs/design/06-backlog.md`
- `docs/design/08-ui-guide.md`
- `docs/design/09-testing-guide.md`

## Source Traceability
- `T0144`
- `T0145`
- `T0146`
- `US-023`

## Phase
Phase 1A — Jobs

## Prerequisites
- Task 09
- Task 25

## Instructions

1. **Comparison UI**
   - Create responsive proposal cards/table showing total, milestones, revisions, timeline and exclusions.
   - Add chat/question action without bypassing the proposal version.
   - Handle empty, withdrawn and expired proposal states.

2. **Acceptance transaction**
   - Implement an idempotent accept command that validates buyer, request status, proposal revision and expiry.
   - Mark exactly one proposal accepted, update request state and create an order handoff record/snapshot.
   - Handle concurrent acceptance with a conflict result.

3. **Events/notifications**
   - Write outbox events for accepted/rejected proposals and notification jobs.
   - Ensure retries do not create duplicate order or notification.

## Verify
- Concurrent acceptance produces one accepted proposal and one order
- Same idempotency key returns original result
- Expired/withdrawn proposal cannot be accepted
- Comparison UI works on mobile and desktop

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
