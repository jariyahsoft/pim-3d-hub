<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 15: Build Onboarding, Profile, Address and Preference Flows

## 🤖 Recommended Model
> Complexity: **Medium** — standard profile CRUD, mobile forms and preference persistence

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | B | Haiku 4.5 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ standard profile CRUD, mobile forms and preference persistence |
| Gemini | B | Flash 3.5 | mid | เหมาะกับการตรวจ consistency และ workflow สำหรับ standard profile CRUD, mobile forms and preference persistence |
| GPT | B | GPT-5.4 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ standard profile CRUD, mobile forms and preference persistence |
| Budget | B | DeepSeek V4 Flash | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ standard profile CRUD, mobile forms and preference persistence |

## Context Files
Read these before starting:
- `docs/design/06-backlog.md`
- `docs/design/08-ui-guide.md`
- `docs/design/02-coding-rules.md`
- `docs/design/04-api-standard.md`

## Source Traceability
- `T0102`
- `T0103`
- `US-001`
- `US-002`

## Phase
Phase 1A — Identity

## Prerequisites
- Task 14

## Instructions

1. **Application/API**
   - Implement onboarding completion, `GET/PATCH /users/me`, address CRUD and notification/privacy preference endpoints.
   - Separate public profile fields from private contact/address fields.
   - Use expectedVersion for profile/address updates.

2. **Web UI**
   - Create mobile-first onboarding and profile screens in `apps/web`.
   - Include loading, validation, error, success and offline-draft behavior where applicable.
   - Use Thai default locale and safe fictional test data.

3. **Validation/privacy**
   - Normalize locale/country codes and validate address fields without requiring an undecided third-party provider.
   - Do not expose private address/contact fields in public DTOs.

4. **Tests**
   - Add API, component and accessibility tests for onboarding/profile flows.

## Verify
- New user can complete onboarding and revisit profile
- Private fields never appear in public profile response
- Stale expectedVersion returns conflict without data loss
- Mobile, keyboard and screen-reader checks pass for critical forms

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
