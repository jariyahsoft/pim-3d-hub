<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 60: Implement Mobile Authentication and Core Buyer Flows

## 🤖 Recommended Model
> Complexity: **High** — secure identity token handling and reuse of critical marketplace APIs

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | A | Sonnet 4.6 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ secure identity token handling and reuse of critical marketplace APIs |
| Gemini | A | Flash 3.5 | high | เหมาะกับการตรวจ consistency และ workflow สำหรับ secure identity token handling and reuse of critical marketplace APIs |
| GPT | A | GPT-5.5 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ secure identity token handling and reuse of critical marketplace APIs |
| Budget | A | DeepSeek V4 Pro | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ secure identity token handling and reuse of critical marketplace APIs |

## Context Files
Read these before starting:
- `docs/design/04-api-standard.md`
- `docs/design/07-security-rules.md`
- `docs/design/08-ui-guide.md`
- `docs/design/06-backlog.md`

## Source Traceability
- `T0502`
- `T0503`

## Phase
Phase 2A — Mobile

## Prerequisites
- Task 59
- Task 41
- Task 52

## Instructions

1. **Authentication/secure storage**
   - Implement Firebase Auth client integration and secure token/session storage appropriate to the framework.
   - Use backend internal identity mapping; never persist privileged role decisions as truth.
   - Handle logout/revocation/suspended-account response.

2. **Core buyer flows**
   - Implement home/explore, request creation, file/quote status, proposal comparison, checkout handoff and order tracking using existing APIs.
   - Prioritize read/command parity rather than duplicating business logic.

3. **Quality**
   - Add loading, offline, expired/conflict and permission states.
   - Use Thai default, accessibility and responsive phone/tablet behavior.

## Verify
- Mobile user signs in and resolves the same internal account as Web
- Core buyer E2E passes against staging APIs
- No price/permission/state business rule is implemented only on device
- Token revocation/logout and secure-storage tests pass

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
