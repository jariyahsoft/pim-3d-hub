<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 54: Implement Social Interactions, Verified Content Links and Showcase Consent

## 🤖 Recommended Model
> Complexity: **High** — unique social relationships, order verification and customer-consent enforcement

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | B | Haiku 4.5 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ unique social relationships, order verification and customer-consent enforcement |
| Gemini | B | Flash 3.5 | mid | เหมาะกับการตรวจ consistency และ workflow สำหรับ unique social relationships, order verification and customer-consent enforcement |
| GPT | B | GPT-5.4 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ unique social relationships, order verification and customer-consent enforcement |
| Budget | B | DeepSeek V4 Flash | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ unique social relationships, order verification and customer-consent enforcement |

## Context Files
Read these before starting:
- `docs/design/03-database-design.md`
- `docs/design/06-backlog.md`
- `docs/design/07-security-rules.md`
- `docs/design/08-ui-guide.md`

## Source Traceability
- `T0402`
- `T0403`
- `T0404`
- `US-071`
- `US-072`
- `US-073`

## Phase
Phase 1C — Content

## Prerequisites
- Task 38
- Task 53

## Instructions

1. **Interactions**
   - Implement comments, reactions, follows and saves as separate entities with uniqueness and rate limits.
   - Use async/rebuildable counters; source relations remain canonical.
   - Support moderation state and cursor pagination.

2. **Verified content**
   - Allow a post/review to receive Verified Purchase only from an eligible completed order and participant.
   - Prevent client-controlled verified flag.
   - Link content to provider/service/product without altering rating logic.

3. **Showcase consent**
   - Implement consent record/scope/withdrawal for providers showing customer work.
   - Block NDA/private jobs and remove/hide content according to withdrawal policy.
   - Keep original model inaccessible.

## Verify
- Duplicate reaction/follow/save is prevented
- Unrelated user cannot create verified-order content
- Withdrawing consent triggers the approved visibility action
- Sponsored state does not imply verification or rating benefit

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
