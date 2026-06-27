<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 64: Implement Explainable Smart Matching and Guarded Dynamic Pricing Experiments

## 🤖 Recommended Model
> Complexity: **Very High** — ranking quality, fairness, capacity signals and price-governance controls

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | A | Sonnet 4.6 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ ranking quality, fairness, capacity signals and price-governance controls |
| Gemini | A | Flash 3.5 | high | เหมาะกับการตรวจ consistency และ workflow สำหรับ ranking quality, fairness, capacity signals and price-governance controls |
| GPT | A | GPT-5.5 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ ranking quality, fairness, capacity signals and price-governance controls |
| Budget | A | DeepSeek V4 Pro | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ ranking quality, fairness, capacity signals and price-governance controls |

## Context Files
Read these before starting:
- `docs/design/01-architecture.md`
- `docs/design/03-database-design.md`
- `docs/design/06-backlog.md`
- `docs/design/07-security-rules.md`

## Source Traceability
- `T0601`
- `T0602`
- `US-130 partial`

## Phase
Phase 2B — Advanced Platform

## Prerequisites
- Task 50
- Task 58
- Task 63

## Instructions

1. **Smart matching**
   - Define explainable features from compatibility, location, capacity, delivery, quality and buyer preferences.
   - Keep paid placement as a separate labeled signal.
   - Implement feature/ranking version and offline evaluation fixtures.

2. **Dynamic pricing experiment**
   - Implement only behind feature flags and accepted business rules.
   - Bound adjustments, preserve base/profile calculation, snapshot experiment/version and provide manual fallback.
   - Prevent discriminatory or opaque use of sensitive attributes.

3. **Evaluation/monitoring**
   - Measure relevance, conversion, cancellation, provider concentration and fairness indicators.
   - Create rollback/disable path and audit experiment changes.

## Verify
- Match result includes stable explanation/reason fields
- Sponsored placement remains visibly separate
- Dynamic adjustment cannot exceed configured bounds
- Feature flag disables experiment without changing historical quotes
- Offline evaluation and rollback test pass

## Open Questions
- Which ranking/business fairness metrics and dynamic pricing limits are approved?
- Is dynamic pricing in scope for production or experiment-only?

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
