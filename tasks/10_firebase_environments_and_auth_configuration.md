<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 10: Configure Firebase Environments and Authentication Providers

## 🤖 Recommended Model
> Complexity: **Medium** — environment isolation and identity-provider setup

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | B | Haiku 4.5 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ environment isolation and identity-provider setup |
| Gemini | B | Flash 3.5 | mid | เหมาะกับการตรวจ consistency และ workflow สำหรับ environment isolation and identity-provider setup |
| GPT | B | GPT-5.4 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ environment isolation and identity-provider setup |
| Budget | B | DeepSeek V4 Flash | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ environment isolation and identity-provider setup |

## Context Files
Read these before starting:
- `docs/design/01-architecture.md`
- `docs/design/05-decisions.md`
- `docs/design/07-security-rules.md`
- `docs/design/11-tasks.md`

## Source Traceability
- `T0040`
- `T0041`

## Phase
Phase 0 — Foundation

## Prerequisites
- Task 01
- Task 04

## Instructions

1. **Environment isolation**
   - Create local/development/staging/production Firebase configuration references without committing secrets.
   - Document project IDs, deployment aliases and ownership using placeholders where accounts are unavailable.
   - Ensure local emulator config cannot target production accidentally.

2. **Authentication setup**
   - Configure only authentication methods accepted in Task 01.
   - Document authorized domains, redirect URLs and local emulator usage.
   - Create a minimal identity-adapter configuration contract; do not implement user mapping yet.

3. **Operational guardrails**
   - Add runtime checks preventing development credentials in production.
   - Document key/credential rotation ownership.

## Verify
- Local Auth emulator starts and accepts the configured test flow
- Staging/production aliases cannot be confused by default scripts
- No service-account key is committed
- Auth configuration documentation matches `.env.example`

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
