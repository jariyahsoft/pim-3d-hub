# 12 — UI Image Prompts

## Purpose

ใช้สร้างภาพ UX/UI เพื่อสื่อสารกับลูกค้า นักลงทุน ทีมออกแบบ และทีมพัฒนา ไม่ใช่ implementation specification

Sources:

- [08-ui-guide.md](08-ui-guide.md)
- [07-security-rules.md](07-security-rules.md)
- `3d-print-marketplace-SRS-firebase-portable-v1.md`

AI-generated text must be corrected in a design tool.

## Use

1. Include `[MASTER STYLE]`
2. Add a screen prompt
3. Add `[NEGATIVE PROMPT]`
4. Generate flat UI first
5. Validate consistency
6. Do not invent features

## MASTER STYLE

```text
[MASTER STYLE]

Design a production-ready mobile-first marketplace UI for “3D Print Marketplace Thailand”, a Thai platform connecting buyers, 3D designers, print providers, print farms, content creators, and sellers of 3D printers and materials.

Brand personality: trustworthy, modern, practical, friendly to beginners, credible for professional makers and SMEs. Avoid futuristic sci-fi clichés. Use a clean neutral light background, accessible dark text, calm blue/indigo primary actions, teal manufacturing-success accents, amber warning, red danger, and a clearly labeled but visually restrained sponsored accent. Use color only as a supplement to text and icons.

Typography: readable Thai-first sans-serif, generous line height, large mobile body text, clear hierarchy, tabular numerals for prices and dimensions. Use short realistic Thai labels and fictional sample data only.

Layout: mobile-first 390x844 px flat app screen, 8-point spacing, minimum 44px touch targets, rounded medium cards, subtle borders and minimal shadows. Bottom navigation: หน้าหลัก, สำรวจ, สร้าง, คำสั่งซื้อ, โปรไฟล์. Keep one dominant primary action per screen.

Components: accessible form controls, filter chips, provider cards, verified badge, sponsored label, price breakdown, upload progress, 3D preview container, status timeline, proposal comparison, chat, production evidence, product cards, empty/error/offline states.

Safety and trust: private file indicators, consent for showcasing customer work, verified-purchase badge, sponsored labels, prohibited-item notices, clear payment-provider handoff, and no exposure of private model files or personal information.

Output: high-fidelity flat application UI, no phone hand/device frame unless explicitly requested, precise spacing, realistic but fictional Thai data, no logos or copyrighted third-party brand assets.
```

## NEGATIVE PROMPT

```text
[NEGATIVE PROMPT]

No cyberpunk, neon sci-fi, dark gaming dashboard, excessive gradients, glassmorphism, tiny text, cluttered cards, illegible Thai, random English labels, fake bank logos, copyrighted printer logos, real personal data, real phone numbers, credentials, public download links, weapons, prohibited 3D printed items, medical claims, hidden sponsored content, misleading ratings, impossible printer capabilities, unexplained technical jargon, desktop layout squeezed into mobile, decorative 3D objects covering controls, or UI that implies payment/production completed without server confirmation.
```

## Screen 01 — Home

```text
Use [MASTER STYLE].

Objective: introduce the marketplace and fast buyer paths.
Role: visitor/buyer.
Content:
- search “ค้นหางานพิมพ์ 3D ร้าน หรือเครื่องพิมพ์”
- actions “มีไฟล์แล้ว เช็กราคา” and “ยังไม่มีไฟล์ หานักออกแบบ”
- categories: ออกแบบ 3D, พิมพ์ 3D, ออกแบบและพิมพ์
- verified nearby providers with price-from, lead time, rating, province
- community showcase with Verified Purchase
- printer/material marketplace row
- one clearly labeled promoted provider
- bottom navigation, Home active
Primary: upload file.
Secondary: create request.
Output 390x844 flat screen.
```

## Screen 02 — Choose service

```text
Use [MASTER STYLE].

Show step “สร้างงาน 1 จาก 4”.
Three selectable cards:
- ออกแบบอย่างเดียว
- พิมพ์อย่างเดียว
- ออกแบบและพิมพ์
Use plain Thai descriptions.
Include “ไม่แน่ใจ? ตอบคำถาม 3 ข้อ”.
Privacy selector: public, invited providers, private project.
Primary “ถัดไป”; secondary “บันทึกร่าง”.
Output mobile.
```

