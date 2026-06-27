<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 17: Implement KYC Baseline and Organization Membership

## 🤖 Recommended Model
> Complexity: **Very High** — sensitive verification workflow, least privilege and business membership lifecycle

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | A | Sonnet 4.6 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ sensitive verification workflow, least privilege and business membership lifecycle |
| Gemini | A | Flash 3.5 | high | เหมาะกับการตรวจ consistency และ workflow สำหรับ sensitive verification workflow, least privilege and business membership lifecycle |
| GPT | A | GPT-5.5 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ sensitive verification workflow, least privilege and business membership lifecycle |
| Budget | A | DeepSeek V4 Pro | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ sensitive verification workflow, least privilege and business membership lifecycle |

## Context Files
Read these before starting:
- `docs/design/03-database-design.md`
- `docs/design/06-backlog.md`
- `docs/design/07-security-rules.md`
- `docs/design/04-api-standard.md`

## Source Traceability
- `T0105`
- `T0106`
- `US-004`
- `US-005`

## Phase
Phase 1A — Identity and Trust

## Prerequisites
- Task 16

## Instructions

1. **KYC workflow**
   - Implement verification case statuses, submission, reviewer decision and `NEEDS_MORE_INFO` resubmission.
   - Store documents as private purpose-bound assets or vendor references according to the accepted decision.
   - Mask sensitive metadata and audit all staff access/decisions.

2. **Organization membership**
   - Implement organization creation, invitation, acceptance, role assignment, suspension and revocation.
   - Separate finance from operational permissions.
   - Use internal UUIDs and optimistic concurrency.

3. **UI**
   - Create mobile KYC status/submission screens and basic organization member management.
   - Explain purpose, privacy and retention without inventing legal terms.

4. **Tests**
   - Cover unauthorized KYC access, reviewer separation, invitation replay and revoked membership.

## Verify
- KYC document cannot be accessed by normal support or unrelated users
- Reviewer decision creates audit record with reason
- Revoked member loses scoped access immediately
- No sensitive KYC payload appears in logs or public profile

## Open Questions
- Which KYC vendor/manual review fields and retention periods are approved?
- Which organization types and member roles are required for MVP?

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
