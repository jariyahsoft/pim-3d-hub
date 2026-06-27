<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 57: Build Product Search, Detail/Compare, Product Order and Seller Store

## 🤖 Recommended Model
> Complexity: **High** — inventory reservation, product snapshots and end-to-end seller commerce

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | A | Sonnet 4.6 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ inventory reservation, product snapshots and end-to-end seller commerce |
| Gemini | A | Flash 3.5 | high | เหมาะกับการตรวจ consistency และ workflow สำหรับ inventory reservation, product snapshots and end-to-end seller commerce |
| GPT | A | GPT-5.5 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ inventory reservation, product snapshots and end-to-end seller commerce |
| Budget | A | DeepSeek V4 Pro | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ inventory reservation, product snapshots and end-to-end seller commerce |

## Context Files
Read these before starting:
- `docs/design/01-architecture.md`
- `docs/design/03-database-design.md`
- `docs/design/04-api-standard.md`
- `docs/design/08-ui-guide.md`

## Source Traceability
- `T0423–T0426`
- `US-082`

## Phase
Phase 1C — Commerce

## Prerequisites
- Task 31
- Task 35
- Task 56

## Instructions

1. **Search/detail/compare**
   - Implement product search filters by category, condition, price, region and key printer specs.
   - Create product detail and compare UI with evidence and seller verification.
   - Use SearchPort/read models and cursor pagination.

2. **Inventory reservation/order**
   - Implement concurrency-safe inventory reserve/release and product order snapshot.
   - Reuse payment/shipping ports without coupling service-order internals.
   - Handle payment failure/expiry release idempotently.

3. **Seller store**
   - Create seller listing/order dashboard with stock and fulfillment actions.
   - Mask buyer data until needed for fulfillment.

4. **Tests**
   - Run concurrent last-item purchase and retry tests.

## Verify
- Two buyers cannot purchase one remaining item
- Product/order snapshot survives later listing edits
- Expired/failed payment releases stock exactly once
- Search/detail/order/seller E2E passes

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
