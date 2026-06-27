<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 03: Configure Strict TypeScript and Module Boundaries

## 🤖 Recommended Model
> Complexity: **High** — enforcing dependency rules that prevent Firebase and framework leakage

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | B | Haiku 4.5 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ enforcing dependency rules that prevent Firebase and framework leakage |
| Gemini | B | Flash 3.5 | mid | เหมาะกับการตรวจ consistency และ workflow สำหรับ enforcing dependency rules that prevent Firebase and framework leakage |
| GPT | B | GPT-5.4 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ enforcing dependency rules that prevent Firebase and framework leakage |
| Budget | B | DeepSeek V4 Flash | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ enforcing dependency rules that prevent Firebase and framework leakage |

## Context Files
Read these before starting:
- `docs/design/01-architecture.md`
- `docs/design/02-coding-rules.md`
- `docs/design/05-decisions.md`

## Source Traceability
- `T0021`
- `T0022`
- `T0051`

## Phase
Phase 0 — Foundation

## Prerequisites
- Task 02: Create Repository and Monorepo Scaffold

## Instructions

1. **TypeScript configuration**
   - Create shared strict TypeScript base config and package-specific configs.
   - Enable strict null checks, no implicit any, exact optional semantics where compatible, and consistent module resolution.
   - Configure path/package exports without bypassing package boundaries.

2. **Lint and import boundaries**
   - Configure formatter and linter selected in Task 01.
   - Add rules preventing `packages/domain` and `packages/application` from importing Firebase, Google Cloud, HTTP framework or UI packages.
   - Prevent app code from importing private adapter internals.

3. **Boundary verification**
   - Add a deliberate fixture/test that would fail when Firebase SDK is imported into Domain.
   - Document approved dependency direction in root contribution notes or coding rules.

## Verify
- Run the accepted lint command
- Run the accepted type-check command
- Boundary fixture fails before the rule and passes after removing the forbidden import
- `packages/domain` dependency list contains no cloud/framework SDK

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
