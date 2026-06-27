<!-- GENERATED_BY_01_CREATE_SUB_TASK -->
# Task 53: Implement Content Posts, Media and Feed Projection

## 🤖 Recommended Model
> Complexity: **Medium** — community post lifecycle, safe media and rebuildable feed cards

| Group | Tier | Model | Thinking | เหตุผล |
|---|---|---|---|---|
| Claude | B | Haiku 4.5 | — | เหมาะกับการแก้หลายไฟล์และรักษา architecture constraints สำหรับ community post lifecycle, safe media and rebuildable feed cards |
| Gemini | B | Flash 3.5 | mid | เหมาะกับการตรวจ consistency และ workflow สำหรับ community post lifecycle, safe media and rebuildable feed cards |
| GPT | B | GPT-5.4 | medium | เหมาะกับ implementation + verification แบบเป็นระบบ สำหรับ community post lifecycle, safe media and rebuildable feed cards |
| Budget | B | DeepSeek V4 Flash | — | ใช้ได้เมื่อ scope ถูกจำกัดและทำตาม verification สำหรับ community post lifecycle, safe media and rebuildable feed cards |

## Context Files
Read these before starting:
- `docs/design/03-database-design.md`
- `docs/design/04-api-standard.md`
- `docs/design/06-backlog.md`
- `docs/design/08-ui-guide.md`

## Source Traceability
- `T0400`
- `T0401`
- `US-070`

## Phase
Phase 1C — Content

## Prerequisites
- Task 23
- Task 37
- Task 41

## Instructions

1. **Post/media domain**
   - Implement post draft/publish/hide/remove lifecycle, caption, type, visibility and linked entities.
   - Store media as derived/public or private assets according to policy; never publish source model automatically.
   - Validate allowed links to provider/service/product/order-derived review context.

2. **Feed projection**
   - Create rebuildable feed card/read model with publishedAt, author, media, verified/sponsored flags and engagement summary.
   - Implement cursor pagination and visibility filtering.

3. **UI**
   - Create feed and post-detail screens with loading, empty, error and report actions.
   - Add alt text/caption fields and responsive media.

## Verify
- Draft is invisible to public feed
- Removed/hidden post follows moderation visibility policy
- Feed projection rebuild matches source posts
- Private source model is never served as public media

## Definition of Done
- [ ] ผลลัพธ์ตาม Instructions ถูกสร้างหรือแก้ไขครบ
- [ ] ข้อกำหนดด้าน permission, validation และ error handling ที่เกี่ยวข้องถูกบังคับใช้
- [ ] Tests และคำสั่ง Verify ที่เกี่ยวข้องผ่าน
- [ ] เอกสาร, ADR, config หรือ `.env.example` ที่ได้รับผลกระทบถูกอัปเดต
- [ ] ไม่มี blocker ที่ยังไม่ได้บันทึกใน Open Questions หรือ task tracking

---
*Note: Work on exactly one task at a time. You can start a new conversation for the next task to save Context window limits.*
