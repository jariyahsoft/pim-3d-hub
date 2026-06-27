<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 45: Select and Implement Safe 3D Parser, Viewer, Preview and Dimensions

## 🤖 Recommended Model
> Complexity: **High** — 3D format handling, licensing, browser performance and unit ambiguity

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | B | Haiku 4.5 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ 3D format handling, licensing, browser performance and unit ambiguity |
| Gemini | B | Flash 3.5 | mid | เหมาะกับการตรวจ consistency และ workflow สำหรับ 3D format handling, licensing, browser performance and unit ambiguity |
| GPT | B | GPT-5.4 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ 3D format handling, licensing, browser performance and unit ambiguity |
| Budget | B | DeepSeek V4 Flash | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ 3D format handling, licensing, browser performance and unit ambiguity |

## Context Files
Read these before starting:
- `docs/design/01-architecture.md`
- `docs/design/05-decisions.md`
- `docs/design/07-security-rules.md`
- `docs/design/08-ui-guide.md`

## Source Traceability
- `T0320–T0322`
- `US-051`

## Phase
Phase 1B — Viewer/Analysis

## Prerequisites
- Task 01
- Task 43

## Instructions

1. **Tool decision/spike**
   - Evaluate the accepted/available parser and viewer for STL, OBJ and 3MF, including license, bundle size, unsupported features and mobile performance.
   - Update ADR-017 or create a focused ADR.
   - Do not enable server-native parsing without sandbox design.

2. **Preview pipeline**
   - Generate or load safe derived preview data rather than exposing raw private object publicly.
   - Implement viewer rotate/zoom/reset and resource limits.
   - Provide textual metadata alternative.

3. **Dimensions/units**
   - Compute/display bounds in millimeters and require confirmation when source unit is ambiguous.
   - Do not overwrite source file; store user-confirmed scale as request/quote input.

4. **Tests**
   - Test supported sample files, malformed geometry, large meshes and low-end/mobile fallback.

## Verify
- Viewer renders approved sample formats on target mobile browsers
- Ambiguous units cannot proceed silently
- Private source URL is not exposed publicly
- License/limitations and performance result are documented

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
