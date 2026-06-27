<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 22: Implement Service Request Draft and Publish Flow

## 🤖 Recommended Model
> Complexity: **Medium** — manual design/print request CRUD and mobile draft workflow

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | B | Haiku 4.5 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ manual design/print request CRUD and mobile draft workflow |
| Gemini | B | Flash 3.5 | mid | เหมาะกับการตรวจ consistency และ workflow สำหรับ manual design/print request CRUD and mobile draft workflow |
| GPT | B | GPT-5.4 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ manual design/print request CRUD and mobile draft workflow |
| Budget | B | DeepSeek V4 Flash | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ manual design/print request CRUD and mobile draft workflow |

## Context Files
Read these before starting:
- `docs/design/03-database-design.md`
- `docs/design/04-api-standard.md`
- `docs/design/06-backlog.md`
- `docs/design/08-ui-guide.md`

## Source Traceability
- `T0140`
- `US-020`

## Phase
Phase 1A — Jobs

## Prerequisites
- Task 15
- Task 16
- Task 18

## Instructions

1. **Domain/API**
   - Implement service request aggregate, repository and draft/create/update/publish/close commands.
   - Support the three service types, requirements, budget, due date, region and privacy mode.
   - Use expectedVersion and preserve status history.

2. **Validation/policy**
   - Validate due date, budget and prohibited-work acknowledgement.
   - Prevent publish when required fields or role/account status are invalid.
   - Treat free text and uploaded metadata as untrusted.

3. **Web UI**
   - Create the service-type chooser and multi-step request form with autosaved draft.
   - Include loading, error, offline and permission-denied states.

## Verify
- Buyer can save and resume a draft
- Published request cannot be edited outside approved change policy
- Unauthorized user cannot read private request
- Mobile form validation and accessibility tests pass

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
