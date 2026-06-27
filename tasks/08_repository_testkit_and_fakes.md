<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 08: Build Repository Contract Testkit and Deterministic Fakes

## 🤖 Recommended Model
> Complexity: **High** — cross-database repository behavior, optimistic concurrency and deterministic tests

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | A | Sonnet 4.6 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ cross-database repository behavior, optimistic concurrency and deterministic tests |
| Gemini | A | Flash 3.5 | high | เหมาะกับการตรวจ consistency และ workflow สำหรับ cross-database repository behavior, optimistic concurrency and deterministic tests |
| GPT | A | GPT-5.5 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ cross-database repository behavior, optimistic concurrency and deterministic tests |
| Budget | A | DeepSeek V4 Pro | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ cross-database repository behavior, optimistic concurrency and deterministic tests |

## Context Files
Read these before starting:
- `docs/design/01-architecture.md`
- `docs/design/03-database-design.md`
- `docs/design/09-testing-guide.md`
- `docs/design/05-decisions.md`

## Source Traceability
- `T0033`
- `T0034`
- `T0035`

## Phase
Phase 0 — Foundation

## Prerequisites
- Task 03
- Task 06

## Instructions

1. **Repository contracts**
   - Define generic repository interfaces with canonical IDs, expectedVersion, soft-delete semantics and stable cursor pagination.
   - Do not include Firestore snapshots, query objects or SDK errors.
   - Create one representative entity repository contract before duplicating patterns.

2. **In-memory implementation**
   - Implement an in-memory adapter that behaves like the intended persistence contract, including version conflicts and deterministic sorting.
   - Create factories, fake clock, UUID generator and domain-event collector.

3. **Reusable contract suite**
   - Write a harness that can run identical tests against in-memory, Firestore and future adapters.
   - Cover create/read/update, filters, cursor, deletion, uniqueness and concurrency.

## Verify
- Contract suite passes for in-memory adapter
- Expected-version mismatch returns the approved conflict
- Pagination remains stable for equal sort values using ID tie-breaker
- Public repository interface imports no infrastructure SDK

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
