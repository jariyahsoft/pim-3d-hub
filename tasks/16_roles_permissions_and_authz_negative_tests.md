<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 16: Implement Roles, Permissions and Authorization Policies

## 🤖 Recommended Model
> Complexity: **Very High** — permission matrix, organization scope and IDOR prevention

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | A | Sonnet 4.6 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ permission matrix, organization scope and IDOR prevention |
| Gemini | A | Flash 3.5 | high | เหมาะกับการตรวจ consistency และ workflow สำหรับ permission matrix, organization scope and IDOR prevention |
| GPT | A | GPT-5.5 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ permission matrix, organization scope and IDOR prevention |
| Budget | A | DeepSeek V4 Pro | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ permission matrix, organization scope and IDOR prevention |

## Context Files
Read these before starting:
- `docs/design/06-backlog.md`
- `docs/design/07-security-rules.md`
- `docs/design/03-database-design.md`
- `docs/design/04-api-standard.md`
- `docs/design/10-glossary.md`

## Source Traceability
- `T0104`
- `T0107`
- `US-003`

## Phase
Phase 1A — Identity and Security

## Prerequisites
- Task 14
- Task 15

## Instructions

1. **Permission model**
   - Create permission codes and role-to-permission mapping using the glossary naming convention.
   - Support self, participant, provider and organization scopes.
   - Treat client role display as non-authoritative.

2. **Policy layer**
   - Implement reusable authorization policies in Application, not controllers or Firestore rules.
   - Provide explicit deny reasons safe for logs but avoid leaking concealed resource details.
   - Require reason/audit metadata for privileged staff operations.

3. **Role activation**
   - Implement role request/activation states and KYC prerequisites without auto-approving verification-required roles.
   - Audit every role/permission change.

4. **Negative tests**
   - Create table-driven tests for role/resource/action combinations and IDOR cases.
   - Cover cross-organization isolation and suspended roles.

## Verify
- Permission matrix tests cover every defined role and critical resource
- Buyer cannot access another buyer's order/profile private data
- Provider scope does not cross organizations
- Admin/finance/KYC actions require the correct distinct permission and audit reason

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
