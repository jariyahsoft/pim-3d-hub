<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 28: Implement Order Transition Commands and Status Events

## 🤖 Recommended Model
> Complexity: **High** — permission-aware state transitions, optimistic concurrency and audit trail

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | A | Sonnet 4.6 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ permission-aware state transitions, optimistic concurrency and audit trail |
| Gemini | A | Flash 3.5 | high | เหมาะกับการตรวจ consistency และ workflow สำหรับ permission-aware state transitions, optimistic concurrency and audit trail |
| GPT | A | GPT-5.5 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ permission-aware state transitions, optimistic concurrency and audit trail |
| Budget | A | DeepSeek V4 Pro | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ permission-aware state transitions, optimistic concurrency and audit trail |

## Context Files
Read these before starting:
- `docs/design/03-database-design.md`
- `docs/design/04-api-standard.md`
- `docs/design/06-backlog.md`
- `docs/design/07-security-rules.md`

## Source Traceability
- `T0162`
- `US-031`

## Phase
Phase 1A — Orders

## Prerequisites
- Task 16
- Task 27

## Instructions

1. **Transition service**
   - Implement explicit order transition commands using the approved state matrix.
   - Validate actor, source state, expectedVersion and transition-specific preconditions.
   - Never expose a generic status patch endpoint.

2. **History/events**
   - Append `order_status_event` with actor, reason and request ID.
   - Emit domain/outbox events for notifications and secondary projections.
   - Require reason for admin override and preserve original history.

3. **API/tests**
   - Implement `/orders/{id}/transitions` contract.
   - Add table-driven tests for all allowed/denied transition rows and retry behavior.

## Verify
- All state matrix rows have automated tests
- Stale version returns conflict and leaves order unchanged
- Unauthorized actor cannot transition order
- Retry does not duplicate status event/notification

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
