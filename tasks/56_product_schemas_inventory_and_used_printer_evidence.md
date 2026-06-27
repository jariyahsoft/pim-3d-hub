<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 56: Implement Product Schemas, Variants, Inventory and Used-Printer Evidence

## 🤖 Recommended Model
> Complexity: **High** — category-specific product data, concurrency-safe stock and fraud-reducing evidence

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | B | Haiku 4.5 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ category-specific product data, concurrency-safe stock and fraud-reducing evidence |
| Gemini | B | Flash 3.5 | mid | เหมาะกับการตรวจ consistency และ workflow สำหรับ category-specific product data, concurrency-safe stock and fraud-reducing evidence |
| GPT | B | GPT-5.4 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ category-specific product data, concurrency-safe stock and fraud-reducing evidence |
| Budget | B | DeepSeek V4 Flash | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ category-specific product data, concurrency-safe stock and fraud-reducing evidence |

## Context Files
Read these before starting:
- `docs/design/03-database-design.md`
- `docs/design/06-backlog.md`
- `docs/design/07-security-rules.md`
- `docs/design/08-ui-guide.md`

## Source Traceability
- `T0420`
- `T0421`
- `T0422`
- `US-080`
- `US-081`

## Phase
Phase 1C — Commerce

## Prerequisites
- Task 17
- Task 23
- Task 41

## Instructions

1. **Category schemas**
   - Define versioned schemas for printer, material, part and accessory categories.
   - For printers include condition, build volume, technology, age/usage, maintenance, defects, included items and warranty.
   - Do not expose unreviewed serial/personal data publicly.

2. **Product/inventory domain**
   - Implement product, variant, SKU and inventory with draft/published/suspended lifecycle.
   - Use expectedVersion and reservation-ready stock fields.
   - Validate seller role/KYC and prohibited listing policy.

3. **Used-printer evidence**
   - Implement evidence checklist for power-on, homing, extrusion, test print, known defects and optional masked serial proof.
   - Store media with appropriate public/private classification.

## Verify
- Published product satisfies category schema
- Used printer cannot be marked complete without required approved evidence fields
- Invalid/negative stock and stale update are rejected
- Sensitive serial/contact data is not public

## Open Questions
- Which product categories and required evidence fields are included in the first launch?
- Is serial-number verification handled manually, automatically or not in MVP?

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
