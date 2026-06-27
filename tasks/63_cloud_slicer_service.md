<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 63: Implement Versioned Cloud Slicer Service

## 🤖 Recommended Model
> Complexity: **Very High** — native slicing workload, deterministic profiles and strict sandbox isolation

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | A | Sonnet 4.6 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ native slicing workload, deterministic profiles and strict sandbox isolation |
| Gemini | A | Flash 3.5 | high | เหมาะกับการตรวจ consistency และ workflow สำหรับ native slicing workload, deterministic profiles and strict sandbox isolation |
| GPT | A | GPT-5.5 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ native slicing workload, deterministic profiles and strict sandbox isolation |
| Budget | A | DeepSeek V4 Pro | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ native slicing workload, deterministic profiles and strict sandbox isolation |

## Context Files
Read these before starting:
- `docs/design/01-architecture.md`
- `docs/design/03-database-design.md`
- `docs/design/05-decisions.md`
- `docs/design/07-security-rules.md`
- `docs/design/09-testing-guide.md`

## Source Traceability
- `T0600`
- `US-130 partial`

## Phase
Phase 2B — Advanced Platform

## Prerequisites
- Task 46
- Task 48
- Task 52

## Instructions

1. **Slicer decision/profile**
   - Select an approved slicer/license and define versioned printer/material/quality profiles.
   - Document unsupported features and deterministic settings.
   - Separate provider profile mapping from canonical slice request.

2. **Sandbox service**
   - Implement asynchronous container service with CPU/memory/time/disk quotas, isolated work directories and no unsafe shell interpolation.
   - Produce canonical estimates such as time, material and support metrics with slicer/profile version.
   - Store generated machine files only when explicitly required and access-controlled.

3. **Reliability/security**
   - Add queue retries, dead-letter, deduplication, cleanup and observability.
   - Fuzz and resource-test untrusted files.

## Verify
- Fixed input/profile/version produces reproducible estimate within documented tolerance
- Resource limit and cleanup tests pass
- Duplicate job does not create conflicting active result
- Slicer license/profile/version is documented and auditable

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
