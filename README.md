# 3D Print Marketplace Thailand

แพลตฟอร์ม Marketplace และ Community สำหรับค้นหานักออกแบบ 3D ผู้รับพิมพ์ ร้านพิมพ์และ Print Farm พร้อมระบบราคาอัตโนมัติ การเสนอราคา การติดตามงาน คอนเทนต์รีวิว และตลาดซื้อขายเครื่องพิมพ์ 3D

> สถานะ: Initial project documentation — workspace scaffold เริ่มแล้ว แต่ application features ยังไม่พร้อม
>
> Product name: `3D Print Marketplace Thailand`  
> Repository slug: `pim-3d-hub`  
> Workspace package scope: `@pim/*`

## Overview

โครงการแก้ปัญหาการค้นหาร้าน การประเมินราคา และการติดตามงาน 3D Printing ที่กระจัดกระจายในประเทศไทย โดยรองรับบริการ 3 รูปแบบ:

1. รับดีไซน์อย่างเดียว
2. รับปริ้นอย่างเดียว
3. รับดีไซน์และปริ้นแบบครบวงจร

เมื่อไฟล์และเครื่องผ่านเงื่อนไข ระบบจะสร้าง `Instant Quote` ได้ทันที หากไม่ผ่าน ระบบจะเปลี่ยนเป็น `Manual Quote` โดยรักษาข้อมูลที่ผู้ใช้กรอกไว้

## Target users

- ผู้ซื้อบริการทั่วไป นักเรียน นักศึกษา Maker วิศวกร SME และโรงงาน
- นักออกแบบ 3D
- ผู้รับพิมพ์รายบุคคล ร้านพิมพ์ และ Print Farm
- ผู้ขายเครื่องพิมพ์ วัสดุ อะไหล่ และอุปกรณ์
- Content Creator และ Reviewer
- เจ้าหน้าที่ KYC การเงิน Moderation Support และ Platform Admin

## Core capabilities

- บัญชีเดียวมีหลายบทบาท
- โปรไฟล์ผู้ให้บริการ เครื่องพิมพ์ วัสดุ Pricing Profile และ Capacity
- Upload Session, 3D Viewer และ Model Analysis
- Instant Pricing และ Manual Proposal
- Order State Machine, Milestone และ Change Request
- Payment, Refund, Payout และ Shipping
- Chat, Production Update และหลักฐานการผลิต
- Verified Review, Content Feed และ Sponsored Placement
- Marketplace เครื่องพิมพ์และอุปกรณ์
- Admin, KYC, Dispute, Moderation และ Audit
- Portable Export และ Database Migration ไป PostgreSQL/MongoDB

## Delivery phases

### Phase 1 — Mobile-first Web App / PWA

- Phase 1A: Marketplace Foundation
- Phase 1B: Instant Pricing
- Phase 1C: Content and Commerce

### Phase 2 — Cross-platform Mobile App

- Android และ iOS ใช้ API ชุดเดียวกับ Web
- Native Push, Camera, Background Upload, Deep Link และ Seller Workspace
- ระยะถัดไปเพิ่ม Cloud Slicing, Smart Matching และ Print Farm Integration

## Foundation decision baseline

| Area | Baseline | Decision status |
|---|---|---|
| Web/PWA | `Next.js` App Router + TypeScript/React | Accepted for Phase 1 |
| Mobile | Flutter หรือ React Native | Open until Task 59 |
| Backend | TypeScript + Node.js | Accepted from SRS |
| API | REST/JSON + OpenAPI 3.1 | Accepted |
| API contract toolchain | `zod` + generated OpenAPI artifact + `@redocly/cli` + `openapi-typescript`/`openapi-fetch` | Accepted |
| API runtime | Cloud Functions 2nd Gen; Cloud Run สำหรับงานหนัก | Accepted |
| Operational DB | Cloud Firestore ผ่าน Repository Adapter | Accepted for Phase 1 |
| Object storage | Cloud Storage ผ่าน Storage Port | Accepted for Phase 1 |
| Package manager/monorepo | `pnpm` workspaces + `turbo` | Accepted |
| Test stack | `vitest` + `@playwright/test` | Accepted |
| Queue/event delivery | Transactional Outbox + `QueuePort` + Google Cloud Tasks HTTP dispatch | Accepted for Phase 1 |
| Search | Firestore-backed read models ผ่าน `SearchPort` | Accepted for Phase 1 |
| Identity | Firebase Authentication ผ่าน Identity Adapter | Accepted |
| Notifications | In-app, email, PWA Push/FCM ผ่าน Notification Port | Accepted |
| KYC/shipping baseline | Manual-first workflow ผ่าน `KycPort` / `ShippingPort`; vendor automation deferred | Accepted baseline |
| Model parser/analyzer | `STL`/`OBJ`/`3MF` scope accepted; exact libraries deferred to Tasks 45–46 | Open library decision |
| Payment/payout | Payment provider abstraction with compliant Thailand-capable partner | Open vendor decision |
| Future DB | PostgreSQL หรือ MongoDB Adapter | Required portability target |

