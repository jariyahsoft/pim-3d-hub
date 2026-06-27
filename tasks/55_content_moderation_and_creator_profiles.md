<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 55: Implement Content Moderation and Creator/Provider Profiles

## 🤖 Recommended Model
> Complexity: **High** — public creator identity, reporting and moderation-safe presentation

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | B | Haiku 4.5 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ public creator identity, reporting and moderation-safe presentation |
| Gemini | B | Flash 3.5 | mid | เหมาะกับการตรวจ consistency และ workflow สำหรับ public creator identity, reporting and moderation-safe presentation |
| GPT | B | GPT-5.4 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ public creator identity, reporting and moderation-safe presentation |
| Budget | B | DeepSeek V4 Flash | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ public creator identity, reporting and moderation-safe presentation |

## Context Files
Read these before starting:
- `docs/design/06-backlog.md`
- `docs/design/07-security-rules.md`
- `docs/design/08-ui-guide.md`
- `docs/design/04-api-standard.md`

## Source Traceability
- `T0405`
- `T0406`

## Phase
Phase 1C — Content

## Prerequisites
- Task 39
- Task 53
- Task 54

## Instructions

1. **Creator profile**
   - Create public creator/provider content profile with posts, followed state and linked services/products.
   - Separate public counts from private account data.
   - Handle suspended/hidden creator states.

2. **Moderation integration**
   - Connect reports to moderation cases for posts/comments/media.
   - Implement hide/remove/suspend actions with reason, duration, audit and notification.
   - Preserve evidence for authorized staff.

3. **UI**
   - Create creator profile, content editor status and moderation feedback screens.
   - Support reporting, blocked/removed content and appeal placeholder if policy is open.

## Verify
- Moderator action updates public visibility and audit exactly once
- Suspended creator cannot publish new content
- Public profile leaks no contact/KYC data
- Report and moderation access tests pass

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
