<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 36: Implement Conversations, Chat UI and Attachment Access

## 🤖 Recommended Model
> Complexity: **High** — participant-only messaging, pagination and private attachments

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | B | Haiku 4.5 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ participant-only messaging, pagination and private attachments |
| Gemini | B | Flash 3.5 | mid | เหมาะกับการตรวจ consistency และ workflow สำหรับ participant-only messaging, pagination and private attachments |
| GPT | B | GPT-5.4 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ participant-only messaging, pagination and private attachments |
| Budget | B | DeepSeek V4 Flash | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ participant-only messaging, pagination and private attachments |

## Context Files
Read these before starting:
- `docs/design/03-database-design.md`
- `docs/design/04-api-standard.md`
- `docs/design/07-security-rules.md`
- `docs/design/08-ui-guide.md`

## Source Traceability
- `T0220`
- `T0221`
- `T0222`
- `US-040`

## Phase
Phase 1A — Messaging

## Prerequisites
- Task 16
- Task 23

## Instructions

1. **Messaging domain/API**
   - Implement conversations, members, messages and read markers tied to request/order context.
   - Use cursor pagination; do not store unbounded message arrays.
   - Support text and approved asset attachments.

2. **Authorization/moderation**
   - Require active conversation membership and asset grant.
   - Support message hidden/moderated state without destroying evidence.
   - Add safe text sanitization and size limits.

3. **Web UI**
   - Create responsive chat thread/composer with send/upload progress, retry and empty/error states.
   - Do not persist signed asset URLs or sensitive message content in analytics.

## Verify
- Unrelated user cannot list/read/send messages
- Attachment requires both conversation membership and asset permission
- Pagination order is stable
- Stored-XSS and oversized-message tests pass

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
