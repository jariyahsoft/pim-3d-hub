<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 49: Implement Instant Quote Eligibility and Pricing Engine

## 🤖 Recommended Model
> Complexity: **Very High** — multi-source eligibility rules, explainable rejection and deterministic pricing

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | A | Sonnet 4.6 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ multi-source eligibility rules, explainable rejection and deterministic pricing |
| Gemini | A | Flash 3.5 | high | เหมาะกับการตรวจ consistency และ workflow สำหรับ multi-source eligibility rules, explainable rejection and deterministic pricing |
| GPT | A | GPT-5.5 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ multi-source eligibility rules, explainable rejection and deterministic pricing |
| Budget | A | DeepSeek V4 Pro | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ multi-source eligibility rules, explainable rejection and deterministic pricing |

## Context Files
Read these before starting:
- `docs/design/03-database-design.md`
- `docs/design/04-api-standard.md`
- `docs/design/06-backlog.md`
- `docs/design/09-testing-guide.md`

## Source Traceability
- `T0343`
- `T0344`
- `US-060`
- `US-062`

## Phase
Phase 1B — Pricing

## Prerequisites
- Task 19
- Task 20
- Task 46
- Task 48

## Instructions

1. **Eligibility engine**
   - Check trusted analysis, build volume, service/printer status, material/color, profile, quantity, capacity, due date and special/manual requirements.
   - Return versioned machine-readable reason codes with human-readable mapping outside Domain.
   - Do not treat analyzer hint alone as final eligibility.

2. **Pricing engine**
   - Calculate line items and total using exact analysis/profile/rule versions.
   - Keep shipping/payment provider estimates behind ports and mark provisional components appropriately.
   - Reject unsupported currency/unit/profile combinations.

3. **API/tests**
   - Implement eligibility and quote-calculation application endpoints before persistence.
   - Add deterministic, boundary and manual-rejection test matrices.

## Verify
- Eligible fixture produces expected reconciled line items
- Each ineligible fixture returns the correct stable reason code
- Changing active profile does not alter calculation when an explicit old version is requested
- No client-supplied total/capability is trusted

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
