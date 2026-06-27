<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 07: Establish OpenAPI Contract and Client Generation

## 🤖 Recommended Model
> Complexity: **Medium** — versioned REST contract and generated client workflow

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | B | Haiku 4.5 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ versioned REST contract and generated client workflow |
| Gemini | B | Flash 3.5 | mid | เหมาะกับการตรวจ consistency และ workflow สำหรับ versioned REST contract and generated client workflow |
| GPT | B | GPT-5.4 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ versioned REST contract and generated client workflow |
| Budget | B | DeepSeek V4 Flash | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ versioned REST contract and generated client workflow |

## Context Files
Read these before starting:
- `docs/design/04-api-standard.md`
- `docs/design/02-coding-rules.md`
- `docs/design/09-testing-guide.md`
- `docs/design/05-decisions.md`

## Source Traceability
- `T0004`
- `T0032`

## Phase
Phase 0 — Foundation

## Prerequisites
- Task 01
- Task 06

## Instructions

1. **OpenAPI baseline**
   - Create the versioned OpenAPI root for `/api/v1` in `packages/contracts` or approved path.
   - Define common auth, App Check header, request ID, response envelopes, errors and pagination.
   - Add health/readiness sample endpoints without inventing product behavior.

2. **Generation**
   - Configure schema validation and client/type generation for Web/Admin and future Mobile.
   - Ensure generated output is reproducible and either committed or generated in CI according to ADR.
   - Add lint and breaking-change commands.

3. **Documentation**
   - Document how to add an endpoint and how to regenerate clients.
   - Keep provider SDK payloads out of the public contract.

## Verify
- OpenAPI linter passes
- Generated client compiles in a small consuming test
- A deliberate breaking response change is detected by the compatibility check
- No Firestore cursor/type or Firebase UID is exposed

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
