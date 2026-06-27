<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 62: Implement Mobile Seller Workspace, Quality Review and Store Deployment

## 🤖 Recommended Model
> Complexity: **Very High** — provider production actions, native security/accessibility and release operations

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | A | Sonnet 4.6 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ provider production actions, native security/accessibility and release operations |
| Gemini | A | Flash 3.5 | high | เหมาะกับการตรวจ consistency และ workflow สำหรับ provider production actions, native security/accessibility and release operations |
| GPT | A | GPT-5.5 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ provider production actions, native security/accessibility and release operations |
| Budget | A | DeepSeek V4 Pro | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ provider production actions, native security/accessibility and release operations |

## Context Files
Read these before starting:
- `docs/design/08-ui-guide.md`
- `docs/design/09-testing-guide.md`
- `docs/design/07-security-rules.md`
- `docs/design/11-tasks.md`

## Source Traceability
- `T0508–T0510`

## Phase
Phase 2A — Mobile Release

## Prerequisites
- Task 60
- Task 61

## Instructions

1. **Seller workspace**
   - Implement order queue, confirm/decline, production update with camera, shipment creation and service/printer pause.
   - Use state/version APIs and show conflict recovery.
   - Show earnings summary without unnecessary sensitive finance details.

2. **Mobile quality/security**
   - Run accessibility, permission, secure storage, deep-link, offline, network and performance tests.
   - Review screenshots/logs/analytics for private files and PII.
   - Test low-memory/background termination behavior.

3. **Store deployment**
   - Create signed build/release pipeline, environment configuration and versioning.
   - Prepare privacy disclosures, permissions rationale and rollback/hotfix process.
   - Use internal testing tracks before public release.

## Verify
- Provider can complete an approved production/shipping flow from mobile
- Unauthorized/stale transition is rejected and shown safely
- Mobile security/a11y/performance checklist passes
- Internal store builds install and communicate only with the intended environment

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
