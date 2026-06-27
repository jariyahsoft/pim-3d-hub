<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 09: Implement Structured Logging, Request Context and Correlation

## 🤖 Recommended Model
> Complexity: **Medium** — safe telemetry with request/trace propagation

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | B | Haiku 4.5 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ safe telemetry with request/trace propagation |
| Gemini | B | Flash 3.5 | mid | เหมาะกับการตรวจ consistency และ workflow สำหรับ safe telemetry with request/trace propagation |
| GPT | B | GPT-5.4 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ safe telemetry with request/trace propagation |
| Budget | B | DeepSeek V4 Flash | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ safe telemetry with request/trace propagation |

## Context Files
Read these before starting:
- `docs/design/01-architecture.md`
- `docs/design/02-coding-rules.md`
- `docs/design/07-security-rules.md`
- `docs/design/09-testing-guide.md`

## Source Traceability
- `T0036`

## Phase
Phase 0 — Foundation

## Prerequisites
- Task 02
- Task 04

## Instructions

1. **Request context**
   - Create requestId/traceId generation and propagation for API and worker execution.
   - Support optional userId/module/action/provider fields without requiring Domain to import logging.
   - Pass context through application use cases and outbox metadata using approved abstractions.

2. **Structured logger**
   - Implement environment-appropriate structured logging and error serialization.
   - Create a redaction policy for tokens, signed URLs, KYC, payment and address fields.
   - Add duration and outcome metrics hooks.

3. **Verification fixtures**
   - Add tests demonstrating request ID preservation through a sample API call and background event.
   - Add tests for redaction.

## Verify
- Sample API and worker log entries contain requestId/traceId
- Redaction test proves secrets and sensitive fields do not appear
- Domain package has no logger SDK dependency
- Unexpected error maps to safe response while retaining internal correlation ID

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
