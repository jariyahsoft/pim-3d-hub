<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 20: Implement Provider Capacity Slots and Reservations

## 🤖 Recommended Model
> Complexity: **High** — concurrent capacity accounting and expiry-safe reservations

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | A | Sonnet 4.6 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ concurrent capacity accounting and expiry-safe reservations |
| Gemini | A | Flash 3.5 | high | เหมาะกับการตรวจ consistency และ workflow สำหรับ concurrent capacity accounting and expiry-safe reservations |
| GPT | A | GPT-5.5 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ concurrent capacity accounting and expiry-safe reservations |
| Budget | A | DeepSeek V4 Pro | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ concurrent capacity accounting and expiry-safe reservations |

## Context Files
Read these before starting:
- `docs/design/01-architecture.md`
- `docs/design/03-database-design.md`
- `docs/design/06-backlog.md`
- `docs/design/09-testing-guide.md`

## Source Traceability
- `T0346 (capacity foundation subset)`
- `US-012`

## Phase
Phase 1A — Provider Supply

## Prerequisites
- Task 08
- Task 19

## Instructions

1. **Capacity domain**
   - Implement capacity slots, closures and reservations with total/reserved units and versioning.
   - Define reservation expiry and release commands independent of pricing.
   - Prevent reservations on inactive printer/provider/service.

2. **Concurrency**
   - Use repository transaction/expectedVersion behavior to prevent oversubscription.
   - Make reserve/release idempotent.
   - Add an expiry worker/event path with safe retries.

3. **Provider UI/API**
   - Create a basic capacity calendar/list and pause/close controls.
   - Display conflicts and current reservations without exposing buyer-private data.

4. **Tests**
   - Add concurrent reservation and expiry tests against Firestore emulator.

## Verify
- Concurrent attempts never exceed capacity
- Same idempotency key creates one reservation
- Expired reservation releases exactly once
- Closed printer/date rejects reservation with stable error code

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
