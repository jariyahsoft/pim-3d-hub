<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 05: Create CI, Quality Hooks and Security Scanning

## 🤖 Recommended Model
> Complexity: **High** — CI/CD quality gates, dependency scanning and secret prevention

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | B | Haiku 4.5 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ CI/CD quality gates, dependency scanning and secret prevention |
| Gemini | B | Flash 3.5 | mid | เหมาะกับการตรวจ consistency และ workflow สำหรับ CI/CD quality gates, dependency scanning and secret prevention |
| GPT | B | GPT-5.4 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ CI/CD quality gates, dependency scanning and secret prevention |
| Budget | B | DeepSeek V4 Flash | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ CI/CD quality gates, dependency scanning and secret prevention |

## Context Files
Read these before starting:
- `docs/design/02-coding-rules.md`
- `docs/design/07-security-rules.md`
- `docs/design/09-testing-guide.md`
- `docs/design/11-tasks.md`

## Source Traceability
- `T0025`
- `T0027`
- `T0028`
- `T0050`

## Phase
Phase 0 — Foundation

## Prerequisites
- Task 03
- Task 04

## Instructions

1. **CI workflow**
   - Create pull-request CI for install, formatting/lint, type-check, unit tests and build.
   - Add placeholders or conditional jobs for emulator, OpenAPI and contract tests that become active as those tasks land.
   - Use cache keys that include lockfile and runtime version.

2. **Security gates**
   - Add dependency vulnerability, SAST or equivalent static analysis and secret scanning.
   - Fail CI for committed credentials and configured critical/high findings according to policy.
   - Avoid exposing secret values in CI logs.

3. **Developer hooks**
   - Add lightweight local hooks for formatting/linting without duplicating full CI.
   - Document bypass policy for emergencies and require CI to remain authoritative.

## Verify
- Open a test branch/PR or run CI locally to demonstrate every configured job executes
- Commit a fake secret fixture in a non-committed test area and confirm scanner detection
- A failing unit test makes CI fail
- CI logs contain no environment secret values

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
