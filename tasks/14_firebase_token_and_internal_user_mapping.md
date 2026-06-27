<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 14: Implement Firebase Token Adapter and Internal User Mapping

## 🤖 Recommended Model
> Complexity: **High** — authentication boundary, external identity mapping and suspended-account enforcement

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | A | Sonnet 4.6 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ authentication boundary, external identity mapping and suspended-account enforcement |
| Gemini | A | Flash 3.5 | high | เหมาะกับการตรวจ consistency และ workflow สำหรับ authentication boundary, external identity mapping and suspended-account enforcement |
| GPT | A | GPT-5.5 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ authentication boundary, external identity mapping and suspended-account enforcement |
| Budget | A | DeepSeek V4 Pro | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ authentication boundary, external identity mapping and suspended-account enforcement |

## Context Files
Read these before starting:
- `docs/design/03-database-design.md`
- `docs/design/04-api-standard.md`
- `docs/design/07-security-rules.md`
- `docs/design/06-backlog.md`

## Source Traceability
- `T0100`
- `T0101`
- `US-001`

## Phase
Phase 1A — Identity

## Prerequisites
- Task 08
- Task 10
- Task 13

## Instructions

1. **Identity adapter**
   - Implement Firebase ID-token verification behind `IdentityPort` in `packages/infrastructure`.
   - Translate provider subject, email verification and safe claims into an external identity DTO.
   - Do not expose Firebase UID as the internal user ID.

2. **User identity repository**
   - Implement `users` and `user_identities` repositories with unique provider+subject behavior.
   - Create an idempotent resolve-or-onboard application use case using UUIDv7.
   - Reject suspended/deleted internal accounts even when the external token is valid.

3. **API middleware**
   - Create authentication middleware/request context for protected endpoints.
   - Return stable 401/403 codes and safe logs.

4. **Tests**
   - Cover first login, repeat login, duplicate race, invalid token and suspended account.

## Verify
- Valid test token resolves to one stable internal UUID
- Concurrent first login does not create duplicate identity/user
- Invalid/expired token returns `AUTHENTICATION_REQUIRED`
- Suspended user is denied and audit/security event is emitted

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
