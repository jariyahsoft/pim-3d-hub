<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 11: Create Deny-by-Default Rules and Emulator Test Baseline

## 🤖 Recommended Model
> Complexity: **High** — permission-critical Firestore/Storage defenses and emulator verification

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | A | Sonnet 4.6 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ permission-critical Firestore/Storage defenses and emulator verification |
| Gemini | A | Flash 3.5 | high | เหมาะกับการตรวจ consistency และ workflow สำหรับ permission-critical Firestore/Storage defenses and emulator verification |
| GPT | A | GPT-5.5 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ permission-critical Firestore/Storage defenses and emulator verification |
| Budget | A | DeepSeek V4 Pro | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ permission-critical Firestore/Storage defenses and emulator verification |

## Context Files
Read these before starting:
- `docs/design/03-database-design.md`
- `docs/design/07-security-rules.md`
- `docs/design/09-testing-guide.md`
- `docs/design/05-decisions.md`

## Source Traceability
- `T0042`
- `T0043`

## Phase
Phase 0 — Foundation

## Prerequisites
- Task 05
- Task 10

## Instructions

1. **Rules baseline**
   - Create Firestore and Storage rules that deny direct client access to business collections/private objects by default.
   - Allow no convenience exception without a documented ADR and explicit test.
   - Separate public derived content path from private source files.

2. **Emulator setup**
   - Configure Auth, Firestore, Storage and Functions emulators as applicable.
   - Add repeatable seed/cleanup for tests.
   - Ensure emulator environment variables cannot point to production.

3. **Rules tests**
   - Test unauthenticated/authenticated denial for business collections.
   - Test public derived content read and private asset denial according to the baseline.
   - Add CI command.

## Verify
- Rules test command passes
- Authenticated normal user cannot directly read/write an order collection
- Private storage object cannot be read directly
- Public-content read works only in the approved derived-media path

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
