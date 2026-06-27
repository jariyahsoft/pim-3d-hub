<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 47: Build Analysis UI and Complete Corrupt/Oversize/Fuzz Security Tests

## 🤖 Recommended Model
> Complexity: **High** — clear analysis states plus adversarial file validation

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | B | Haiku 4.5 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ clear analysis states plus adversarial file validation |
| Gemini | B | Flash 3.5 | mid | เหมาะกับการตรวจ consistency และ workflow สำหรับ clear analysis states plus adversarial file validation |
| GPT | B | GPT-5.4 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ clear analysis states plus adversarial file validation |
| Budget | B | DeepSeek V4 Flash | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ clear analysis states plus adversarial file validation |

## Context Files
Read these before starting:
- `docs/design/08-ui-guide.md`
- `docs/design/09-testing-guide.md`
- `docs/design/07-security-rules.md`
- `docs/design/06-backlog.md`

## Source Traceability
- `T0325`
- `T0326`

## Phase
Phase 1B — Viewer/Analysis

## Prerequisites
- Task 44
- Task 45
- Task 46

## Instructions

1. **Analysis UI**
   - Create scanning/analyzing/ready/warning/manual-fallback/rejected screens.
   - Display dimensions, unit confirmation and human-readable issues without exposing stack traces.
   - Preserve input when converting to manual request.

2. **Security corpus**
   - Create synthetic fixtures for corrupt, oversized, malformed, resource-heavy and MIME-mismatched files.
   - Fuzz parsers/analyzer boundary within safe CI/runtime limits.
   - Verify quarantine, timeout, cleanup and denial behavior.

3. **Observability**
   - Add safe metrics for analysis duration, outcome, retry and dead-letter count.
   - Ensure filenames/model contents are not sent to analytics.

## Verify
- Every analysis state has component/E2E coverage
- Corrupt/oversized/mismatched files are rejected safely
- Resource-heavy fixture cannot destabilize unrelated jobs
- Manual fallback retains file reference and selections where allowed

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
