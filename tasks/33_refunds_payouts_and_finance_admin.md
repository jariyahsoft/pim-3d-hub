<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 33: Implement Refunds, Payout Holds and Finance Operations

## 🤖 Recommended Model
> Complexity: **Very High** — high-impact financial controls, partial amounts and dispute-aware payout

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | A | Sonnet 4.6 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ high-impact financial controls, partial amounts and dispute-aware payout |
| Gemini | A | Flash 3.5 | high | เหมาะกับการตรวจ consistency และ workflow สำหรับ high-impact financial controls, partial amounts and dispute-aware payout |
| GPT | A | GPT-5.5 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ high-impact financial controls, partial amounts and dispute-aware payout |
| Budget | A | DeepSeek V4 Pro | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ high-impact financial controls, partial amounts and dispute-aware payout |

## Context Files
Read these before starting:
- `docs/design/03-database-design.md`
- `docs/design/04-api-standard.md`
- `docs/design/06-backlog.md`
- `docs/design/07-security-rules.md`

## Source Traceability
- `T0184`
- `T0185`
- `T0186`
- `US-035`

## Phase
Phase 1A — Payments

## Prerequisites
- Task 16
- Task 32

## Instructions

1. **Refund domain**
   - Implement full/partial refund request and provider execution through PaymentPort.
   - Prevent refund above refundable paid amount and duplicate execution.
   - Record reason, actor, provider reference and status history.

2. **Payout/hold**
   - Implement payable calculation, dispute hold and payout status through a provider-neutral port.
   - Do not assume unlicensed wallet behavior; follow accepted payment decision.
   - Make payout commands idempotent and retry-safe.

3. **Finance admin**
   - Create restricted finance screens/endpoints for reconciliation, refund and payout retry.
   - Mask unnecessary user/payment data and require reason/audit.

4. **Tests**
   - Cover partial refund math, concurrent refund, held payout and provider failure retry.

## Verify
- Total refunds never exceed captured amount
- Disputed/held amount is excluded from payout
- Unauthorized admin/support cannot execute financial action
- Every financial action has immutable audit and reconciliation data

## Open Questions
- Which payout/split-settlement capabilities are available from the selected licensed provider?
- What are the approved refund, cancellation and dispute-release policies?

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
