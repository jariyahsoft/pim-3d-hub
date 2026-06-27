<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 61: Implement Mobile Push, Deep Links, Camera, Background Upload and Offline Drafts

## 🤖 Recommended Model
> Complexity: **High** — native device integrations, reliable uploads and conflict-safe offline state

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | A | Sonnet 4.6 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ native device integrations, reliable uploads and conflict-safe offline state |
| Gemini | A | Flash 3.5 | high | เหมาะกับการตรวจ consistency และ workflow สำหรับ native device integrations, reliable uploads and conflict-safe offline state |
| GPT | A | GPT-5.5 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ native device integrations, reliable uploads and conflict-safe offline state |
| Budget | A | DeepSeek V4 Pro | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ native device integrations, reliable uploads and conflict-safe offline state |

## Context Files
Read these before starting:
- `docs/design/01-architecture.md`
- `docs/design/07-security-rules.md`
- `docs/design/08-ui-guide.md`
- `docs/design/09-testing-guide.md`

## Source Traceability
- `T0504–T0507`

## Phase
Phase 2A — Mobile

## Prerequisites
- Task 44
- Task 59
- Task 60

## Instructions

1. **Push/deep links**
   - Register notification endpoint/token and route approved notification types to the correct order/post/product screen.
   - Validate deep-link authorization after opening; never trust link data alone.
   - Handle invalid/revoked tokens.

2. **Camera/media and background upload**
   - Implement camera/gallery selection with permission handling, compression policy and upload-session APIs.
   - Support background/interrupted upload within platform limits.
   - Do not write source media to public storage automatically.

3. **Offline drafts/conflicts**
   - Store schema-versioned encrypted/safe drafts with expiry.
   - Sync through API and handle expectedVersion conflicts with refresh/compare rather than overwrite.
   - Disable unsafe payment/state transitions offline.

## Verify
- Push opens the intended authorized context
- Background upload resumes or fails with recoverable state
- Denied camera permission has a usable fallback
- Offline draft sync does not overwrite newer server data

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
