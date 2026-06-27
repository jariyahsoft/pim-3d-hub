<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 02: Create Repository and Monorepo Scaffold

## 🤖 Recommended Model
> Complexity: **Medium** — creating a predictable multi-app repository layout with no business logic

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | B | Haiku 4.5 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ creating a predictable multi-app repository layout with no business logic |
| Gemini | B | Flash 3.5 | mid | เหมาะกับการตรวจ consistency และ workflow สำหรับ creating a predictable multi-app repository layout with no business logic |
| GPT | B | GPT-5.4 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ creating a predictable multi-app repository layout with no business logic |
| Budget | B | DeepSeek V4 Flash | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ creating a predictable multi-app repository layout with no business logic |

## Context Files
Read these before starting:
- `docs/design/01-architecture.md`
- `docs/design/02-coding-rules.md`
- `docs/design/05-decisions.md`
- `docs/design/11-tasks.md`

## Source Traceability
- `T0020`

## Phase
Phase 0 — Foundation

## Prerequisites
- Task 01: Confirm Product and Architecture Decisions

## Instructions

1. **Create directories**
   - Create `apps/web`, `apps/admin`, `services/api`, `services/workers`, and packages for domain, application, contracts, infrastructure, UI, config and testkit.
   - Create `apps/mobile` only as a documented placeholder unless Phase 2 framework was explicitly accepted.
   - Create `firebase`, `infra`, `tools` and test fixture directories.

2. **Initialize workspace**
   - Use the package manager and monorepo tool accepted in Task 01.
   - Create root workspace configuration and minimal package manifests with clear ownership.
   - Add root README commands without claiming unimplemented scripts work.

3. **Add baseline boundaries**
   - Ensure Domain has no dependency on Infrastructure.
   - Create package entry points and placeholder modules only where needed for compilation.
   - Avoid adding a framework or cloud SDK outside the accepted decision.

## Verify
- Workspace dependency graph resolves without circular Domain -> Infrastructure dependency
- Install command succeeds
- Workspace list command shows all expected apps/services/packages
- No application feature or credential is introduced

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
