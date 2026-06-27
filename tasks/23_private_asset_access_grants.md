<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 23: Implement Private Asset Access Grants for Requests and Orders

## 🤖 Recommended Model
> Complexity: **High** — least-privilege access to private design assets before the full upload pipeline

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | A | Sonnet 4.6 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ least-privilege access to private design assets before the full upload pipeline |
| Gemini | A | Flash 3.5 | high | เหมาะกับการตรวจ consistency และ workflow สำหรับ least-privilege access to private design assets before the full upload pipeline |
| GPT | A | GPT-5.5 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ least-privilege access to private design assets before the full upload pipeline |
| Budget | A | DeepSeek V4 Pro | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ least-privilege access to private design assets before the full upload pipeline |

## Context Files
Read these before starting:
- `docs/design/03-database-design.md`
- `docs/design/04-api-standard.md`
- `docs/design/07-security-rules.md`
- `docs/design/06-backlog.md`

## Source Traceability
- `T0141`
- `US-020`
- `US-053`

## Phase
Phase 1A — Files/Security

## Prerequisites
- Task 16
- Task 22

## Instructions

1. **Access-grant model**
   - Implement purpose-bound access grants referencing asset, grantee, context, permissions and expiry.
   - Support request invite/proposal review and order participant contexts.
   - Prevent grant escalation by the grantee.

2. **Authorization integration**
   - Use the grant policy when producing short-lived access URLs or download commands.
   - Revoke/expire grants when request closes, proposal loses or participant access ends.
   - Audit sensitive staff/private asset access.

3. **Tests**
   - Cover owner, invited provider, unrelated provider, expired grant and revoked participant.
   - Ensure public content cannot reuse a private source asset directly.

## Verify
- Only owner or active authorized grantee can request access
- Expired/revoked grant is denied immediately
- Access URL is short-lived and absent from logs
- Authorization and audit tests pass

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
