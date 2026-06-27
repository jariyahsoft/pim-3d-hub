<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 51: Build Quote Comparison, Checkout and Manual Fallback

## 🤖 Recommended Model
> Complexity: **High** — cross-provider comparison, transparent sponsored results and lossless fallback

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | B | Haiku 4.5 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ cross-provider comparison, transparent sponsored results and lossless fallback |
| Gemini | B | Flash 3.5 | mid | เหมาะกับการตรวจ consistency และ workflow สำหรับ cross-provider comparison, transparent sponsored results and lossless fallback |
| GPT | B | GPT-5.4 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ cross-provider comparison, transparent sponsored results and lossless fallback |
| Budget | B | DeepSeek V4 Flash | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ cross-provider comparison, transparent sponsored results and lossless fallback |

## Context Files
Read these before starting:
- `docs/design/04-api-standard.md`
- `docs/design/06-backlog.md`
- `docs/design/08-ui-guide.md`
- `docs/design/07-security-rules.md`

## Source Traceability
- `T0347`
- `T0348`

## Phase
Phase 1B — Pricing/UI

## Prerequisites
- Task 24
- Task 31
- Task 49
- Task 50

## Instructions

1. **Provider quote results**
   - Create mobile-first quote-result cards with total, breakdown access, time, rating, distance/pickup, capacity and verification.
   - Label promoted providers and keep organic quality/ranking distinct.
   - Support compare selection and empty/capacity-changed states.

2. **Checkout**
   - Display immutable quote summary, expiry, address, delivery and payment handoff.
   - Refresh/recalculate safely when quote expires.
   - Handle pending payment without duplicate order/intent.

3. **Manual fallback**
   - Convert ineligible/failed automatic path into a service request using existing file, options and requirements.
   - Show reason in plain Thai and allow edits.
   - Do not expose internal analyzer/pricing details.

## Verify
- Two or more quotes can be compared on mobile and desktop
- Sponsored label is visible and does not modify verified rating
- Expired/capacity-changed quote has a safe recovery path
- Manual fallback preserves allowed inputs without duplicate upload

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
