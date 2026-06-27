<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 29: Implement Order Milestones, Change Requests and Production Updates

## 🤖 Recommended Model
> Complexity: **High** — design approval, scope changes and evidence-rich production workflow

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | A | Sonnet 4.6 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ design approval, scope changes and evidence-rich production workflow |
| Gemini | A | Flash 3.5 | high | เหมาะกับการตรวจ consistency และ workflow สำหรับ design approval, scope changes and evidence-rich production workflow |
| GPT | A | GPT-5.5 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ design approval, scope changes and evidence-rich production workflow |
| Budget | A | DeepSeek V4 Pro | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ design approval, scope changes and evidence-rich production workflow |

## Context Files
Read these before starting:
- `docs/design/03-database-design.md`
- `docs/design/04-api-standard.md`
- `docs/design/06-backlog.md`
- `docs/design/07-security-rules.md`

## Source Traceability
- `T0163`
- `T0164`
- `T0165`
- `US-032`
- `US-033`

## Phase
Phase 1A — Orders

## Prerequisites
- Task 23
- Task 28

## Instructions

1. **Milestones**
   - Implement submit, request revision and approve commands for order milestones.
   - Enforce sequence, participant permission, revision limit and private deliverable assets.
   - Audit approval/revision actions.

2. **Change requests**
   - Implement scope, price and schedule delta requests without mutating original snapshots.
   - Require approvals according to the state/policy and increment order version.
   - Integrate payment adjustment only through a future/approved financial command.

3. **Production updates**
   - Implement typed production updates with text/media and occurredAt.
   - Validate order participant and allowed lifecycle stage.
   - Emit safe notifications.

## Verify
- Milestone cannot be approved by unauthorized participant
- Change request preserves original terms and records delta
- Private deliverable/production evidence access follows order participation
- Duplicate submit/approve command is idempotent or returns controlled conflict

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
