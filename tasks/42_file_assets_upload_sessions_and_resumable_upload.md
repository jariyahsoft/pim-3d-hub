<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 42: Implement File Assets, Upload Sessions and Resumable Upload

## 🤖 Recommended Model
> Complexity: **High** — large private uploads, server-issued object paths and resumable client behavior

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | B | Haiku 4.5 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ large private uploads, server-issued object paths and resumable client behavior |
| Gemini | B | Flash 3.5 | mid | เหมาะกับการตรวจ consistency และ workflow สำหรับ large private uploads, server-issued object paths and resumable client behavior |
| GPT | B | GPT-5.4 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ large private uploads, server-issued object paths and resumable client behavior |
| Budget | B | DeepSeek V4 Flash | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ large private uploads, server-issued object paths and resumable client behavior |

## Context Files
Read these before starting:
- `docs/design/03-database-design.md`
- `docs/design/04-api-standard.md`
- `docs/design/07-security-rules.md`
- `docs/design/06-backlog.md`

## Source Traceability
- `T0300`
- `T0301`
- `US-050`

## Phase
Phase 1B — Files

## Prerequisites
- Task 12
- Task 14
- Task 23

## Instructions

1. **File asset domain**
   - Implement file asset metadata, purpose, owner, MIME, size, checksum, storage key, visibility and status.
   - Generate object paths server-side and keep bytes out of Firestore.
   - Use UUIDv7 and expectedVersion.

2. **Upload session API**
   - Implement time-limited upload session creation with allowlisted type/size and required metadata.
   - Support resumable upload according to the accepted storage approach.
   - Bind upload session to actor, asset ID and object key.

3. **Web uploader**
   - Create upload progress, pause/cancel/retry and private-file indicator.
   - Preserve draft/session safely and avoid analytics leakage.

4. **Tests**
   - Cover unauthorized session, wrong object key, unsupported type, size and expiry.

## Verify
- Large test upload can resume after interruption
- Client cannot choose arbitrary storage path
- Expired session is rejected
- No file bytes are stored in Firestore

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
