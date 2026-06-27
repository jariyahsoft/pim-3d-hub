<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 43: Implement Upload Completion, Checksum, Quarantine, Scan, Access and Retention

## 🤖 Recommended Model
> Complexity: **Very High** — untrusted file verification, malware/quarantine state and private lifecycle enforcement

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | A | Sonnet 4.6 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ untrusted file verification, malware/quarantine state and private lifecycle enforcement |
| Gemini | A | Flash 3.5 | high | เหมาะกับการตรวจ consistency และ workflow สำหรับ untrusted file verification, malware/quarantine state and private lifecycle enforcement |
| GPT | A | GPT-5.5 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ untrusted file verification, malware/quarantine state and private lifecycle enforcement |
| Budget | A | DeepSeek V4 Pro | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ untrusted file verification, malware/quarantine state and private lifecycle enforcement |

## Context Files
Read these before starting:
- `docs/design/03-database-design.md`
- `docs/design/04-api-standard.md`
- `docs/design/07-security-rules.md`
- `docs/design/09-testing-guide.md`

## Source Traceability
- `T0302–T0305`
- `US-050`
- `US-053`

## Phase
Phase 1B — Files

## Prerequisites
- Task 23
- Task 42

## Instructions

1. **Completion verification**
   - Implement complete-upload command that verifies object existence, size, MIME and checksum.
   - Reject mismatches and prevent completing another user's upload.
   - Transition into quarantine/scan state through explicit state machine.

2. **Scanning/quarantine**
   - Implement FileScanPort and fake/sandbox adapter.
   - Keep object inaccessible to normal consumers until scan succeeds.
   - Record scanner version/result without storing unsafe payload in logs.

3. **Access and retention**
   - Integrate active asset grants and short-lived access URL generation.
   - Implement retention/deletion job respecting order/dispute/legal holds.
   - Remove temporary working objects and record deletion outcome.

4. **Tests**
   - Cover checksum mismatch, malicious result, scanner timeout/retry, legal hold and expired grant.

## Verify
- Unscanned/rejected asset cannot be downloaded by provider
- Checksum mismatch cannot transition to ready
- Retention job skips held assets and deletes eligible objects idempotently
- Sensitive URLs and scanner payloads are absent from logs

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
