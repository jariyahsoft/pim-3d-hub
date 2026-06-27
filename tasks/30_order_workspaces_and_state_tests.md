<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 30: Build Buyer/Provider Order Workspaces and Complete State Tests

## 🤖 Recommended Model
> Complexity: **Medium** — mobile order timeline, actor-specific actions and comprehensive state UI

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | B | Haiku 4.5 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ mobile order timeline, actor-specific actions and comprehensive state UI |
| Gemini | B | Flash 3.5 | mid | เหมาะกับการตรวจ consistency และ workflow สำหรับ mobile order timeline, actor-specific actions and comprehensive state UI |
| GPT | B | GPT-5.4 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ mobile order timeline, actor-specific actions and comprehensive state UI |
| Budget | B | DeepSeek V4 Flash | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ mobile order timeline, actor-specific actions and comprehensive state UI |

## Context Files
Read these before starting:
- `docs/design/08-ui-guide.md`
- `docs/design/06-backlog.md`
- `docs/design/02-coding-rules.md`
- `docs/design/09-testing-guide.md`

## Source Traceability
- `T0166`
- `T0167`

## Phase
Phase 1A — Orders

## Prerequisites
- Tasks 27–29

## Instructions

1. **Buyer workspace**
   - Create order list/detail/timeline with price snapshot, milestones, production updates, files and next action.
   - Show only actions allowed for the buyer and current state.

2. **Provider workspace**
   - Create queue/detail/action interface for confirmation, preparation, production, QC and shipping handoff.
   - Display conflicts and refresh safely when version changes.

3. **State UI/testing**
   - Create fixtures/stories/tests for every meaningful order status.
   - Handle loading, empty, offline, permission denied, cancelled, disputed and version conflict states.
   - Add responsive and accessibility checks.

## Verify
- Buyer/provider see the same canonical status and timeline
- UI never presents an action the API policy would always deny
- Every order state has a tested render
- Mobile keyboard/screen-reader smoke passes

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
