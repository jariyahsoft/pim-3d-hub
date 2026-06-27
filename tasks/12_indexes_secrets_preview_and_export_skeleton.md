<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 12: Add Indexes, Secret/IAM Baseline, Preview Deployment and Export Skeleton

## 🤖 Recommended Model
> Complexity: **High** — operational Firebase configuration, least privilege and recoverability foundations

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | A | Sonnet 4.6 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ operational Firebase configuration, least privilege and recoverability foundations |
| Gemini | A | Flash 3.5 | high | เหมาะกับการตรวจ consistency และ workflow สำหรับ operational Firebase configuration, least privilege and recoverability foundations |
| GPT | A | GPT-5.5 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ operational Firebase configuration, least privilege and recoverability foundations |
| Budget | A | DeepSeek V4 Pro | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ operational Firebase configuration, least privilege and recoverability foundations |

## Context Files
Read these before starting:
- `docs/design/01-architecture.md`
- `docs/design/03-database-design.md`
- `docs/design/07-security-rules.md`
- `docs/design/09-testing-guide.md`

## Source Traceability
- `T0044`
- `T0045`
- `T0046`
- `T0047`

## Phase
Phase 0 — Foundation

## Prerequisites
- Task 05
- Task 10
- Task 11

## Instructions

1. **Firestore indexes**
   - Create source-controlled index configuration for documented query patterns only.
   - Annotate or map each index to a use case/query.
   - Avoid speculative high-cardinality indexes.

2. **Secrets and IAM**
   - Document minimum service identities for API, workers, deploy and CI.
   - Configure secret references and least-privilege access where account permissions are available.
   - Never place secret material in project files.

3. **Preview/staging deployment**
   - Create a deploy workflow for Web/API/workers/rules using accepted tooling.
   - Add environment and production-approval guardrails.
   - Implement health/readiness smoke check.

4. **Export skeleton**
   - Create an export-run model and worker skeleton producing manifest/status without yet exporting every entity.
   - Include encryption/restricted destination and failure recording hooks.

## Verify
- Index config validates/deploys to emulator or staging
- Deployment to preview/staging succeeds without production credentials
- Service identities have no documented wildcard admin role unless justified
- Export skeleton creates a run record and manifest with deterministic metadata

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
