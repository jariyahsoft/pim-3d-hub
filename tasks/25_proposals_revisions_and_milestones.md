<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 25: Implement Proposals, Revisions and Proposal Milestones

## 🤖 Recommended Model
> Complexity: **High** — versioned commercial offers, money consistency and milestone terms

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | B | Haiku 4.5 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ versioned commercial offers, money consistency and milestone terms |
| Gemini | B | Flash 3.5 | mid | เหมาะกับการตรวจ consistency และ workflow สำหรับ versioned commercial offers, money consistency and milestone terms |
| GPT | B | GPT-5.4 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ versioned commercial offers, money consistency and milestone terms |
| Budget | B | DeepSeek V4 Flash | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ versioned commercial offers, money consistency and milestone terms |

## Context Files
Read these before starting:
- `docs/design/03-database-design.md`
- `docs/design/04-api-standard.md`
- `docs/design/06-backlog.md`
- `docs/design/02-coding-rules.md`

## Source Traceability
- `T0143`
- `US-022`

## Phase
Phase 1A — Jobs

## Prerequisites
- Task 06
- Task 22
- Task 24

## Instructions

1. **Proposal domain**
   - Implement proposal aggregate with revision number, currency, line items, validity, timeline, exclusions and status.
   - Implement milestone sequence, deliverable, amount and revision policy.
   - Preserve all submitted revisions; never mutate an accepted revision.

2. **API/application**
   - Create submit/revise/withdraw/query endpoints and authorization.
   - Validate total equals line items/milestones according to approved policy.
   - Use integer minor units and expectedVersion.

3. **Provider UI**
   - Build proposal editor with price/milestone breakdown, draft and validation.
   - Clearly expose exclusions such as shipping/painting.

4. **Tests**
   - Cover expired request, duplicate revision, wrong currency/total and unauthorized provider.

## Verify
- Submitted proposal has immutable revision snapshot
- Invalid total/milestone reconciliation is rejected
- Buyer can read proposal but cannot alter provider terms
- Proposal API/component tests pass

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
