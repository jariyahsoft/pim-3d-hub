<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 65: Implement Print Farm Partner API, Affiliate, Official Store and Advanced Analytics

## 🤖 Recommended Model
> Complexity: **Very High** — external partner integration, commission attribution and trusted merchant features

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | A | Sonnet 4.6 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ external partner integration, commission attribution and trusted merchant features |
| Gemini | A | Flash 3.5 | high | เหมาะกับการตรวจ consistency และ workflow สำหรับ external partner integration, commission attribution and trusted merchant features |
| GPT | A | GPT-5.5 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ external partner integration, commission attribution and trusted merchant features |
| Budget | A | DeepSeek V4 Pro | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ external partner integration, commission attribution and trusted merchant features |

## Context Files
Read these before starting:
- `docs/design/01-architecture.md`
- `docs/design/04-api-standard.md`
- `docs/design/06-backlog.md`
- `docs/design/07-security-rules.md`

## Source Traceability
- `T0603–T0606`
- `US-131`

## Phase
Phase 2B — Advanced Platform

## Prerequisites
- Task 57
- Task 58
- Task 62

## Instructions

1. **Print farm partner API**
   - Define partner authentication, scoped permissions, capacity/queue sync, order events and revocation.
   - Use idempotent commands/webhooks and never allow direct database access.
   - Add rate limits, audit and sandbox credentials.

2. **Affiliate/official store**
   - Implement versioned attribution and commission records only after commercial rules are approved.
   - Implement Official Store eligibility as verification policy, not a purchasable badge.
   - Prevent self-referral/duplicate attribution according to policy.

3. **Advanced analytics**
   - Create privacy-safe seller/platform metrics and exportable reports.
   - Separate operational truth from analytics projections and document latency.

## Verify
- Partner cannot access resources outside granted organization/scope
- Webhook replay creates one queue/order effect
- Official Store requires approved verification
- Affiliate attribution/commission totals reconcile in fixtures
- Analytics contains no private file content or unnecessary PII

## Open Questions
- Which partner auth method, affiliate window and commission rules are approved?
- What verification criteria define Official Store?

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
