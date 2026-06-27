<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 34: Perform Payment and Financial Security Review

## 🤖 Recommended Model
> Complexity: **Very High** — financial threat modeling, webhook abuse and sensitive-data controls

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | A | Sonnet 4.6 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ financial threat modeling, webhook abuse and sensitive-data controls |
| Gemini | A | Flash 3.5 | high | เหมาะกับการตรวจ consistency และ workflow สำหรับ financial threat modeling, webhook abuse and sensitive-data controls |
| GPT | A | GPT-5.5 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ financial threat modeling, webhook abuse and sensitive-data controls |
| Budget | A | DeepSeek V4 Pro | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ financial threat modeling, webhook abuse and sensitive-data controls |

## Context Files
Read these before starting:
- `docs/design/07-security-rules.md`
- `docs/design/09-testing-guide.md`
- `docs/design/04-api-standard.md`
- `docs/design/05-decisions.md`

## Source Traceability
- `T0187`
- `T0261 partial`

## Phase
Phase 1A — Payments verification

## Prerequisites
- Tasks 31–33

## Instructions

1. **Threat review**
   - Review payment intent, webhook, refund, payout, reconciliation and admin paths against the documented threat model.
   - Confirm no PAN/CVV, private key, raw secret or unsafe provider payload is stored/logged.
   - Review service IAM and webhook endpoint rate/abuse controls.

2. **Adversarial tests**
   - Execute replay, forged signature, duplicate refund, amount mismatch, out-of-order event and payout-during-dispute tests.
   - Verify alerts and audit records.

3. **Remediation/report**
   - Fix implementation issues within scope.
   - Create a concise security review report with residual risks, owner and release blocker status.
   - Update ADR/security rules when provider constraints differ.

## Verify
- All payment security test cases pass
- No sensitive payment data appears in logs or persisted public records
- Residual high-risk issue is either fixed or marked release blocker
- Review report is linked from readiness documentation

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
