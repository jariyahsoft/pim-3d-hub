<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 44: Complete Upload Offline, Retry and Recovery UI

## 🤖 Recommended Model
> Complexity: **Medium** — mobile upload resilience and state recovery

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | B | Haiku 4.5 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ mobile upload resilience and state recovery |
| Gemini | B | Flash 3.5 | mid | เหมาะกับการตรวจ consistency และ workflow สำหรับ mobile upload resilience and state recovery |
| GPT | B | GPT-5.4 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ mobile upload resilience and state recovery |
| Budget | B | DeepSeek V4 Flash | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ mobile upload resilience and state recovery |

## Context Files
Read these before starting:
- `docs/design/08-ui-guide.md`
- `docs/design/02-coding-rules.md`
- `docs/design/06-backlog.md`
- `docs/design/09-testing-guide.md`

## Source Traceability
- `T0306`

## Phase
Phase 1B — Files/UI

## Prerequisites
- Task 42
- Task 43

## Instructions

1. **Upload state machine**
   - Represent idle, preparing, uploading, paused, offline, verifying, scanning, ready, rejected and failed states in the client.
   - Persist only safe resumable session metadata with expiry.
   - Never show completion before server verification.

2. **Recovery UX**
   - Resume after network interruption where supported.
   - Offer retry/new session when expired and preserve request draft.
   - Provide cancel and cleanup behavior.

3. **Accessibility/tests**
   - Announce progress/status changes for assistive technology.
   - Test slow network, offline transition, refresh, expired session and cancellation.

## Verify
- Interrupted upload resumes or gives a clear safe restart path
- Offline UI does not claim server success
- Expired session preserves the surrounding job draft
- Mobile and accessibility tests pass

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
