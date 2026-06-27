<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 04: Implement Typed Configuration, Environment Validation and Root Scripts

## 🤖 Recommended Model
> Complexity: **Medium** — configuration plumbing and repeatable developer commands

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | B | Haiku 4.5 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ configuration plumbing and repeatable developer commands |
| Gemini | B | Flash 3.5 | mid | เหมาะกับการตรวจ consistency และ workflow สำหรับ configuration plumbing and repeatable developer commands |
| GPT | B | GPT-5.4 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ configuration plumbing and repeatable developer commands |
| Budget | B | DeepSeek V4 Flash | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ configuration plumbing and repeatable developer commands |

## Context Files
Read these before starting:
- `README.md`
- `docs/design/02-coding-rules.md`
- `docs/design/11-tasks.md`

## Source Traceability
- `T0023`
- `T0024`
- `T0026`

## Phase
Phase 0 — Foundation

## Prerequisites
- Task 02
- Task 03

## Instructions

1. **Typed configuration**
   - Create a config package that validates environment variables at process startup.
   - Separate public client configuration from server secrets.
   - Expose typed config objects to modules; prohibit scattered direct environment reads.

2. **Environment examples**
   - Create `.env.example` with placeholders only.
   - Document local, development, staging and production separation.
   - Include Firebase, storage, payment, search, scan, logging and feature-flag placeholders only when applicable.

3. **Root scripts**
   - Add root scripts for dev, build, lint, typecheck, unit tests, integration tests, contract tests and emulators.
   - Scripts may delegate to workspace tasks but must fail correctly when one package fails.
   - Update README with actual commands.

## Verify
- Starting API/workers with a required variable missing fails with a clear validation message
- No real credential exists in tracked files
- Root lint/typecheck/test/build scripts invoke expected workspaces
- `.env.example` and README stay consistent

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
