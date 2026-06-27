<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 38: Implement Verified Reviews and Review UI

## 🤖 Recommended Model
> Complexity: **Medium** — completed-order review eligibility and trustworthy rating display

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | B | Haiku 4.5 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ completed-order review eligibility and trustworthy rating display |
| Gemini | B | Flash 3.5 | mid | เหมาะกับการตรวจ consistency และ workflow สำหรับ completed-order review eligibility and trustworthy rating display |
| GPT | B | GPT-5.4 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ completed-order review eligibility and trustworthy rating display |
| Budget | B | DeepSeek V4 Flash | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ completed-order review eligibility and trustworthy rating display |

## Context Files
Read these before starting:
- `docs/design/03-database-design.md`
- `docs/design/06-backlog.md`
- `docs/design/08-ui-guide.md`
- `docs/design/07-security-rules.md`

## Source Traceability
- `T0240`
- `T0241`
- `US-071`

## Phase
Phase 1A — Trust

## Prerequisites
- Task 27
- Task 30

## Instructions

1. **Review domain/API**
   - Implement review eligibility from completed order and subject relationship.
   - Support rating dimensions, text, approved media and seller response.
   - Generate verified flag server-side and enforce one-review policy.

2. **UI**
   - Create review form, review list/summary and seller response UI.
   - Display low sample size and verified badge clearly.
   - Include validation, permission and moderation states.

3. **Projection/tests**
   - Update provider/product rating projection from eligible reviews.
   - Ensure sponsored/subscription data cannot alter rating.

## Verify
- User without eligible completed order cannot create verified review
- Duplicate review is rejected or follows approved edit policy
- Rating summary rebuild matches source reviews
- Promotion fields do not affect score

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
