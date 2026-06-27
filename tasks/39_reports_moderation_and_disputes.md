<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 39: Implement Reports, Moderation Cases and Dispute Holds

## 🤖 Recommended Model
> Complexity: **Very High** — evidence-preserving abuse and dispute workflows with financial side effects

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | A | Sonnet 4.6 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ evidence-preserving abuse and dispute workflows with financial side effects |
| Gemini | A | Flash 3.5 | high | เหมาะกับการตรวจ consistency และ workflow สำหรับ evidence-preserving abuse and dispute workflows with financial side effects |
| GPT | A | GPT-5.5 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ evidence-preserving abuse and dispute workflows with financial side effects |
| Budget | A | DeepSeek V4 Pro | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ evidence-preserving abuse and dispute workflows with financial side effects |

## Context Files
Read these before starting:
- `docs/design/03-database-design.md`
- `docs/design/04-api-standard.md`
- `docs/design/06-backlog.md`
- `docs/design/07-security-rules.md`

## Source Traceability
- `T0242`
- `T0243`
- `US-101`
- `US-102`

## Phase
Phase 1A — Trust/Admin

## Prerequisites
- Task 16
- Task 33
- Task 35
- Task 38

## Instructions

1. **Reports/moderation**
   - Implement report creation, target validation, moderation case assignment, action, duration and reason.
   - Preserve evidence/history and support hidden/removed/suspended states.
   - Sponsored content receives no exemption.

2. **Dispute workflow**
   - Implement dispute opening, category, requested resolution, evidence and timeline.
   - Apply payout hold and restrict duplicate/late disputes according to approved policy.
   - Implement constrained decision types that trigger refund/reprint/partial resolution commands.

3. **UI/notifications**
   - Create buyer dispute submission and staff case workspace.
   - Use neutral language and show deadlines/status.
   - Notify parties idempotently.

## Verify
- Opening a dispute creates/updates payout hold exactly once
- Moderator cannot execute finance action without finance permission/workflow
- Evidence remains available and immutable to authorized case staff
- Report/dispute access and deadline tests pass

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
