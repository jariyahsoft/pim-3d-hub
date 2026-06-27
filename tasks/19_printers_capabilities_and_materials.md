<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 19: Implement Printers, Capabilities and Material Catalog

## 🤖 Recommended Model
> Complexity: **Medium** — structured printer capability and material inventory data

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | B | Haiku 4.5 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ structured printer capability and material inventory data |
| Gemini | B | Flash 3.5 | mid | เหมาะกับการตรวจ consistency และ workflow สำหรับ structured printer capability and material inventory data |
| GPT | B | GPT-5.4 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ structured printer capability and material inventory data |
| Budget | B | DeepSeek V4 Flash | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ structured printer capability and material inventory data |

## Context Files
Read these before starting:
- `docs/design/03-database-design.md`
- `docs/design/06-backlog.md`
- `docs/design/04-api-standard.md`
- `docs/design/10-glossary.md`

## Source Traceability
- `T0122`
- `T0123`
- `US-011`

## Phase
Phase 1A — Provider Supply

## Prerequisites
- Task 18

## Instructions

1. **Canonical catalogs**
   - Create seedable technology, material, color and quality codes without hard-coding display translations into Domain.
   - Version seed data and document how catalog additions are reviewed.

2. **Printer model**
   - Implement printer CRUD with build volume in millimeters, quantity, technology and status.
   - Implement printer capability and provider material/color/stock records.
   - Validate positive dimensions and compatible technology/material combinations.

3. **API/UI**
   - Create provider printer/material endpoints and mobile editor/list screens.
   - Show units explicitly and provide empty/error states.

4. **Tests**
   - Cover invalid dimensions, unsupported materials, ownership and soft delete/disable behavior.

## Verify
- Provider can register a printer and supported materials without Firebase-specific fields
- Negative/zero build volume is rejected
- Disabled printer is excluded from active capability queries
- Seed and repository tests pass

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
