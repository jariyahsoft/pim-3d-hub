<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 41: Complete Phase 1A E2E, Security, Recovery and Readiness Review

## 🤖 Recommended Model
> Complexity: **Very High** — release-wide workflow, IDOR, recovery, responsive and operational verification

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | A | Sonnet 4.6 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ release-wide workflow, IDOR, recovery, responsive and operational verification |
| Gemini | A | Flash 3.5 | high | เหมาะกับการตรวจ consistency และ workflow สำหรับ release-wide workflow, IDOR, recovery, responsive and operational verification |
| GPT | A | GPT-5.5 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ release-wide workflow, IDOR, recovery, responsive and operational verification |
| Budget | A | DeepSeek V4 Pro | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ release-wide workflow, IDOR, recovery, responsive and operational verification |

## Context Files
Read these before starting:
- `docs/design/09-testing-guide.md`
- `docs/design/07-security-rules.md`
- `docs/design/08-ui-guide.md`
- `docs/design/11-tasks.md`
- `docs/design/05-decisions.md`

## Source Traceability
- `T0260–T0265`

## Phase
Phase 1A — Verification

## Prerequisites
- Tasks 14–40

## Instructions

1. **Critical E2E**
   - Implement/run manual service order from onboarding to verified review.
   - Include proposal, payment webhook, milestone/production, shipping and completion.
   - Use synthetic data and sandbox providers only.

2. **Security verification**
   - Run webhook replay, IDOR/authorization, sensitive log and staff masking suites.
   - Confirm direct Firestore/Storage business access remains denied.

3. **Recovery/operations**
   - Run backup/export/restore rehearsal and document RPO/RTO observations.
   - Verify alerts, dead-letter inspection and rollback path.

4. **UX/readiness**
   - Run responsive, offline-state and WCAG critical-flow checks.
   - Create a Phase 1A readiness report with pass/fail, residual risk, owner and release blocker.

## Verify
- Manual-order E2E passes in staging
- Payment replay and IDOR suites have zero unexplained failure
- Backup/export/restore produces integrity report
- Critical screens pass mobile/a11y smoke
- Readiness report has no unowned release blocker

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
