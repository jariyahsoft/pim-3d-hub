<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 59: Select Mobile Framework and Establish Mobile API Client

## 🤖 Recommended Model
> Complexity: **High** — Flutter/React Native decision and contract-safe mobile foundation

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | B | Haiku 4.5 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ Flutter/React Native decision and contract-safe mobile foundation |
| Gemini | B | Flash 3.5 | mid | เหมาะกับการตรวจ consistency และ workflow สำหรับ Flutter/React Native decision and contract-safe mobile foundation |
| GPT | B | GPT-5.4 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ Flutter/React Native decision and contract-safe mobile foundation |
| Budget | B | DeepSeek V4 Flash | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ Flutter/React Native decision and contract-safe mobile foundation |

## Context Files
Read these before starting:
- `docs/design/01-architecture.md`
- `docs/design/05-decisions.md`
- `docs/design/04-api-standard.md`
- `docs/design/09-testing-guide.md`

## Source Traceability
- `T0500`
- `T0501`

## Phase
Phase 2A — Mobile Foundation

## Prerequisites
- Task 01
- Task 07
- Task 58

## Instructions

1. **Framework spike/decision**
   - Evaluate Flutter and React Native against background upload, camera/video, push/deep links, secure storage, offline drafts, generated API client and team capability.
   - Implement narrow spikes rather than a full app.
   - Update ADR-014 with evidence and consequences.

2. **Mobile scaffold**
   - Create `apps/mobile` using the accepted framework.
   - Configure environment separation, lint/type checks and test commands.
   - Generate or implement a typed client from OpenAPI; do not access Firestore business data directly.

3. **Baseline navigation**
   - Create app shell/navigation placeholders matching UI guide without implementing all screens.

## Verify
- Framework ADR is Accepted with spike evidence
- Mobile app builds on target development platforms
- Generated client calls a staging health endpoint
- No direct Firestore business collection code exists

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
