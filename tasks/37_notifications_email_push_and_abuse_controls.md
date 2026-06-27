<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 37: Implement In-App Notifications, Email, PWA Push and Abuse Controls

## 🤖 Recommended Model
> Complexity: **High** — idempotent multi-channel delivery, preferences and spam/rate controls

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | B | Haiku 4.5 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ idempotent multi-channel delivery, preferences and spam/rate controls |
| Gemini | B | Flash 3.5 | mid | เหมาะกับการตรวจ consistency และ workflow สำหรับ idempotent multi-channel delivery, preferences and spam/rate controls |
| GPT | B | GPT-5.4 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ idempotent multi-channel delivery, preferences and spam/rate controls |
| Budget | B | DeepSeek V4 Flash | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ idempotent multi-channel delivery, preferences and spam/rate controls |

## Context Files
Read these before starting:
- `docs/design/01-architecture.md`
- `docs/design/04-api-standard.md`
- `docs/design/06-backlog.md`
- `docs/design/07-security-rules.md`

## Source Traceability
- `T0223–T0226`
- `US-041`

## Phase
Phase 1A — Messaging

## Prerequisites
- Task 09
- Task 36

## Instructions

1. **Notification model/dispatcher**
   - Implement notification records, endpoints/tokens, preferences and template keys.
   - Consume outbox/integration events idempotently.
   - Separate mandatory security/transaction notifications from optional marketing preferences.

2. **Channels**
   - Implement in-app and email adapter baseline.
   - Implement PWA push registration, token refresh and unsubscribe.
   - Leave LINE behind NotificationPort unless an accepted decision enables it.

3. **Abuse controls**
   - Add rate limits for chat, comments, proposal and notification-triggering actions.
   - Prevent notification loops/duplicates and redact sensitive template variables.

## Verify
- Same event ID produces at most one notification per intended channel
- User preference is respected except mandatory notices
- Revoked/invalid push token is cleaned safely
- Rate-limit and template-escaping tests pass

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
