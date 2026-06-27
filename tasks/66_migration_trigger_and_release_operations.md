<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 66: Evaluate Database Migration Triggers and Finalize Release Operations

## 🤖 Recommended Model
> Complexity: **Very High** — production migration readiness, dual-write/shadow-read criteria and reversible release controls

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | A | Sonnet 4.6 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ production migration readiness, dual-write/shadow-read criteria and reversible release controls |
| Gemini | A | Flash 3.5 | high | เหมาะกับการตรวจ consistency และ workflow สำหรับ production migration readiness, dual-write/shadow-read criteria and reversible release controls |
| GPT | A | GPT-5.5 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ production migration readiness, dual-write/shadow-read criteria and reversible release controls |
| Budget | A | DeepSeek V4 Pro | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ production migration readiness, dual-write/shadow-read criteria and reversible release controls |

## Context Files
Read these before starting:
- `docs/design/01-architecture.md`
- `docs/design/03-database-design.md`
- `docs/design/05-decisions.md`
- `docs/design/09-testing-guide.md`
- `docs/design/11-tasks.md`

## Source Traceability
- `T0607`
- `Deployment checklist`

## Phase
Phase 2B — Portability and Operations

## Prerequisites
- Task 13
- Task 41
- Task 52
- Task 58
- Task 62
- Task 65

## Instructions

1. **Migration trigger assessment**
   - Measure Firestore cost, query constraints, transaction limits, analytics/reporting needs and operational risk against documented thresholds.
   - Decide whether to remain, prepare or execute a PostgreSQL/MongoDB migration; this task does not authorize irreversible production cutover by itself.
   - Record decision in ADR with evidence.

2. **Migration rehearsal**
   - Run full portable export, target import, integrity checks, repository contract tests and representative read/write benchmarks.
   - Design dual-write, reconciliation, shadow-read, cutover and rollback plan.
   - Define freeze/consistency strategy for a future cutover.

3. **Release operations**
   - Finalize index/rules review, backup/export, CI/security gates, feature flags, rollback, alerts, support/moderation runbooks, privacy/terms versioning, smoke tests and release notes.
   - Assign owners and evidence links for every release checklist item.

## Verify
- Migration ADR states evidence-based remain/prepare/execute decision
- Target rehearsal passes counts, checksums, references, money, timestamps and contract tests
- Dual-write/shadow-read/cutover/rollback plan is executable and reversible
- Every deployment checklist item has pass/fail evidence and owner
- No production migration occurs without a separate approved execution task

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
