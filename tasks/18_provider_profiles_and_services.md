<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 18: Implement Provider Profiles and Service Types

## 🤖 Recommended Model
> Complexity: **Medium** — provider profile and three service-type CRUD with publish rules

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | B | Haiku 4.5 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ provider profile and three service-type CRUD with publish rules |
| Gemini | B | Flash 3.5 | mid | เหมาะกับการตรวจ consistency และ workflow สำหรับ provider profile and three service-type CRUD with publish rules |
| GPT | B | GPT-5.4 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ provider profile and three service-type CRUD with publish rules |
| Budget | B | DeepSeek V4 Flash | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ provider profile and three service-type CRUD with publish rules |

## Context Files
Read these before starting:
- `docs/design/03-database-design.md`
- `docs/design/06-backlog.md`
- `docs/design/08-ui-guide.md`
- `docs/design/04-api-standard.md`

## Source Traceability
- `T0120`
- `T0121`
- `US-010`

## Phase
Phase 1A — Provider Supply

## Prerequisites
- Task 16
- Task 17

## Instructions

1. **Domain/API**
   - Implement provider profile and provider service entities/repositories/use cases.
   - Support `DESIGN_ONLY`, `PRINT_ONLY` and `DESIGN_AND_PRINT` independently.
   - Add draft, active, paused and suspended lifecycle as approved by contracts.

2. **Publish validation**
   - Require minimum public name, location/service region, service description, lead time and verification prerequisites.
   - Prevent suspended provider or role from activating services.

3. **UI**
   - Create service setup/edit screens with mobile-first forms and clear service explanations.
   - Include empty/error/loading and pause/resume states.

4. **Tests**
   - Cover ownership, service activation, invalid combinations and public DTO privacy.

## Verify
- Provider can activate one or multiple service types
- Unverified/suspended provider behavior matches approved policy
- Public profile response excludes private account/KYC fields
- CRUD and publish validation tests pass

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