## Screen 03 — Secure upload

```text
Use [MASTER STYLE].

Upload STL/OBJ/3MF securely.
Show fictional file “housing-v3.stl”, 62%, pause/cancel.
Lock badge: “ไฟล์ส่วนตัว — ร้านจะเข้าถึงเมื่อได้รับสิทธิ”.
Ownership confirmation and prohibited-work notice.
Offline banner: upload will resume.
Primary disabled until complete.
Output 390x844.
```

## Screen 04 — Model analysis

```text
Use [MASTER STYLE].

Show a neutral mechanical model in a 3D viewport.
Dimensions 120 x 80 x 35 mm.
Steps: ตรวจไฟล์, ตรวจรูปทรง, ประเมินการพิมพ์.
Result: “พร้อมคำนวณราคาอัตโนมัติ”.
Warning: “มีส่วนยื่น ต้องใช้ Support”.
Material recommendations PLA/PETG.
Primary “เลือกวัสดุและเช็กราคา”.
Secondary “ขอให้ร้านตรวจด้วยตนเอง”.
Include textual-access alternative.
```

## Screen 05 — Manual fallback

```text
Use [MASTER STYLE].

Amber, non-catastrophic state:
“ยังคำนวณราคาอัตโนมัติไม่ได้”.
Reasons: ขนาดเกินเครื่องมาตรฐาน, ต้องแบ่งชิ้นงาน, ต้องตรวจความหนา.
Assure that file/details are preserved.
Primary “ส่งให้ร้านเสนอราคา”.
Secondary “แก้ขนาดโมเดล”, “เปลี่ยนไฟล์”.
No stack trace.
```

## Screen 06 — Configure quote

```text
Use [MASTER STYLE].

Material, color with labels, quality: เร็ว/มาตรฐาน/ละเอียด, quantity, delivery, due date.
Compact model summary.
Recalculating price state.
Advanced options collapsed.
Primary “ดูราคาและร้านที่รองรับ”.
```

## Screen 07 — Provider comparison

```text
Use [MASTER STYLE].

Summary chips and three provider cards.
Each: total price, production time, delivery, verification, completed jobs, on-time percentage, location and capacity.
One card can be promoted but clearly labeled.
Compare tray for two providers.
Primary “เลือกผู้ให้บริการ”.
Secondary “ดูรายละเอียดราคา”.
```

## Screen 08 — Checkout

```text
Use [MASTER STYLE].

Show quote expiry, provider, model thumbnail, line items, total THB, address, generic PromptPay/card options, custom-made cancellation acknowledgement, licensed payment-provider notice.
No real QR/bank logo.
Primary “ชำระเงิน ฿…”.
```

## Screen 09 — Order production

```text
Use [MASTER STYLE].

Buyer view.
Order number and current “กำลังพิมพ์”.
Stepper: ชำระแล้ว, เตรียมไฟล์, กำลังพิมพ์, ตรวจคุณภาพ, จัดส่ง.
Harmless production evidence image.
Tabs: ภาพรวม, ข้อความ, ไฟล์, การชำระเงิน.
Primary “ส่งข้อความถึงร้าน”.
Secondary “ขอความช่วยเหลือ”.
```

## Screen 10 — Provider dashboard

```text
Use [MASTER STYLE].

Mobile provider workspace.
Metrics: orders due, printers available, pending confirmation, estimated earnings.
Capacity warning.
Queue cards with material, due time, status.
Printer chips: พร้อม, กำลังทำงาน, ปิดรับงาน.
Quick actions: ยืนยันงาน, เริ่มพิมพ์, เพิ่มหลักฐาน, สร้างการจัดส่ง.
```

## Screen 11 — Pricing profile

```text
Use [MASTER STYLE].

Tablet 1024x768.
Versioned pricing form:
scope, minimum, material rate, machine rate, setup, support, risk, rush, quantity.
Test calculator.
Badge “Draft v4 — not active”.
Warning publishing creates a new version and does not alter old quotes.
Actions: ทดสอบ, บันทึกร่าง, เผยแพร่เวอร์ชันใหม่.
```

