<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 13: Verify Foundation Contracts and Database Portability

## 🤖 Recommended Model
> Complexity: **Very High** — cross-adapter behavioral equivalence and early migration-risk detection

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | A | Sonnet 4.6 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ cross-adapter behavioral equivalence and early migration-risk detection |
| Gemini | A | Flash 3.5 | high | เหมาะกับการตรวจ consistency และ workflow สำหรับ cross-adapter behavioral equivalence and early migration-risk detection |
| GPT | A | GPT-5.5 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ cross-adapter behavioral equivalence and early migration-risk detection |
| Budget | A | DeepSeek V4 Pro | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ cross-adapter behavioral equivalence and early migration-risk detection |

## Context Files
Read these before starting:
- `docs/design/01-architecture.md`
- `docs/design/03-database-design.md`
- `docs/design/05-decisions.md`
- `docs/design/09-testing-guide.md`
- `docs/design/11-tasks.md`

## Source Traceability
- `T0050–T0054`

## Phase
Phase 0 — Foundation verification

## Prerequisites
- Tasks 02–12

## Instructions

1. **Foundation quality gate**
   - Run all lint, type-check, build, unit, OpenAPI, rules and repository contract commands.
   - Verify Domain/Application package dependency graph excludes cloud SDKs.
   - Record failures as blockers rather than weakening gates.

2. **Firestore contract adapter**
   - Implement the smallest Firestore repository adapter needed for the representative contract entity.
   - Run the same contract suite used by in-memory adapter.
   - Test timestamp, money, null, soft-delete and version mapping.

3. **Portability rehearsal**
   - Export representative records to canonical JSONL.
   - Import the sample into local PostgreSQL and MongoDB test schemas/collections.
   - Compare record counts, IDs, money, timestamps and references.

4. **Review and sign-off**
   - Create a short architecture/security verification report.
   - Update ADR/open risks if portability assumptions fail.

## Verify
- All foundation CI gates pass
- In-memory and Firestore contract suites produce equivalent outcomes
- PostgreSQL and MongoDB sample import integrity report has zero unexplained mismatch
- Architecture/security report documents residual risks and owners

## Open Questions
- Is local PostgreSQL/MongoDB via containers acceptable for CI portability rehearsals?
- Which representative entity best exercises filtering, concurrency and soft delete without adding feature scope?

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
