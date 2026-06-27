<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 24: Implement Job Discovery and Provider Eligibility Filters

## 🤖 Recommended Model
> Complexity: **Medium** — indexed job listing, filtering and privacy-aware discovery

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | B | Haiku 4.5 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ indexed job listing, filtering and privacy-aware discovery |
| Gemini | B | Flash 3.5 | mid | เหมาะกับการตรวจ consistency และ workflow สำหรับ indexed job listing, filtering and privacy-aware discovery |
| GPT | B | GPT-5.4 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ indexed job listing, filtering and privacy-aware discovery |
| Budget | B | DeepSeek V4 Flash | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ indexed job listing, filtering and privacy-aware discovery |

## Context Files
Read these before starting:
- `docs/design/01-architecture.md`
- `docs/design/03-database-design.md`
- `docs/design/04-api-standard.md`
- `docs/design/06-backlog.md`

## Source Traceability
- `T0142`
- `US-021`

## Phase
Phase 1A — Jobs

## Prerequisites
- Task 18
- Task 19
- Task 22
- Task 23

## Instructions

1. **Query/read model**
   - Implement a provider-facing job discovery query or read model with cursor pagination.
   - Filter by service type, region, capability/category, due date and status.
   - Map queries to source-controlled indexes/search adapter.

2. **Eligibility/privacy**
   - Exclude private/invite-only requests unless access is granted.
   - Exclude closed/expired requests and inactive providers.
   - Do not reveal private file metadata before grant.

3. **UI**
   - Create job-board list/filter/detail summary with loading, empty and error states.
   - Use mobile filters and preserve filter state.

## Verify
- Eligible provider finds matching published job
- Unrelated provider cannot discover invite-only job
- Cursor pagination has no duplicate/missing item under stable data
- Required index/query tests pass

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
