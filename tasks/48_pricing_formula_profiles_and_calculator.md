<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 48: Define Pricing Formula and Implement Versioned Pricing Profiles

## 🤖 Recommended Model
> Complexity: **Very High** — auditable money formula, rounding and provider configuration

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | A | Sonnet 4.6 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ auditable money formula, rounding and provider configuration |
| Gemini | A | Flash 3.5 | high | เหมาะกับการตรวจ consistency และ workflow สำหรับ auditable money formula, rounding and provider configuration |
| GPT | A | GPT-5.5 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ auditable money formula, rounding and provider configuration |
| Budget | A | DeepSeek V4 Pro | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ auditable money formula, rounding and provider configuration |

## Context Files
Read these before starting:
- `docs/design/03-database-design.md`
- `docs/design/05-decisions.md`
- `docs/design/06-backlog.md`
- `docs/design/02-coding-rules.md`

## Source Traceability
- `T0340–T0342`
- `US-061`

## Phase
Phase 1B — Pricing

## Prerequisites
- Task 01
- Task 06
- Task 19
- Task 46

## Instructions

1. **Formula decision**
   - Define units and rounding for minimum order, material, machine time, setup, support, labor, risk, rush, quantity, fee, shipping and tax placeholders.
   - Use basis points/integer arithmetic and document precedence.
   - Record unresolved business rates as configurable fields, not invented defaults.

2. **Pricing profile domain**
   - Implement profile scope, draft/active/retired status, versionNo and effective period.
   - Publishing creates a new immutable version; old quotes remain reproducible.
   - Validate rates, units, currency and incompatible scope.

3. **Provider calculator UI**
   - Create profile editor and test calculator showing line-item result.
   - Clearly label draft vs active and effective date.

4. **Tests**
   - Add table/property tests for rounding, zero/large quantity, discount and negative/overflow prevention.

## Verify
- Same profile/version/input produces same integer result
- Publishing a profile never changes an old quote calculation
- Invalid/negative/overflow values are rejected
- Provider calculator matches server pricing engine fixture

## Open Questions
- Which platform fee, tax and rush/quantity rules are approved for MVP?
- Is machine rate stored per minute or another canonical unit?

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
