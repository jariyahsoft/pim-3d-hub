<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 06: Create Canonical Types and API Envelopes

## 🤖 Recommended Model
> Complexity: **Medium** — portable UUID, money, time, pagination and response primitives

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | B | Haiku 4.5 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ portable UUID, money, time, pagination and response primitives |
| Gemini | B | Flash 3.5 | mid | เหมาะกับการตรวจ consistency และ workflow สำหรับ portable UUID, money, time, pagination and response primitives |
| GPT | B | GPT-5.4 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ portable UUID, money, time, pagination and response primitives |
| Budget | B | DeepSeek V4 Flash | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ portable UUID, money, time, pagination and response primitives |

## Context Files
Read these before starting:
- `docs/design/02-coding-rules.md`
- `docs/design/03-database-design.md`
- `docs/design/04-api-standard.md`
- `docs/design/10-glossary.md`

## Source Traceability
- `T0030`
- `T0031`

## Phase
Phase 0 — Foundation

## Prerequisites
- Task 03
- Task 04

## Instructions

1. **Canonical primitives**
   - Implement validated UUIDv7 ID, Money minor-unit, Currency, UTC timestamp and dimension value types in `packages/domain` or approved shared package.
   - Keep external serialization DTOs separate from Domain value objects.
   - Add safe constructors/parsers and prevent floating-point money.

2. **API envelope contracts**
   - Create success/error/meta/page schemas in `packages/contracts`.
   - Include requestId, optional nextCursor, stable error code, fields and safe details.
   - Define unknown enum handling and RFC3339 serialization.

3. **Tests and exports**
   - Test invalid IDs, money overflow/negative policy, timestamp parsing and cursor metadata.
   - Export only public package APIs.

## Verify
- Unit tests cover valid and invalid canonical values
- JSON serialization contains no BigInt/runtime-only type
- No Firebase type appears in canonical packages
- Type-check passes across consuming sample package

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
