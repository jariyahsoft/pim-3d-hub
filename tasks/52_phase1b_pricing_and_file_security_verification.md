<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 52: Complete Phase 1B Pricing, Concurrency, Queue and File Security Verification

## 🤖 Recommended Model
> Complexity: **Very High** — end-to-end pricing reproducibility, race testing and private-file penetration checks

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | A | Sonnet 4.6 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ end-to-end pricing reproducibility, race testing and private-file penetration checks |
| Gemini | A | Flash 3.5 | high | เหมาะกับการตรวจ consistency และ workflow สำหรับ end-to-end pricing reproducibility, race testing and private-file penetration checks |
| GPT | A | GPT-5.5 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ end-to-end pricing reproducibility, race testing and private-file penetration checks |
| Budget | A | DeepSeek V4 Pro | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ end-to-end pricing reproducibility, race testing and private-file penetration checks |

## Context Files
Read these before starting:
- `docs/design/09-testing-guide.md`
- `docs/design/07-security-rules.md`
- `docs/design/11-tasks.md`
- `docs/design/05-decisions.md`

## Source Traceability
- `T0349`
- `T0360–T0365`

## Phase
Phase 1B — Verification

## Prerequisites
- Tasks 42–51

## Instructions

1. **E2E and reproducibility**
   - Run instant quote E2E and manual fallback E2E.
   - Recalculate historical quote from stored versions and compare every line item.
   - Test order handoff and payment initiation from quote.

2. **Concurrency/load**
   - Run capacity reservation contention and duplicate checkout tests.
   - Test pricing with concurrent profile publish and old version references.

3. **Queue/recovery**
   - Test analyzer retry, dead-letter, replay and temporary object cleanup.
   - Verify no duplicate analysis/notification/quote effect.

4. **Security/readiness**
   - Perform private-file authorization/URL expiry/parser-boundary penetration checks.
   - Create Phase 1B readiness report and update residual risks/ADRs.

## Verify
- Instant and fallback E2E pass
- Historical quote is reproducible exactly
- Capacity load test has zero oversell
- Queue replay has no duplicate business effect
- Private file penetration checks find no unauthorized access

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