## Architecture summary

```text
Web/PWA ───────────────┐
Mobile App (Phase 2) ──┼── REST/OpenAPI ── Application/Domain ── Ports
Admin Portal ──────────┘                                      │
                                          Infrastructure Adapters
                                  Firestore / Storage / Payment / Queue
```

กฎบังคับ:

- Client ห้ามอ่านหรือเขียน Firestore โดยตรงสำหรับ Business Data
- Domain Layer ห้าม import Firebase types
- Business ID ใช้ UUIDv7 ไม่ใช้ Firebase UID หรือ Firestore Auto ID
- Money เก็บเป็น integer หน่วยย่อย
- Timestamp ใน API ใช้ RFC3339 UTC
- ทุกฐานข้อมูลต้องผ่าน Repository Interface
- PostgreSQL/MongoDB Adapter ต้องผ่าน Contract Test เดียวกับ Firestore Adapter

อ่านรายละเอียดที่ [Architecture](docs/design/01-architecture.md) และ [Database Design](docs/design/03-database-design.md)

## Getting started

workspace scaffold มีแล้ว แต่ application features ยังต้องสร้างต่อจาก task ใน [`docs/design/11-tasks.md`](docs/design/11-tasks.md)

คำสั่งเป้าหมายหลังสร้าง scaffold:

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm dev
pnpm emulators
pnpm test:integration
pnpm test:contract
pnpm build
```

> ชุดคำสั่งด้านบนคือ target developer workflow ที่จะถูกสร้างจริงในงาน scaffold ของ Phase 0
>
> Task 01 accepted the root toolchain baseline: `pnpm`, `turbo`, `Next.js`, `vitest`, `@playwright/test`, `zod`, `@redocly/cli`, and generated OpenAPI clients.

## Workspace scaffold checks

ใช้ `corepack pnpm` หากยังไม่มี `pnpm` แบบ global

```bash
corepack pnpm install
corepack pnpm -r list --depth -1
```

## Quality Gates

- Local hooks run staged-file formatting/linting and a pre-push typecheck.
- Bypass hooks only with `--no-verify` in an emergency, then rerun the relevant CI check before merging.
- CI remains the source of truth for merge approval.
- Use `corepack pnpm test:unit` for the canonical domain and API envelope suites.
- Use `corepack pnpm test:auth` for the Firebase Auth emulator coverage around ID-token verification.
- Use `corepack pnpm test:contract` for the reusable in-memory repository contract suite and deterministic fake coverage.
- Use `corepack pnpm test:contract:firestore` for the emulator-backed Firestore repository contract suite.
- Use `corepack pnpm portability:rehearsal` for the canonical JSONL import rehearsal against local PostgreSQL and MongoDB containers.

## Environment variables

ห้ามเก็บ Secret จริงใน repository ควรมี [.env.example](.env.example) เป็น template และแยกค่า local, development, staging และ production ออกจากกัน

| Variable | Purpose | Exposure |
|---|---|---|
| `APP_ENV` | local/development/staging/production | Server |
| `APP_BASE_URL` | Public application URL | Public config |
| `API_BASE_URL` | REST API URL | Public config |
| `FIREBASE_PROJECT_ID` | Firebase project identifier | Server/client config |
| `FIREBASE_AUTH_EMULATOR_HOST` | Local Auth emulator host:port | Server |
| `FIRESTORE_EMULATOR_HOST` | Local Firestore emulator host:port | Server |
| `FIREBASE_STORAGE_EMULATOR_HOST` | Local Storage emulator host:port | Server |
| `FIREBASE_AUTHORIZED_DOMAINS` | Allowed Firebase Auth domains | Server |
| `FIREBASE_AUTH_REDIRECT_URLS` | OAuth redirect URLs | Server |
| `FIREBASE_PROJECT_LOCAL` | Local emulator project alias | Server |
| `FIREBASE_PROJECT_DEVELOPMENT` | Development project alias | Server |
| `FIREBASE_PROJECT_STAGING` | Staging project alias | Server |
| `FIREBASE_PROJECT_PRODUCTION` | Production project alias | Server |
| `FIREBASE_CLIENT_EMAIL` | Admin SDK service account | Secret |
| `FIREBASE_PRIVATE_KEY` | Admin SDK key | Secret |
| `STORAGE_BUCKET` | Object storage bucket | Server |
| `APP_CHECK_MODE` | monitor/enforce/disabled-local | Server |
| `PAYMENT_PROVIDER` | Payment adapter selection | Server |
| `PAYMENT_WEBHOOK_SECRET` | Signature verification | Secret |
| `EMAIL_PROVIDER` | Email adapter selection | Server |
| `SEARCH_PROVIDER` | Search adapter selection | Server |
| `FILE_SCAN_PROVIDER` | Malware scanning adapter | Server |
| `OTEL_EXPORTER_ENDPOINT` | Trace/metrics exporter | Server |
| `LOG_LEVEL` | Structured logging level | Server |

### Firebase auth baseline

- Supported sign-in methods: email/password, Google, Apple, phone
- Local emulator test flow: email/password and phone
- Local emulator project alias: `local`
- Development, staging and production aliases stay separate and must not be reused by default emulator scripts
- Firestore and Storage emulator hosts are local-only and rejected by non-local startup validation

### Firebase rules checks

- Start local emulators with `corepack pnpm emulators:firebase`
- Run Firebase Auth adapter tests with `corepack pnpm test:auth`
- Run deny-by-default rules tests with `corepack pnpm test:rules`
- Run the Firestore repository contract suite with `corepack pnpm test:contract:firestore`
- Validate the committed composite indexes with `corepack pnpm firestore:indexes:check`
- Run the portability rehearsal with `corepack pnpm portability:rehearsal`
- Run the contract-only health/readiness smoke gate with `corepack pnpm smoke:health`

## Proposed repository structure

```text
.
├── apps/
│   ├── web/
│   ├── admin/
│   └── mobile/
├── services/
│   ├── api/
│   └── workers/
├── packages/
│   ├── domain/
│   ├── application/
│   ├── contracts/
│   ├── infrastructure/
│   ├── ui/
│   ├── config/
│   └── testkit/
├── firebase/
├── infra/
├── docs/design/
└── tools/
```

## Development workflow

1. เลือก task จาก [`11-tasks.md`](docs/design/11-tasks.md)
2. ตรวจ source requirement และ acceptance criteria
3. หากมี decision ใหม่ ให้เพิ่ม ADR ใน [`05-decisions.md`](docs/design/05-decisions.md)
4. แก้ Domain/API Contract ก่อน Adapter/UI
5. เพิ่ม tests ตาม [`09-testing-guide.md`](docs/design/09-testing-guide.md)
6. รัน lint, typecheck, unit, contract และ security tests
7. เปิด Pull Request พร้อม traceability ไปยัง User Story/FR
8. Deploy preview/staging และทำ smoke test ก่อน production

## Testing

- Domain unit tests
- API/application integration tests
- Repository contract tests
- Firebase Emulator tests
- OpenAPI compatibility tests
- E2E critical user journeys
- Security, accessibility และ performance tests
- Data portability test ไป Local PostgreSQL และ MongoDB

ดู [`docs/design/09-testing-guide.md`](docs/design/09-testing-guide.md)

## Deployment

Environment แยกเป็น Local, Development, Staging และ Production โดยแต่ละ environment ต้องแยก Firebase Project, bucket, credentials, payment settings และ analytics

Production deployment ต้องมี manual approval, rules/index review, backup/export verification, smoke test, rollback plan และ post-deploy monitoring

## Documentation

- [00 — Project Overview](docs/design/00-project-overview.md)
- [01 — Architecture](docs/design/01-architecture.md)
- [02 — Coding Rules](docs/design/02-coding-rules.md)
- [03 — Database Design](docs/design/03-database-design.md)
- [04 — API Standard](docs/design/04-api-standard.md)
- [05 — Architecture Decisions](docs/design/05-decisions.md)
- [06 — Product Backlog](docs/design/06-backlog.md)
- [07 — Security Rules](docs/design/07-security-rules.md)
- [08 — UI Guide](docs/design/08-ui-guide.md)
- [09 — Testing Guide](docs/design/09-testing-guide.md)
- [10 — Glossary](docs/design/10-glossary.md)
- [11 — Tasks](docs/design/11-tasks.md)
- [12 — UI Image Prompts](docs/design/12-ui-image-prompts.md)

## Assumptions

- Repository เริ่มต้นใหม่และยังไม่มีโค้ดที่ต้อง preserve
- ใช้ monorepo เพื่อแชร์ Domain, Contracts และ UI primitives
- ใช้ `pnpm` workspaces และ `turbo` เป็น root developer workflow
- ใช้ `Next.js` เป็น Web/PWA baseline และ `vitest`/`@playwright/test` เป็น baseline สำหรับการทดสอบ
- Mobile framework, payment provider และ vendor automation สำหรับ KYC/shipping ยังต้องตัดสินใจจาก spike หรือ owner/legal constraints
- Marketplace เริ่มต้นด้วยภาษาไทย สกุลเงิน THB และเวลาแสดงผล Asia/Bangkok

## Open questions

- เลือก Mobile framework ใดหลัง Task 59: Flutter หรือ React Native?
- Payment Gateway ใดรองรับ Dynamic PromptPay QR, webhook, refund และ payout ตามรูปแบบธุรกิจหลัง owner/legal review?
- KYC, Shipping และ file-analysis vendor ใดเหมาะกับ retention, coverage และต้นทุนจริง?
- ต้องยกระดับจาก Firestore-backed search ไป external search เมื่อใด?
- Instant pricing รุ่นแรกจะรองรับเทคโนโลยี เครื่อง และวัสดุใด?
- ค่าธรรมเนียม Subscription และ Sponsored Placement เป็นเท่าใด?

## Source

- `3d-print-marketplace-SRS-firebase-portable-v1.md`: Sections 1–35
- `00_create_init_ai_file(2).md`: Initial project files specification

## License

TBD
