<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 58: Implement Promotion, Subscription and Complete Phase 1C Verification

## 🤖 Recommended Model
> Complexity: **Very High** — paid visibility transparency, entitlement controls and marketplace trust verification

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | A | Sonnet 4.6 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ paid visibility transparency, entitlement controls and marketplace trust verification |
| Gemini | A | Flash 3.5 | high | เหมาะกับการตรวจ consistency และ workflow สำหรับ paid visibility transparency, entitlement controls and marketplace trust verification |
| GPT | A | GPT-5.5 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ paid visibility transparency, entitlement controls and marketplace trust verification |
| Budget | A | DeepSeek V4 Pro | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ paid visibility transparency, entitlement controls and marketplace trust verification |

## Context Files
Read these before starting:
- `docs/design/03-database-design.md`
- `docs/design/06-backlog.md`
- `docs/design/07-security-rules.md`
- `docs/design/08-ui-guide.md`
- `docs/design/09-testing-guide.md`

## Source Traceability
- `T0440–T0445`
- `T0460–T0464`
- `US-090`
- `US-091`

## Phase
Phase 1C — Monetization and Verification

## Prerequisites
- Tasks 53–57

## Instructions

1. **Promotion policy/model**
   - Define approved placement inventory, eligibility, budget/period and labeling rules.
   - Implement campaign/placement lifecycle and block unsafe/suspended targets.
   - Keep sponsored ranking signal separate from organic score and reviews.

2. **Subscription/entitlements**
   - Implement plans and effective-dated entitlements through a billing/provider abstraction.
   - Check entitlements server-side and define downgrade behavior without deleting data.
   - Do not invent final pricing or plan limits; make them configuration after approval.

3. **Metrics**
   - Record privacy-safe impressions, clicks and conversions with deduplication.
   - Do not collect file names, private order details or sensitive free text.

4. **Phase 1C verification**
   - Run content conversion, used-printer purchase, moderation/sponsored labeling, spam/rate and analytics validation E2E.
   - Create readiness report with residual risks and policy gaps.

## Verify
- Every paid placement is visibly labeled
- Sponsored/subscription cannot change verified review or organic quality score
- Entitlement is enforced by backend
- Content/product E2E and abuse tests pass
- Metrics reconcile within documented tolerance without sensitive data

## Open Questions
- What placements, prices, limits and subscription entitlements are approved?
- Which billing provider handles recurring subscription in MVP?

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
