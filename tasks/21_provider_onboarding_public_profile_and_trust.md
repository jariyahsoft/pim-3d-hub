<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 21: Build Provider Onboarding, Public Profile and Trust Projection

## 🤖 Recommended Model
> Complexity: **Medium** — multi-step provider UX and rebuildable public trust cards

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | B | Haiku 4.5 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ multi-step provider UX and rebuildable public trust cards |
| Gemini | B | Flash 3.5 | mid | เหมาะกับการตรวจ consistency และ workflow สำหรับ multi-step provider UX and rebuildable public trust cards |
| GPT | B | GPT-5.4 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ multi-step provider UX and rebuildable public trust cards |
| Budget | B | DeepSeek V4 Flash | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ multi-step provider UX and rebuildable public trust cards |

## Context Files
Read these before starting:
- `docs/design/06-backlog.md`
- `docs/design/08-ui-guide.md`
- `docs/design/03-database-design.md`
- `docs/design/07-security-rules.md`

## Source Traceability
- `T0124`
- `T0125`
- `T0126`
- `US-013`

## Phase
Phase 1A — Provider Supply

## Prerequisites
- Tasks 17–20

## Instructions

1. **Onboarding flow**
   - Create a progressive provider onboarding flow for profile, service, printer/material and verification status.
   - Allow drafts and show readiness checklist.
   - Do not require printer setup for design-only providers.

2. **Public profile/card**
   - Implement public provider profile/card DTO and responsive UI.
   - Include service types, region, lead time, approved badge and portfolio placeholders.
   - Exclude private contact/KYC/capacity reservation details.

3. **Trust projection**
   - Create a rebuildable read model for completed jobs, on-time rate and rating summary.
   - Communicate low sample size and separate sponsored status.

## Verify
- Design-only provider can publish without a printer
- Print provider cannot publish instant-capable service without required capability data
- Public response has no private fields
- Trust projection rebuild produces deterministic summary

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
