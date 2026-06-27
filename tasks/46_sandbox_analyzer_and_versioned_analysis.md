<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 46: Implement Sandboxed Model Analyzer Worker and Versioned Analysis

## 🤖 Recommended Model
> Complexity: **Very High** — untrusted native geometry processing, resource isolation and reproducible analysis records

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | A | Sonnet 4.6 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ untrusted native geometry processing, resource isolation and reproducible analysis records |
| Gemini | A | Flash 3.5 | high | เหมาะกับการตรวจ consistency และ workflow สำหรับ untrusted native geometry processing, resource isolation and reproducible analysis records |
| GPT | A | GPT-5.5 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ untrusted native geometry processing, resource isolation and reproducible analysis records |
| Budget | A | DeepSeek V4 Pro | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ untrusted native geometry processing, resource isolation and reproducible analysis records |

## Context Files
Read these before starting:
- `docs/design/01-architecture.md`
- `docs/design/03-database-design.md`
- `docs/design/07-security-rules.md`
- `docs/design/09-testing-guide.md`

## Source Traceability
- `T0323`
- `T0324`
- `US-052`

## Phase
Phase 1B — Viewer/Analysis

## Prerequisites
- Task 09
- Task 12
- Task 43
- Task 45

## Instructions

1. **Worker/sandbox**
   - Create Cloud Run/container worker or accepted equivalent with CPU, memory, time and file-size limits.
   - Use isolated work directory and no shell interpolation from filenames.
   - Clean temporary files on success/failure and emit safe structured logs.

2. **Analysis contract**
   - Produce canonical units, bounds, volume, mesh-health indicators, analyzer version and eligibility hints.
   - Store versioned `model_analysis` record linked to file asset.
   - Keep analyzer-specific raw data behind adapter or versioned metadata.

3. **Job reliability**
   - Consume `file.ready`/analysis request idempotently through queue/outbox.
   - Implement retry classification and dead-letter state.

4. **Tests**
   - Cover timeout, memory/resource failure, duplicate event and unsupported/corrupt file.

## Verify
- Analyzer cannot exceed configured resource/time limits in test
- Duplicate job creates one effective analysis version
- Canonical output is deterministic for a fixed analyzer/profile
- Failure records a safe reason and supports manual fallback

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
