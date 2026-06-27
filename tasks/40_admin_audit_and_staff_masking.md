<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 40: Build Admin Operations, Audit Log and Staff Data Masking

## 🤖 Recommended Model
> Complexity: **Very High** — least-privilege operational tooling and insider-risk controls

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | A | Sonnet 4.6 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ least-privilege operational tooling and insider-risk controls |
| Gemini | A | Flash 3.5 | high | เหมาะกับการตรวจ consistency และ workflow สำหรับ least-privilege operational tooling and insider-risk controls |
| GPT | A | GPT-5.5 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ least-privilege operational tooling and insider-risk controls |
| Budget | A | DeepSeek V4 Pro | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ least-privilege operational tooling and insider-risk controls |

## Context Files
Read these before starting:
- `docs/design/06-backlog.md`
- `docs/design/07-security-rules.md`
- `docs/design/03-database-design.md`
- `docs/design/08-ui-guide.md`

## Source Traceability
- `T0244`
- `T0245`
- `US-100`

## Phase
Phase 1A — Admin

## Prerequisites
- Task 09
- Task 16
- Task 17
- Task 39

## Instructions

1. **Admin shell/queries**
   - Create separate admin portal route/app with role-gated navigation for KYC, users, orders, disputes, moderation, finance and audit.
   - Use purpose-specific DTOs and mask fields by staff permission.
   - Do not provide routine raw database editing.

2. **Audit log**
   - Implement append-only audit repository/use case with actor, action, resource, reason, request/trace, outcome and safe diff.
   - Protect audit read access and prevent normal mutation/deletion.

3. **High-risk actions**
   - Require reason/confirmation for suspension, admin transition, moderation and financial escalation.
   - Implement break-glass placeholder/policy only if accepted.

4. **Tests**
   - Add staff role separation, masking and audit completeness tests.

## Verify
- Support cannot view full KYC/finance data
- Every high-risk admin action creates an audit event
- Audit log cannot be edited through normal application API
- Admin UI permission-denied and masked-data tests pass

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
