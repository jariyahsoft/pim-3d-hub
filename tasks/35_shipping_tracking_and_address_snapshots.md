<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 35: Implement Shipping, Tracking, Proof and Address Snapshots

## 🤖 Recommended Model
> Complexity: **Medium** — parcel, pickup and local-delivery lifecycle with provider abstraction

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | B | Haiku 4.5 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ parcel, pickup and local-delivery lifecycle with provider abstraction |
| Gemini | B | Flash 3.5 | mid | เหมาะกับการตรวจ consistency และ workflow สำหรับ parcel, pickup and local-delivery lifecycle with provider abstraction |
| GPT | B | GPT-5.4 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ parcel, pickup and local-delivery lifecycle with provider abstraction |
| Budget | B | DeepSeek V4 Flash | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ parcel, pickup and local-delivery lifecycle with provider abstraction |

## Context Files
Read these before starting:
- `docs/design/03-database-design.md`
- `docs/design/04-api-standard.md`
- `docs/design/06-backlog.md`
- `docs/design/08-ui-guide.md`

## Source Traceability
- `T0200–T0204`
- `US-036`

## Phase
Phase 1A — Shipping

## Prerequisites
- Task 15
- Task 28

## Instructions

1. **Shipping domain**
   - Implement shipment and shipment-event entities with parcel, pickup and local messenger methods.
   - Snapshot shipping/pickup address and contact fields at order time.
   - Define status mapping independent of carrier SDK.

2. **API/adapters**
   - Implement create, dispatch, tracking and proof endpoints.
   - Create a fake carrier adapter and interface for future carrier webhooks.
   - Validate duplicate external events and tracking updates.

3. **UI**
   - Add provider shipping form and buyer tracking timeline.
   - Handle no-tracking pickup/local methods and failed/returned states.

## Verify
- Order address change after shipment creation does not alter shipment snapshot
- Duplicate carrier event does not duplicate timeline entry
- Unauthorized participant cannot read full shipping address
- Parcel, pickup and local-delivery E2E smoke passes

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
