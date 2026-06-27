# 08 — UI/UX Guide

## Source

- `3d-print-marketplace-SRS-firebase-portable-v1.md`: Sections 1–17, 23–24
- Design tokens below are assumptions pending visual approval.

## Principles

1. ใช้ภาษาคนทั่วไป ไม่บังคับรู้ศัพท์เครื่องพิมพ์
2. แยกชัดเจนระหว่างราคาอัตโนมัติและงานที่ต้องประเมิน
3. แสดงความเสี่ยง/ข้อจำกัดตรงไปตรงมา
4. Mobile-first และ touch-friendly
5. Progressive disclosure สำหรับ advanced options
6. Trust by evidence: verified, proof, timeline
7. Preserve work: draft/retry/fallback
8. Accessible and bilingual-ready

## Brand assumption

บุคลิก: น่าเชื่อถือ ทันสมัย เป็นมิตรกับ Maker และมืออาชีพ

### Suggested tokens

| Token | Role |
|---|---|
| primary | blue/indigo action/trust |
| secondary | teal manufacturing success |
| accent | restrained orange for creator/promotion |
| success | green |
| warning | amber |
| danger | red |
| surface | white/light neutral |
| text | high-contrast dark |

Sponsored ต้องมีข้อความกำกับ ไม่ใช้สีอย่างเดียว.

### Typography/layout

- Thai-first readable sans-serif
- body ≥ 16px equivalent
- tabular numerals for price/dimensions
- 4/8 spacing
- touch target ≥ 44px
- medium radius, subtle border/shadow
- bottom sheets on mobile
- max-width and split panel on desktop

## Information architecture

### Mobile bottom navigation

- หน้าหลัก
- สำรวจ
- สร้าง
- คำสั่งซื้อ
- โปรไฟล์

Create menu:

- ขอออกแบบ/ลงงาน
- อัปโหลดไฟล์เช็กราคา
- สร้างคอนเทนต์
- ลงขายสินค้า
- ลงบริการ

Secondary: Messages, Notifications, Saved, Seller Dashboard, Earnings, Admin Portal.

## Critical flows

### Instant Print

Home -> Upload -> Analyze -> Confirm dimensions -> Configure -> Compare providers -> Checkout -> Payment -> Tracking -> Delivery -> Review

### Manual request

Choose service -> Requirements/assets -> Publish -> Proposals -> Compare/revise -> Accept -> Pay/milestones -> Workroom -> Delivery

### Provider

Onboarding -> Verification -> Services/printers/material/capacity/pricing -> Job/instant order -> Production -> Shipping -> Earnings

### Product

Browse/filter -> Detail/compare -> Chat/buy -> Payment/shipping -> Confirm -> Review/dispute

### Content commerce

Feed -> Verified/Sponsored content -> linked provider/product -> quote/order/purchase

## Page inventory

### Public/onboarding

- Home
- Login/register
- Role selection
- Buyer setup
- Provider onboarding
- KYC/business verification
- Notification/privacy

### Buyer/service

- Service chooser
- Upload
- Analysis
- Quote configuration
- Provider comparison
- Service request
- Proposal comparison
- Checkout/payment
- Order list/detail
- Milestone/change
- Shipment
- Review/dispute

### Provider

- Dashboard
- Service editor
- Printer editor
- Material/stock
- Pricing profile
- Capacity calendar
- Job board
- Proposal builder
- Production workspace
- Earnings

### Content

- Feed
- Post detail/create
- Creator/provider profile
- Search/hashtag
- Saved
- Promotion setup

### Commerce

- Browse/search
- Product detail
- Compare printer
- Listing editor
- Used-printer checklist
- Seller store/dashboard
- Product order

### Admin

- Dashboard
- KYC queue
- User/provider
- Order/payment operations
- Dispute
- Moderation
- Promotion review
- Audit/config

## Key screen requirements

### Upload/analysis

- format/size hint
- progress, cancel, retry
- privacy indicator
- scan/analyze steps
- 3D viewer + textual dimensions
- unit confirmation
- issues by severity
- continue/fallback actions

States: idle, uploading, offline, scanning, analyzing, ready, warning, rejected.

### Quote results

Provider card:

- provider/badge
- total price
- production/delivery
- material/color/quality
- rating/completed jobs
- location/pickup
- capacity
- sponsored label
- compare/select

Sponsored must not alter quality score.

### Order detail

- current status/next action
- snapshots
- timeline
- chat/files
- milestones
- shipping
- payment/refund
- support/dispute

Primary action is actor/state-specific.

### Pricing profile

- scope
- minimum/material/machine/setup/support/labor/risk/rush/quantity
- unit/currency
- test calculator
- version/effective date
- warning that publish creates new version

### Used printer listing

- condition/age/usage
- maintenance/defects
- test evidence
- included accessories/warranty
- pickup/shipping
- safety/fraud warning
- preview

## Standard UI states

### Loading

Use skeleton and status for long jobs; no indefinite spinner.

### Empty

Explain reason and one primary action.

### Error

Plain language, retry, preserve input, request ID, no internal details.

### Success

Confirmation, next step and link.

### Permission denied

Explain role/KYC/access requirement without leaking resource.

### Offline

Preserve draft, disable unsafe mutations, show sync/retry; never claim server success.

### Expired/conflict

- expired quote -> recalculate
- version conflict -> refresh/compare
- capacity unavailable -> alternatives
- payment pending -> safe polling

## Responsive rules

### Mobile

- single column
- bottom sheets
- sticky primary action where safe
- comparison tray
- controlled 3D viewer height

### Tablet

- two-column detail/workspace
- persistent filter where useful

### Desktop

- left nav dashboard
- split chat/order
- comparison table
- dense admin table with responsive fallback

## Component inventory

- App shell/navigation
- Role switcher
- Search/filter chips
- Provider/service/product cards
- Verified/Sponsored/Status badge
- Price breakdown
- File uploader
- 3D viewer
- Analysis issue panel
- Timeline
- Proposal comparison
- Chat
- Milestone
- Production gallery
- Data table
- Empty/error/offline
- Consent/NDA
- Report/moderation dialog

## Content terminology

Recommended formal UI:

- ออกแบบ 3D
- พิมพ์ 3D
- ราคาอัตโนมัติ
- ขอใบเสนอราคา
- ผู้ให้บริการ
- ผลงานจากคำสั่งซื้อจริง
- ได้รับการโปรโมต

Search may recognize “ปริ้น”.

Advanced terms require help text.

## Accessibility

- semantic HTML
- visible focus
- keyboard/dialog focus management
- labels/errors
- color + text/icon
- textual model alternative
- captions
- no sound autoplay
- reduced motion
- upload/analysis live announcement
- screen-reader price breakdown

## Privacy/safety UI

- visibility near upload/post
- showcase consent
- NDA
- prohibited item notice
- sponsored label
- KYC purpose/retention
- payment handoff
- dispute deadline
- confirmation for irreversible action

## Privacy-safe analytics

- upload_started/completed
- analysis_completed
- instant_quote_eligible/selected
- request_published
- proposal_accepted
- checkout_started
- order_completed
- verified_review_submitted
- content_to_provider_click
- product_purchase_completed

Never send filename, model content, full address or free-text sensitive data.

## Open questions

- brand/name/logo
- final colors/font
- “พิมพ์” vs “ปริ้น”
- map emphasis
- comparison count
- realtime chat
- monetization placement limits