## Screen 12 — Proposal comparison

```text
Use [MASTER STYLE].

Desktop 1440x1024.
Job summary plus three proposals with provider, verification, total, milestones, revisions, delivery and exclusions.
Expandable breakdown and chat.
Primary per proposal “เลือกข้อเสนอนี้”.
```

## Screen 13 — Content feed

```text
Use [MASTER STYLE].

Tabs: สำหรับคุณ, ผลงานจริง, เทคนิค, รีวิวเครื่อง.
Verified Purchase post with harmless organizer print.
Consented provider showcase.
Sponsored tutorial clearly labeled.
Like/comment/save/share and linked service/product cards.
Output mobile.
```

## Screen 14 — Create showcase

```text
Use [MASTER STYLE].

Provider post editor:
media, caption, tags, linked service, order selector, consent status, NDA blocked state, visibility.
Promotion option appears after publishing and is separate.
Warn original model file is never public.
Primary “เผยแพร่”.
```

## Screen 15 — Used printer detail

```text
Use [MASTER STYLE].

Unbranded fictional enclosed FDM printer.
Condition, price, province, shipping/pickup, build volume, usage, maintenance, defects, evidence checklist, seller verification and reviews.
Primary “ซื้อทันที”.
Secondary “แชตกับผู้ขาย”, “เปรียบเทียบ”.
No serial/real logo.
```

## Screen 16 — KYC

```text
Use [MASTER STYLE].

Stepper: ข้อมูล, เอกสาร, ตรวจสอบ.
Explain purpose.
Private document upload.
Data use/retention summary.
Consent.
Status “รอตรวจสอบ”.
No real ID details.
```

## Screen 17 — Dispute

```text
Use [MASTER STYLE].

Order summary, issue categories, requested solution, evidence upload, timeline/deadline, payout-hold notice.
Neutral language.
Primary “ส่งข้อพิพาท”.
```

## Screen 18 — Admin

```text
Use [MASTER STYLE] for desktop operations portal.

1440x1024.
Left nav, metrics, KYC/dispute/content/payment alert queues, filters, selected case side panel with masked data, actions requiring reason, visible audit trail.
Do not unnecessarily show KYC documents.
```

## Screen 19 — Resilient state board

```text
Use [MASTER STYLE].

16:9 board with four mini screens:
- offline draft saved
- upload paused/resumable
- quote expired/recalculate
- order version conflict/refresh and compare
Preserve work and one safe action each.
1920x1080.
```

## Screen 20 — Product ecosystem

```text
Use [MASTER STYLE].

16:9 investor diagram.
Center platform; surrounding Buyer, Designer, Print Provider, Product Seller, Creator, Admin.
Show service paths and loop:
upload -> instant/manual quote -> order -> production -> shipping -> verified review
content -> discovery -> provider/product conversion
Show Phase 1 PWA and Phase 2 Mobile.
1920x1080.
```

## Responsive variants

Create mobile 390x844, tablet 1024x768 and desktop 1440x1024 for Screens 04, 07, 09, 12 and 15.

Do not stretch; adapt navigation, comparison and split views.

## Non-happy paths

- empty provider search
- payment pending
- confirmation delayed
- capacity unavailable
- permission denied pending KYC
- expired private access
- moderated content
- out-of-stock
- analysis failure
- degraded service with orders accessible

## Consistency checklist

- [ ] glossary terminology
- [ ] same navigation
- [ ] same fictional entities across journey
- [ ] Verified only from completed order
- [ ] Sponsored always labeled
- [ ] no real PII/QR/credential
- [ ] no copyrighted logo
- [ ] THB and mm
- [ ] status includes text/icon
- [ ] private files stay private
- [ ] error/offline states
- [ ] accessibility
- [ ] true responsive variants

## Recommended pitch set

1. Ecosystem overview
2. Home
3. Model analysis
4. Provider comparison
5. Production tracking
6. Content feed
7. Used printer marketplace
8. Provider dashboard
9. Admin trust operations
10. Resilient states
