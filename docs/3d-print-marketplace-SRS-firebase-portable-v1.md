# Software Requirements Specification (SRS)
## 3D Print Marketplace Thailand

**เวอร์ชัน:** 1.0  
**วันที่จัดทำ:** 27 มิถุนายน 2026  
**สถานะ:** ฉบับสมบูรณ์สำหรับออกแบบ พัฒนา ทดสอบ และประเมินโครงการ  
**อ้างอิงผลิตภัณฑ์:** PRD 3D Print Marketplace Thailand เวอร์ชัน 1.0  
**กลยุทธ์แพลตฟอร์ม:** เฟส 1 Mobile-first Web App/PWA, เฟส 2 Cross-platform Mobile App  
**Backend Platform เริ่มต้น:** Firebase  
**Primary Database เริ่มต้น:** Cloud Firestore  
**เป้าหมายด้านสถาปัตยกรรม:** ลด Vendor Lock-in และสามารถย้ายไป PostgreSQL หรือ MongoDB ได้ในภายหลัง

---

# 1. บทนำ

## 1.1 วัตถุประสงค์ของเอกสาร

เอกสารนี้กำหนดข้อกำหนดซอฟต์แวร์ของแพลตฟอร์มตลาดกลางด้าน 3D Printing สำหรับประเทศไทย ครอบคลุมข้อกำหนดเชิงหน้าที่ ข้อกำหนดที่ไม่ใช่เชิงหน้าที่ สถาปัตยกรรมระบบ การออกแบบข้อมูล การรักษาความปลอดภัย การเชื่อมต่อภายนอก การทดสอบ การติดตั้ง และแนวทางย้ายออกจาก Firebase ไปยัง PostgreSQL หรือ MongoDB

เอกสารนี้ใช้เป็นข้อตกลงร่วมระหว่าง:

- เจ้าของผลิตภัณฑ์และผู้ลงทุน
- ทีมวิเคราะห์ระบบ
- ทีม UX/UI
- ทีม Frontend Web/PWA
- ทีม Mobile Application
- ทีม Backend และ Cloud
- ทีม QA และ Security
- ทีม Data และ DevOps
- Vendor หรือทีมพัฒนาภายนอก

## 1.2 ขอบเขตผลิตภัณฑ์

ระบบเป็น Marketplace และ Community ที่เชื่อมผู้ซื้อบริการเข้ากับนักออกแบบ 3D ผู้รับพิมพ์ ร้านพิมพ์ Print Farm และผู้ขายเครื่องพิมพ์หรืออุปกรณ์ โดยรองรับบริการสามประเภท:

1. รับดีไซน์อย่างเดียว
2. รับปริ้นอย่างเดียว
3. รับดีไซน์และปริ้นแบบครบวงจร

ระบบต้องรองรับราคาอัตโนมัติสำหรับไฟล์และเครื่องที่ผ่านเงื่อนไข รองรับการประกาศงานและเสนอราคา รองรับการติดตามงานผลิต การชำระเงิน การจัดส่ง รีวิว คอนเทนต์โชว์เคส การโฆษณาหรือปักหมุด และ Marketplace สำหรับเครื่องพิมพ์ 3D

## 1.3 เป้าหมายสำคัญ

- เปิดใช้งานเฟสแรกเป็น Mobile-first Web App/PWA
- ใช้ Firebase เพื่อลดเวลาและภาระการดูแลระบบในช่วงเริ่มต้น
- ไม่ให้ Business Logic ผูกกับ Firebase SDK หรือโครงสร้าง Firestore
- ออกแบบข้อมูลแบบ Canonical Model ที่แปลงเป็นตาราง PostgreSQL หรือเอกสาร MongoDB ได้
- ใช้ API Contract ที่คงที่เพื่อให้ Frontend และ Backend ทำงานแยกกันได้
- รองรับการพัฒนา Mobile App เฟส 2 โดยใช้ Backend และ API ชุดเดิม
- มีแผน Export, Backfill, Dual-write และ Cutover สำหรับการย้ายฐานข้อมูล

## 1.4 คำจำกัดความ

| คำศัพท์ | ความหมาย |
|---|---|
| Buyer | ผู้ซื้อบริการหรือสินค้า |
| Provider | ผู้ให้บริการออกแบบ พิมพ์ หรืองานครบวงจร |
| Designer | ผู้ให้บริการออกแบบ 3D |
| Print Provider | ผู้ให้บริการพิมพ์ 3D |
| Print Farm | ผู้ให้บริการที่มีเครื่องหลายเครื่องและจัดการคิวการผลิต |
| Seller | ผู้ขายเครื่องพิมพ์ วัสดุ อะไหล่ หรืออุปกรณ์ |
| Instant Quote | ราคาที่ระบบคำนวณอัตโนมัติทันที |
| Manual Quote | ราคาที่ผู้ให้บริการประเมินและเสนอด้วยตนเอง |
| Service Request | คำขอรับบริการจากผู้ซื้อ |
| Order | คำสั่งซื้อที่เกิดหลังยืนยันราคาและการชำระเงิน |
| Asset | ไฟล์โมเดล รูปภาพ วิดีโอ เอกสาร หรือไฟล์ส่งมอบ |
| Canonical Model | แบบจำลองข้อมูลกลางที่ไม่ขึ้นกับฐานข้อมูลใดฐานข้อมูลหนึ่ง |
| Repository | Interface สำหรับอ่านและเขียนข้อมูล Domain โดยไม่เปิดเผยเทคโนโลยีฐานข้อมูล |
| Adapter | Implementation ที่เชื่อม Interface กับ Firebase, PostgreSQL, MongoDB หรือบริการภายนอก |
| PWA | Web Application ที่ติดตั้งบนหน้าจอมือถือและรองรับความสามารถบางส่วนแบบแอป |
| KYC | การยืนยันตัวตนผู้ใช้งานหรือธุรกิจ |

## 1.5 เอกสารอ้างอิงทางเทคนิค

การออกแบบอ้างอิงแนวทางและความสามารถจากเอกสารทางการของ Firebase ได้แก่ Cloud Firestore Data Model, Cloud Functions for Firebase, Cloud Storage Security Rules, Firebase Authentication, Firebase App Check, Firebase Local Emulator Suite และ Firebase SQL Connect ทั้งนี้การเลือกใช้งานจริงต้องตรวจสอบเวอร์ชัน ราคา Quota และข้อจำกัดอีกครั้งก่อนขึ้น Production

---

# 2. ภาพรวมระบบ

## 2.1 กลุ่มผู้ใช้งาน

- ผู้ซื้อบริการ
- นักออกแบบ 3D
- ผู้รับพิมพ์ 3D
- ผู้ให้บริการครบวงจร
- ผู้ขายสินค้าและเครื่องพิมพ์
- Content Creator
- เจ้าหน้าที่ดูแลระบบ
- เจ้าหน้าที่ตรวจสอบ KYC
- เจ้าหน้าที่การเงิน
- เจ้าหน้าที่แก้ไขข้อพิพาท
- เจ้าหน้าที่ Moderation

## 2.2 บทบาทในบัญชีเดียว

ผู้ใช้หนึ่งรายสามารถมีหลายบทบาทในบัญชีเดียว เช่น เป็นผู้ซื้อ ผู้รับพิมพ์ และผู้ขายเครื่องพร้อมกัน ระบบต้องใช้สิทธิแบบ Role-based และ Permission-based ไม่ผูกสิทธิเข้ากับหน้าจอเพียงอย่างเดียว

บทบาทเริ่มต้น:

- `BUYER`
- `DESIGN_PROVIDER`
- `PRINT_PROVIDER`
- `FULL_SERVICE_PROVIDER`
- `PRODUCT_SELLER`
- `CONTENT_CREATOR`
- `SUPPORT_AGENT`
- `KYC_REVIEWER`
- `FINANCE_ADMIN`
- `MODERATOR`
- `PLATFORM_ADMIN`

## 2.3 สมมติฐาน

- ผู้ใช้ส่วนใหญ่เข้าผ่านโทรศัพท์มือถือ
- ภาษาเริ่มต้นคือภาษาไทยและรองรับภาษาอังกฤษ
- สกุลเงินเริ่มต้นคือบาทไทย
- หน่วยขนาดมาตรฐานคือมิลลิเมตร
- ระบบต้องรองรับ PromptPay QR ผ่าน Payment Gateway ที่มี API และ Webhook
- ไฟล์งานอาจมีขนาดใหญ่กว่าข้อมูลทั่วไปมาก จึงต้องจัดเก็บใน Object Storage ไม่เก็บ Binary ในฐานข้อมูล
- การวิเคราะห์ไฟล์หรือ Slicing อาจใช้เวลานาน จึงต้องทำแบบ Background Job
- การรับงานทันทีต้องมี Capacity และ Pricing Profile ที่ผู้ให้บริการกำหนดไว้

## 2.4 ข้อจำกัด

- เฟส 1 ไม่ควบคุมเครื่องพิมพ์จากระยะไกล
- เฟส 1 ไม่สร้าง Wallet หรือระบบถือเงินโดยตรงนอกกรอบ Payment Provider
- เฟส 1 ไม่รองรับ Live Streaming
- เฟส 1 เริ่มจากเทคโนโลยีและไฟล์ที่ทีมสามารถทดสอบคุณภาพได้
- ระบบต้องไม่ยึด Business Workflow ไว้ใน Firestore Security Rules หรือ Firebase Trigger เพียงอย่างเดียว

---

# 3. กลยุทธ์สถาปัตยกรรมและการลด Vendor Lock-in

## 3.1 หลักการบังคับ

1. Frontend ห้ามเข้าถึง Firestore โดยตรงสำหรับข้อมูลธุรกรรมหลัก
2. Frontend เรียก Backend ผ่าน REST API ที่มี OpenAPI Specification
3. Firebase SDK ฝั่ง Client ใช้เฉพาะความสามารถที่จำเป็น เช่น Authentication, App Check และ Push Token
4. Domain Model ห้าม import ชนิดข้อมูลของ Firebase เช่น `DocumentReference`, `Timestamp`, `GeoPoint` หรือ `FieldValue`
5. Business Logic ต้องอยู่ใน Application/Domain Service ไม่อยู่ใน Security Rules หรือ Database Trigger
6. ทุก Data Store ต้องถูกเรียกผ่าน Repository Interface
7. ทุกบริการภายนอกต้องถูกเรียกผ่าน Port/Adapter เช่น Payment, Storage, Search, Notification และ Queue
8. Identifier ภายในระบบต้องเป็น UUID ที่ระบบสร้างเอง ไม่ใช้ Firebase UID หรือ Firestore Auto ID เป็น Primary Business ID
9. API ต้องรับและส่งข้อมูลด้วยชนิดข้อมูลมาตรฐาน JSON
10. ต้องมี Export Format กลางที่นำเข้า PostgreSQL หรือ MongoDB ได้โดยไม่ต้องตีความข้อมูล Firebase

## 3.2 รูปแบบสถาปัตยกรรม

ใช้แนวทาง Modular Monolith ร่วมกับ Clean Architecture/Hexagonal Architecture ในเฟส 1 เพื่อควบคุมความซับซ้อน และเปิดทางแยกเป็นบริการย่อยเมื่อปริมาณงานเพิ่มขึ้น

```text
Web/PWA               Mobile App (Phase 2)
   |                         |
   +------ REST/JSON API ----+
               |
        API / Application Layer
               |
   +-----------+-----------+----------------+
   |           |           |                |
Identity    Marketplace  Orders/Payment   Content/Commerce
Module       Module        Module            Module
   |           |           |                |
   +----------- Domain Interfaces ----------+
               |
        Infrastructure Adapters
   +-----------+-----------+----------------+
   |           |           |                |
Firestore   Storage     Payment Gateway   Notification
Adapter     Adapter         Adapter           Adapter
   |
Cloud Firestore (Phase 1)
PostgreSQL or MongoDB Adapter (Future)
```

## 3.3 ชั้นของระบบ

### Presentation Layer

- Web/PWA
- Mobile App
- Admin Portal
- REST Controllers
- Request/Response DTO

### Application Layer

- Use Cases
- Authorization Policy
- Transaction Orchestration
- Validation
- Pricing Workflow
- Order State Machine
- Content Moderation Workflow

### Domain Layer

- Entity
- Value Object
- Domain Event
- Repository Interface
- Domain Service
- Business Rule

### Infrastructure Layer

- Firestore Repository Adapter
- PostgreSQL Repository Adapter ในอนาคต
- MongoDB Repository Adapter ในอนาคต
- Firebase Auth Adapter
- Cloud Storage Adapter
- Payment Adapter
- Notification Adapter
- Search Adapter
- Queue Adapter

## 3.4 การตัดสินใจฐานข้อมูลเฟส 1

เฟส 1 ใช้ Cloud Firestore เป็น Primary Operational Database เนื่องจากเหมาะกับการเริ่มต้น Mobile/Web รองรับการขยายตัวและลดงานดูแลระบบ แต่ระบบต้องปฏิบัติตามข้อกำหนดต่อไปนี้:

- ใช้ Top-level Collection สำหรับ Entity หลัก
- หลีกเลี่ยง Subcollection สำหรับข้อมูลธุรกิจที่ต้องย้ายหรือ Query ข้าม Entity
- ไม่เก็บความสัมพันธ์ด้วย Firestore DocumentReference
- ไม่เก็บ Array ที่เติบโตไม่จำกัด
- ไม่ใช้ Auto ID เป็น Business ID
- ไม่พึ่ง Realtime Listener ใน Domain Workflow
- ไม่ใช้ Firestore Trigger เป็นกลไกเดียวของธุรกรรมสำคัญ
- ไม่ออกแบบ Denormalization ที่ไม่มีแหล่งข้อมูลต้นทางชัดเจน

## 3.5 ขอบเขตการใช้ Firebase

| บริการ | การใช้งานเฟส 1 | แนวทางลด Lock-in |
|---|---|---|
| Firebase Authentication | Login และ Token Verification | มี Internal User ID และ Identity Mapping แยกจาก Firebase UID |
| Cloud Firestore | Operational Data Store | Repository Adapter และ Canonical Schema |
| Cloud Storage for Firebase | ไฟล์โมเดล รูป วิดีโอ เอกสาร | FileAsset Metadata และ Storage Adapter |
| Cloud Functions 2nd Gen | REST API, Webhook, Background Worker | Framework-independent Handler และ Container-ready Code |
| Firebase Hosting/App Hosting | Web/PWA | Build Artifact ต้อง Deploy ไป CDN/Host อื่นได้ |
| Firebase Cloud Messaging | Push Notification | Notification Provider Interface และเก็บ Device Token แบบกลาง |
| Firebase App Check | ลดการเรียก API จาก Client ที่ไม่ได้รับอนุญาต | Backend รับ App Check ผ่าน Verification Adapter |
| Firebase Emulator Suite | Integration Test และ CI | Test Domain/Use Case ได้โดยไม่ต้องใช้ Emulator ด้วย |
| Analytics/Crash Reporting | Telemetry | Event Naming กลางและ Export ได้ |

## 3.6 Internal User ID และ Identity Mapping

ระบบต้องไม่ใช้ Firebase Authentication UID เป็น ID หลักของผู้ใช้

ตัวอย่าง:

```json
{
  "userId": "0197f26e-3c47-7af8-a9c3-82e4fb0f45c1",
  "provider": "FIREBASE_AUTH",
  "providerUserId": "firebase_uid_xxx",
  "email": "user@example.com"
}
```

เมื่อเปลี่ยนระบบ Authentication ในอนาคต ให้เพิ่ม Identity Provider ใหม่โดยไม่เปลี่ยน Foreign Key ของข้อมูลธุรกิจทั้งหมด

## 3.7 API-first

- API ต้องมี Version เช่น `/api/v1`
- มี OpenAPI 3.x Specification ใน Repository
- Frontend ใช้ Generated Client หรือ Shared API Contract
- ไม่ส่ง Firestore Snapshot หรือ Firebase-specific Object ออกนอก Infrastructure Layer
- Error Response ต้องเป็นรูปแบบเดียวกัน
- รองรับ Idempotency Key สำหรับ Payment, Order และ Webhook
- รองรับ Pagination แบบ Cursor ที่เป็น Opaque Token ไม่เปิดเผย Firestore Cursor โดยตรง

## 3.8 Event และ Outbox

ทุกเหตุการณ์ธุรกิจสำคัญต้องบันทึกใน `outbox_events` ภายในการเขียนเดียวกับสถานะหลักเท่าที่ฐานข้อมูลรองรับ เช่น:

- `ORDER_CREATED`
- `PAYMENT_CONFIRMED`
- `PRODUCTION_STARTED`
- `SHIPMENT_CREATED`
- `ORDER_COMPLETED`
- `DISPUTE_OPENED`

Background Worker อ่าน Outbox แล้วส่ง Notification อัปเดต Search Index หรือส่ง Analytics การใช้ Outbox ช่วยให้ย้าย Event Bus หรือฐานข้อมูลได้โดยไม่พึ่ง Firestore Trigger โดยตรง

---

# 4. เทคโนโลยีที่แนะนำ

## 4.1 Frontend เฟส 1

- TypeScript
- Next.js หรือ Framework Web ที่รองรับ SSR/PWA
- Responsive Mobile-first Design
- PWA Manifest และ Service Worker
- API Client จาก OpenAPI
- 3D Viewer ที่รองรับ STL/OBJ/3MF ตามความเหมาะสม
- Resumable File Upload

## 4.2 Mobile App เฟส 2

เลือก Flutter หรือ React Native โดยต้อง:

- ใช้ REST API ชุดเดียวกับ Web
- ไม่เรียก Firestore โดยตรงสำหรับ Business Data
- ใช้ Firebase Auth/App Check/FCM ผ่าน Adapter ฝั่ง Application
- รองรับ Deep Link, Push, Camera และ Background Upload

## 4.3 Backend

- TypeScript บน Node.js Runtime
- Cloud Functions 2nd Gen สำหรับ REST API และ Webhook
- Cloud Run สำหรับงานที่ต้องใช้ Container, Native Binary, Slicer หรือใช้เวลานาน
- OpenAPI
- Schema Validation เช่น JSON Schema/Zod โดยไม่ให้ Schema ผูกกับ Firestore
- Structured Logging

## 4.4 Database และ Storage

- Cloud Firestore เป็นฐานข้อมูลเริ่มต้น
- Cloud Storage for Firebase เป็น Object Storage เริ่มต้น
- Export Pipeline สร้าง JSONL/NDJSON และ Manifest แบบ Portable
- รองรับ PostgreSQL และ MongoDB Adapter ภายหลัง

---

# 5. ข้อกำหนดเชิงหน้าที่: Identity และ Account

## FR-ID-001 สมัครสมาชิก

ระบบต้องรองรับการสมัครด้วย:

- Email และ Password
- Google Sign-in
- Apple Sign-in สำหรับ Mobile App ตามข้อกำหนดแพลตฟอร์ม
- เบอร์โทรศัพท์เมื่อเปิดใช้งานตามความเหมาะสม

## FR-ID-002 Login และ Session

- Client รับ ID Token จาก Firebase Authentication
- Backend ตรวจสอบ Token ทุก Request ที่ต้องยืนยันตัวตน
- Backend แปลง Firebase UID เป็น Internal User ID
- Token ที่ไม่มี Identity Mapping ต้องถูกสร้าง Mapping ผ่าน Onboarding Flow

## FR-ID-003 โปรไฟล์ผู้ใช้

ผู้ใช้แก้ไขข้อมูลต่อไปนี้ได้:

- ชื่อแสดงผล
- รูปโปรไฟล์
- ภาษา
- เบอร์โทรศัพท์
- ที่อยู่
- จังหวัด
- ข้อมูลธุรกิจ
- การตั้งค่าการแจ้งเตือน
- การตั้งค่าความเป็นส่วนตัว

## FR-ID-004 หลายบทบาท

- ผู้ใช้เปิดบทบาทใหม่ได้
- บางบทบาทต้องผ่าน KYC หรือ Business Verification
- Backend ตรวจ Permission ทุก Operation
- Frontend ซ่อนหรือแสดงเมนูตาม Permission แต่ไม่ถือเป็นการรักษาความปลอดภัยหลัก

## FR-ID-005 KYC

สถานะ KYC:

- `NOT_STARTED`
- `PENDING`
- `NEEDS_MORE_INFO`
- `APPROVED`
- `REJECTED`
- `SUSPENDED`

ระบบต้องแยกข้อมูล KYC ที่ละเอียดอ่อนออกจากโปรไฟล์สาธารณะ และจำกัดสิทธิเข้าถึงเฉพาะเจ้าหน้าที่ที่เกี่ยวข้อง

## FR-ID-006 องค์กรและทีม

บัญชีธุรกิจสามารถ:

- สร้างองค์กร
- เชิญสมาชิก
- กำหนดบทบาทในองค์กร
- มีหลายสาขา
- กำหนดสิทธิด้านคำสั่งซื้อ การเงิน และสินค้า

---

# 6. ข้อกำหนดเชิงหน้าที่: Provider และเครื่องพิมพ์

## FR-PRO-001 ประเภทบริการ

ผู้ให้บริการเปิดหรือปิดบริการได้แยกกัน:

- `DESIGN_ONLY`
- `PRINT_ONLY`
- `DESIGN_AND_PRINT`

## FR-PRO-002 โปรไฟล์บริการ

ข้อมูลประกอบด้วย:

- ชื่อบริการ
- คำอธิบาย
- หมวดหมู่
- ราคาเริ่มต้น
- ระยะเวลาตอบกลับ
- รอบแก้ไข
- พื้นที่บริการ
- Portfolio
- วัสดุหรือเทคโนโลยีที่เชี่ยวชาญ
- สถานะพร้อมรับงาน

## FR-PRO-003 เครื่องพิมพ์

ผู้ให้บริการจัดการเครื่องได้ โดยข้อมูลขั้นต่ำประกอบด้วย:

- ยี่ห้อและรุ่น
- เทคโนโลยี เช่น FDM หรือ Resin
- Build Volume กว้าง ยาว สูง
- จำนวนเครื่องรุ่นเดียวกัน
- ขนาดหัวฉีดหรือค่าที่เกี่ยวข้อง
- Layer Height ที่รองรับ
- วัสดุที่รองรับ
- สถานะเครื่อง
- Capacity ต่อวัน
- Instant Order Enabled

## FR-PRO-004 Material Capability

ผู้ให้บริการกำหนด:

- ประเภทวัสดุ
- Brand หรือ Grade ถ้ามี
- สี
- ราคาอ้างอิง
- Stock Status
- ความพร้อมสำหรับ Instant Quote
- คุณสมบัติ เช่น ทนร้อน ทน UV หรือยืดหยุ่น

## FR-PRO-005 Capacity

ระบบต้องรองรับ:

- ชั่วโมงที่พร้อมรับงานต่อวัน
- คิวงานปัจจุบัน
- วันหยุด
- Maintenance Window
- Max Concurrent Jobs
- Auto Pause เมื่อ Capacity เต็ม

## FR-PRO-006 ระดับความน่าเชื่อถือ

- Basic Verified
- Identity Verified
- Business Verified
- Quality Verified
- Official Store

ระดับต้องคำนวณจากข้อมูลจริงและการตรวจสอบ ไม่ให้ผู้ขายซื้อ Badge คุณภาพโดยตรง

---

# 7. ข้อกำหนดเชิงหน้าที่: File และ Asset

## FR-FILE-001 ประเภทไฟล์

เฟส 1 ต้องรองรับ:

- STL
- OBJ
- 3MF
- รูปภาพ JPG, PNG, WebP
- วิดีโอ MP4 ตามขนาดที่กำหนด
- PDF
- ZIP สำหรับชุดไฟล์
- STEP ผ่าน Manual Quote หรือ Analysis Service ที่รองรับ

## FR-FILE-002 Upload Session

Client ต้องขอ Upload Session จาก Backend ก่อนอัปโหลด โดย Backend ส่งกลับ:

- `assetId`
- Upload URL หรือ Upload Token แบบ Opaque
- ขนาดสูงสุด
- MIME Type ที่อนุญาต
- วันหมดอายุ

Client ต้องไม่สร้าง Storage Path เอง

## FR-FILE-003 File Metadata

ทุกไฟล์ต้องมี Metadata กลาง:

- Asset ID
- Owner User ID
- Organization ID ถ้ามี
- Purpose
- Original Filename
- MIME Type
- Size Bytes
- Checksum SHA-256
- Storage Provider
- Object Key
- Visibility
- Malware Scan Status
- Processing Status
- Retention Policy

## FR-FILE-004 การวิเคราะห์ไฟล์

ระบบต้องประเมินข้อมูลเมื่อทำได้:

- Bounding Box
- Unit/Scale
- Mesh Integrity
- Triangle Count
- Volume
- Surface Area
- Watertight Status
- Estimated Support
- Possible Orientation
- Printer Compatibility

## FR-FILE-005 ความเป็นส่วนตัว

สถานะไฟล์:

- `PRIVATE`
- `ORDER_PARTICIPANTS`
- `ORGANIZATION`
- `PUBLIC_PREVIEW`

ไฟล์ต้นฉบับต้องเป็น Private โดยค่าเริ่มต้น

## FR-FILE-006 Retention

ระบบต้องกำหนดอายุไฟล์ตามประเภท เช่น:

- ไฟล์งานที่ยังไม่สั่งซื้อ
- ไฟล์คำสั่งซื้อ
- ไฟล์ส่งมอบ
- หลักฐานข้อพิพาท
- Public Content

การลบต้องเป็นแบบ Soft-delete ใน Metadata ก่อน และลบ Object จริงตาม Scheduled Job

---

# 8. ข้อกำหนดเชิงหน้าที่: Service Request และ Proposal

## FR-JOB-001 สร้างคำขอรับบริการ

ผู้ซื้อเลือก:

- มีไฟล์พร้อมพิมพ์
- มีไฟล์แต่ต้องแก้ไข
- มีรูปหรือแบบร่าง
- มีชิ้นงานตัวอย่าง
- มีเพียงแนวคิด

และเลือกประเภทบริการหนึ่งในสามแบบ

## FR-JOB-002 รายละเอียดงาน

- ชื่องาน
- รายละเอียด
- หมวดหมู่
- วัตถุประสงค์
- จำนวน
- งบประมาณ
- วันที่ต้องการ
- จังหวัดหรือวิธีรับสินค้า
- ความลับ/NDA
- ไฟล์แนบ

## FR-JOB-003 การเผยแพร่งาน

งานสามารถเป็น:

- Public Job
- Invite-only Job
- Private Direct Request
- Organization Internal Request

## FR-JOB-004 Proposal

ผู้ให้บริการเสนอ:

- ราคา
- ระยะเวลา
- วัสดุและเทคโนโลยี
- จำนวนรอบแก้ไข
- Deliverable
- เงื่อนไข
- Expiration Date
- Milestone

## FR-JOB-005 Versioning

Proposal ทุกครั้งที่แก้ไขต้องมี Version และไม่เขียนทับข้อเสนอที่ผู้ซื้อเคยเห็นหรืออนุมัติ

## FR-JOB-006 การเลือก Proposal

เมื่อเลือก Proposal:

- ระบบล็อก Version ที่เลือก
- สร้าง Order Draft
- สร้าง Payment Intent
- ปิด Proposal อื่นเมื่อชำระสำเร็จ

---

# 9. ข้อกำหนดเชิงหน้าที่: Instant Pricing

## FR-PRICE-001 Eligibility Check

ระบบต้องตรวจ:

- ไฟล์ผ่าน Analysis
- ขนาดอยู่ใน Build Volume
- วัสดุและสีรองรับ
- Printer และ Pricing Profile เปิดใช้งาน
- Capacity เพียงพอ
- ไม่มีข้อกำหนดพิเศษ
- วันที่ต้องการเป็นไปได้

## FR-PRICE-002 Pricing Profile

ผู้ขายกำหนด Profile ที่มี Version ได้แก่:

- Minimum Order Fee
- Material Cost per Unit
- Machine Hour Rate
- Setup Fee
- Support Multiplier
- Layer Height Multiplier
- Post-processing Fee
- Failure Risk Buffer
- Rush Fee
- Quantity Discount
- Packaging Fee
- Platform Fee Handling Rule

## FR-PRICE-003 Pricing Engine

Pricing Engine ต้องเป็น Pure Domain Service และรับ Input แบบ Canonical DTO ไม่เรียก Firestore โดยตรง

ตัวอย่าง Input:

```json
{
  "modelMetrics": {
    "volumeMm3": 38250,
    "boundingBoxMm": {"x": 80, "y": 45, "z": 35},
    "estimatedMaterialGram": 52,
    "estimatedPrintMinutes": 310
  },
  "quantity": 2,
  "materialCode": "PLA",
  "qualityCode": "STANDARD",
  "rush": false,
  "pricingProfileVersion": 7
}
```

## FR-PRICE-004 Quote Snapshot

ราคาที่แสดงต้องบันทึก Snapshot ประกอบด้วย:

- Input ที่ใช้คำนวณ
- Formula Version
- Pricing Profile Version
- Currency
- Line Items
- Taxes
- Platform Fee
- Expiration
- Provider Capacity Snapshot

## FR-PRICE-005 Fallback

หาก Analysis หรือ Pricing ไม่สำเร็จ ระบบต้องเปลี่ยน Flow เป็น Manual Quote โดยเก็บข้อมูลที่กรอกแล้วทั้งหมด

## FR-PRICE-006 Price Lock

หลังชำระสำเร็จ ราคาต้องไม่เปลี่ยน เว้นแต่ผู้ซื้อยอมรับ Change Request ใหม่

---

# 10. ข้อกำหนดเชิงหน้าที่: Order และ Workflow

## FR-ORD-001 ประเภท Order

- Service Order
- Product Order
- Mixed Order ไม่อยู่ใน MVP เว้นแต่ทีมธุรกิจอนุมัติ

## FR-ORD-002 Order State Machine

สถานะ Service Order:

- `DRAFT`
- `AWAITING_PAYMENT`
- `PAID`
- `PROVIDER_CONFIRMATION`
- `FILE_PREPARATION`
- `DESIGN_IN_PROGRESS`
- `AWAITING_DESIGN_APPROVAL`
- `QUEUED_FOR_PRINT`
- `PRINTING`
- `POST_PROCESSING`
- `QUALITY_CHECK`
- `READY_TO_SHIP`
- `SHIPPED`
- `DELIVERED`
- `COMPLETED`
- `DISPUTED`
- `CANCELLED`
- `REFUNDED`

การเปลี่ยนสถานะต้องผ่าน Transition Rule ที่ Backend เท่านั้น

## FR-ORD-003 Order Snapshot

Order ต้องเก็บ Snapshot ของ:

- Buyer
- Provider
- ที่อยู่
- ราคา
- Proposal หรือ Instant Quote
- Material
- Printer Capability ที่เลือก
- Deliverable
- เงื่อนไข

เพื่อป้องกันข้อมูลย้อนหลังเปลี่ยนตามโปรไฟล์ปัจจุบัน

## FR-ORD-004 Milestone

งานออกแบบรองรับ:

- ชื่อ Milestone
- Amount
- Due Date
- Status
- Deliverable Assets
- Revision Count
- Approval

## FR-ORD-005 Change Request

เมื่อมีการเปลี่ยน Scope:

- สร้าง Change Request
- ระบุผลต่อราคาและกำหนดส่ง
- ผู้ซื้ออนุมัติ
- สร้าง Payment เพิ่มหรือลด
- อัปเดต Order Version

## FR-ORD-006 Production Update

ผู้ขายเพิ่ม Update พร้อมรูปหรือวิดีโอได้ โดยมีประเภท:

- File Prepared
- Print Started
- Progress
- Print Completed
- Quality Check
- Packed
- Problem Found

---

# 11. ข้อกำหนดเชิงหน้าที่: Payment, Refund และ Payout

## FR-PAY-001 Payment Provider Abstraction

Backend ต้องเรียก Payment ผ่าน `PaymentGatewayPort` ไม่เรียก SDK ของผู้ให้บริการจาก Domain Layer

## FR-PAY-002 ช่องทางชำระเงิน

- PromptPay QR
- Mobile Banking เมื่อ Gateway รองรับ
- Credit/Debit Card
- Bank Transfer แบบตรวจสอบผ่านระบบเมื่ออนุมัติ

## FR-PAY-003 Payment Intent

- สร้าง Payment Intent พร้อม Idempotency Key
- บันทึก Provider Reference
- บันทึก Amount, Currency และ Expiration
- ไม่เก็บข้อมูลบัตรเต็มรูปแบบ

## FR-PAY-004 Webhook

- ตรวจ Signature
- รองรับ Event ซ้ำ
- บันทึก Raw Event แบบจำกัดสิทธิ
- ใช้ Idempotency ป้องกันการอัปเดตซ้ำ
- ไม่เชื่อ Client Redirect เป็นหลักฐานชำระเงิน

## FR-PAY-005 Refund

- Full Refund
- Partial Refund
- Refund จากการยกเลิก
- Refund จากข้อพิพาท
- เก็บเหตุผล ผู้อนุมัติ และ Provider Reference

## FR-PAY-006 Payout

- ยอดรอรับ
- ยอดพักระหว่างตรวจรับ
- ยอดพร้อมจ่าย
- ค่าธรรมเนียม
- Withholding/Tax Metadata ถ้ามี
- Payout Batch
- Payout Failure และ Retry

---

# 12. ข้อกำหนดเชิงหน้าที่: Shipping

## FR-SHIP-001 วิธีส่งมอบ

- Courier
- นัดรับหน้าร้าน
- Messenger ในพื้นที่
- Digital Delivery สำหรับงานออกแบบ

## FR-SHIP-002 Shipment

ข้อมูล:

- Carrier
- Tracking Number
- Shipping Fee
- Sender Address Snapshot
- Receiver Address Snapshot
- Package Size/Weight
- Status
- Tracking Events

## FR-SHIP-003 Proof

ผู้ขายแนบรูปบรรจุภัณฑ์และหลักฐานส่งของได้ ผู้ซื้อยืนยันรับสินค้าได้

---

# 13. ข้อกำหนดเชิงหน้าที่: Review, Content และ Community

## FR-CONT-001 สร้างคอนเทนต์

ผู้ซื้อและผู้ขายสร้าง:

- รีวิว
- Showcase
- Before/After
- Process Post
- Time-lapse
- Tutorial
- รีวิวเครื่อง
- รีวิววัสดุ
- Case Study
- Promotion

## FR-CONT-002 รูปแบบ

- Text
- Image
- Video
- Carousel
- Tag ร้าน
- Tag บริการ
- Tag สินค้า
- Tag เครื่องหรือวัสดุ
- Hashtag

## FR-CONT-003 Verified Purchase

คอนเทนต์หรือรีวิวที่เชื่อมกับ Order สำเร็จต้องมี Verified Badge และ Backend ต้องตรวจสิทธิผู้เขียนกับ Order

## FR-CONT-004 Engagement

- Like
- Comment
- Save
- Follow
- Share Link
- Report

Like, Follow และ Save ต้องเก็บเป็น Relationship Entity ไม่เก็บ User ID เป็น Array ที่โตไม่จำกัดใน Post Document

## FR-CONT-005 Permission ของผลงาน

ผู้ขายเผยแพร่ผลงานลูกค้าได้เมื่อมี Consent Record ที่ชัดเจน

## FR-CONT-006 Moderation

- Report Reason
- Automated Flag
- Human Review
- Hide
- Remove
- Restore
- Warning
- Account Restriction
- Appeal

## FR-CONT-007 Sponsored Content

- Campaign
- Placement
- Start/End Date
- Budget
- Targeting แบบไม่ใช้ข้อมูลอ่อนไหว
- Sponsored Label
- Impression/Click Metrics

คะแนนรีวิวจริงต้องแยกจากการโปรโมต

---

# 14. ข้อกำหนดเชิงหน้าที่: Product Marketplace

## FR-COM-001 หมวดสินค้า

- 3D Printer ใหม่
- 3D Printer มือสอง
- Refurbished
- Filament
- Resin
- Spare Parts
- Tools
- Post-processing Equipment
- Safety Equipment

## FR-COM-002 Product Listing

- Seller
- Category
- Brand
- Model
- Condition
- Description
- Specifications
- Price
- Stock
- Location
- Shipping Options
- Warranty
- Media
- Status

## FR-COM-003 Used Printer Checklist

- อายุเครื่อง
- ชั่วโมงพิมพ์โดยประมาณ
- ประวัติซ่อม
- อะไหล่ที่เปลี่ยน
- Known Defects
- Serial Number แบบปกปิดบางส่วนต่อสาธารณะ
- Print Test
- Video Proof

## FR-COM-004 Product Order

- Product Variant
- Quantity
- Price Snapshot
- Shipping
- Payment
- Delivery
- Review
- Dispute

## FR-COM-005 Promotion

- Pinned Product
- Featured Store
- Sponsored Search
- Campaign Placement

---

# 15. ข้อกำหนดเชิงหน้าที่: Search และ Discovery

## FR-SEARCH-001 ขอบเขตค้นหา

- Provider
- Service
- Job
- Content
- Product
- Printer Model

## FR-SEARCH-002 Filter

- จังหวัด
- ระยะทาง
- ราคา
- Rating
- Material
- Technology
- Build Volume
- Instant Order
- Delivery Time
- Verification Level
- Tax Invoice Availability

## FR-SEARCH-003 Search Abstraction

ระบบต้องมี `SearchPort` และ `SearchDocument` แบบกลาง การค้นหาเฟสแรกอาจใช้ Firestore Index และ Token แบบง่าย แต่ต้องสามารถเปลี่ยนเป็น PostgreSQL Full Text Search, MongoDB Search, Meilisearch, Typesense หรือ Search Engine อื่นได้

## FR-SEARCH-004 Ranking

Organic Ranking และ Sponsored Ranking ต้องแยกกัน โดย Organic ใช้:

- ความเกี่ยวข้อง
- Compatibility
- Quality Score
- Delivery Performance
- Response Time
- Distance
- Price Range

---

# 16. ข้อกำหนดเชิงหน้าที่: Notification

## FR-NOTI-001 ช่องทาง

- In-app
- Email
- PWA Push
- Mobile Push
- LINE Notification เมื่อเปิดใช้

## FR-NOTI-002 Event

- Proposal ใหม่
- Quote ใกล้หมดอายุ
- Payment Confirmed
- Order Status Changed
- Message ใหม่
- Design Approval Required
- Shipment Update
- Review Reminder
- Dispute Update
- Promotion Result

## FR-NOTI-003 Abstraction

ใช้ `NotificationPort` และ Template ID แบบกลาง ไม่ให้ Domain รู้จัก FCM Payload โดยตรง

---

# 17. ข้อกำหนดเชิงหน้าที่: Admin และ Back Office

## FR-ADM-001 Dashboard

- User Growth
- Active Provider
- Job และ Order
- GMV
- Revenue
- Refund
- Dispute
- Content Report
- Product Report
- System Health

## FR-ADM-002 User Management

- ดูสถานะ
- Suspend
- Reinstate
- Role Management ตามสิทธิ
- KYC Review
- Audit Trail

## FR-ADM-003 Order Operations

- ดู Timeline
- ตรวจ Payment
- Freeze Payout
- Assist Cancellation
- Resolve Dispute

## FR-ADM-004 Configuration

- Category
- Material Catalog
- Printer Catalog
- Fee Rule
- Promotion Placement
- Feature Flag
- Content Policy
- Prohibited Item Rule

## FR-ADM-005 Audit

ทุก Administrative Action ต้องบันทึก:

- Actor
- Action
- Target
- Before/After Summary
- Reason
- Timestamp
- Request ID

---

# 18. แบบจำลองข้อมูลกลาง

## 18.1 กฎมาตรฐานของ Entity

ทุก Entity หลักต้องมี:

```json
{
  "id": "UUIDv7 string",
  "schemaVersion": 1,
  "version": 1,
  "createdAt": "RFC3339 timestamp",
  "updatedAt": "RFC3339 timestamp",
  "deletedAt": null
}
```

ข้อกำหนด:

- API ใช้ RFC3339/ISO-8601 UTC
- Firestore Adapter แปลงเป็น Firestore Timestamp ภายในได้
- PostgreSQL ใช้ `timestamptz`
- MongoDB ใช้ BSON Date
- Money เก็บเป็นจำนวนเต็มหน่วยย่อย เช่น สตางค์
- Currency ใช้ ISO 4217 เช่น `THB`
- ห้ามใช้ Floating Point เก็บเงิน
- Location เก็บ `latitude` และ `longitude` เป็นตัวเลข ไม่ใช้ Firebase GeoPoint ใน Domain
- Reference เก็บเป็น ID String ไม่ใช้ DocumentReference
- Flexible Attribute ใช้ `metadata` หรือ `attributes` ที่มี Schema Version
- Array ต้องเป็นข้อมูลขนาดเล็กและมีขอบเขต เช่น Roles; ความสัมพันธ์จำนวนมากใช้ Collection แยก

## 18.2 รายการ Entity หลัก

| Domain | Entity/Collection | วัตถุประสงค์ |
|---|---|---|
| Identity | users | ผู้ใช้ภายในระบบ |
| Identity | user_identities | Mapping Firebase UID หรือ Provider อื่น |
| Identity | user_roles | บทบาทและ Scope |
| Identity | organizations | บริษัทหรือร้าน |
| Identity | organization_members | สมาชิกองค์กร |
| Identity | addresses | ที่อยู่แบบใช้ซ้ำได้ |
| Trust | verification_cases | KYC/Business Verification |
| Provider | provider_profiles | โปรไฟล์ผู้ให้บริการ |
| Provider | provider_services | บริการสามประเภท |
| Provider | printers | เครื่องพิมพ์ |
| Provider | printer_capabilities | ความสามารถเครื่อง |
| Provider | materials | Master Material Catalog |
| Provider | provider_materials | วัสดุ/สีของผู้ให้บริการ |
| Provider | pricing_profiles | สูตรราคาแบบ Versioned |
| Provider | capacity_slots | Capacity และวันว่าง |
| File | file_assets | Metadata ของไฟล์ทั้งหมด |
| File | model_analyses | ผลวิเคราะห์ไฟล์ |
| Jobs | service_requests | งานที่ผู้ซื้อประกาศ |
| Jobs | proposals | ข้อเสนอราคา |
| Jobs | proposal_milestones | Milestone ในข้อเสนอ |
| Pricing | instant_quotes | Quote อัตโนมัติแบบ Snapshot |
| Orders | orders | คำสั่งซื้อ |
| Orders | order_items | รายการใน Order |
| Orders | order_participants | ผู้มีสิทธิใน Order |
| Orders | order_milestones | Milestone ที่ใช้งานจริง |
| Orders | order_status_events | Timeline สถานะ |
| Orders | production_updates | หลักฐานการผลิต |
| Messaging | conversations | ห้องสนทนา |
| Messaging | conversation_members | สมาชิกห้อง |
| Messaging | messages | ข้อความ |
| Payment | payment_intents | รายการเรียกเก็บเงิน |
| Payment | payment_events | Webhook/Event จาก Gateway |
| Payment | refunds | คืนเงิน |
| Payment | payouts | จ่ายเงินผู้ขาย |
| Shipping | shipments | การจัดส่ง |
| Shipping | shipment_events | Tracking Event |
| Trust | reviews | รีวิวคำสั่งซื้อ |
| Trust | disputes | ข้อพิพาท |
| Trust | dispute_events | Timeline ข้อพิพาท |
| Content | posts | คอนเทนต์ |
| Content | post_media | สื่อในโพสต์ |
| Content | comments | ความคิดเห็น |
| Content | reactions | Like/Reaction |
| Content | follows | ความสัมพันธ์ Follow |
| Content | saved_items | บันทึกโพสต์หรือสินค้า |
| Commerce | products | สินค้า |
| Commerce | product_variants | ตัวเลือกสินค้า |
| Commerce | inventories | Stock |
| Promotion | promotion_campaigns | แคมเปญโปรโมต |
| Promotion | promotion_placements | ตำแหน่งและผลลัพธ์ |
| Subscription | subscriptions | แพ็กเกจผู้ขาย/ธุรกิจ |
| Notification | notifications | In-app Notification |
| Notification | notification_endpoints | Push Token/Email Endpoint |
| Moderation | reports | รายงานเนื้อหาหรือบัญชี |
| Moderation | moderation_cases | การพิจารณา |
| System | outbox_events | Domain Event รอประมวลผล |
| System | idempotency_records | ป้องกัน Operation ซ้ำ |
| System | audit_logs | Audit Trail |
| System | feature_flags | เปิดปิดฟีเจอร์ |

## 18.3 Firestore Collection Strategy

Collection ทั้งหมดเป็น Top-level และใช้ Document ID เท่ากับ Canonical Entity ID ตัวอย่าง:

```text
/users/{userId}
/user_identities/{identityId}
/provider_profiles/{providerId}
/printers/{printerId}
/service_requests/{requestId}
/proposals/{proposalId}
/orders/{orderId}
/order_status_events/{eventId}
/posts/{postId}
/comments/{commentId}
/products/{productId}
```

ห้ามใช้โครงสร้างหลักแบบ:

```text
/users/{userId}/orders/{orderId}/messages/{messageId}
```

เนื่องจากย้ายข้อมูล Query และควบคุม Lifecycle ยากกว่า ให้ใช้ Top-level พร้อม `userId`, `orderId`, `conversationId`

## 18.4 ตัวอย่าง User

```json
{
  "id": "0197f26e-3c47-7af8-a9c3-82e4fb0f45c1",
  "displayName": "Somchai Maker",
  "emailNormalized": "somchai@example.com",
  "phoneE164": "+66812345678",
  "locale": "th-TH",
  "status": "ACTIVE",
  "roles": ["BUYER", "PRINT_PROVIDER"],
  "profileImageAssetId": "0197f...",
  "schemaVersion": 1,
  "version": 4,
  "createdAt": "2026-06-27T08:00:00Z",
  "updatedAt": "2026-06-27T09:00:00Z",
  "deletedAt": null
}
```

## 18.5 ตัวอย่าง Printer

```json
{
  "id": "0197f311-1017-7d00-bd91-a2c785003002",
  "providerId": "0197f2fc-9f67-78d2-bc05-c3a3201ee204",
  "brandCode": "BAMBU_LAB",
  "modelCode": "P1S",
  "technologyCode": "FDM",
  "buildVolumeMm": {"x": 256, "y": 256, "z": 256},
  "quantity": 3,
  "status": "AVAILABLE",
  "instantOrderEnabled": true,
  "attributes": {"enclosure": true, "ams": true},
  "schemaVersion": 1,
  "version": 2,
  "createdAt": "2026-06-27T08:00:00Z",
  "updatedAt": "2026-06-27T08:30:00Z",
  "deletedAt": null
}
```

## 18.6 ตัวอย่าง Order

```json
{
  "id": "0197f375-6bc5-7660-8a7b-d08cab1dc006",
  "orderNumber": "3DP-20260627-000123",
  "orderType": "SERVICE",
  "buyerId": "0197f26e-3c47-7af8-a9c3-82e4fb0f45c1",
  "providerId": "0197f2fc-9f67-78d2-bc05-c3a3201ee204",
  "sourceType": "INSTANT_QUOTE",
  "sourceId": "0197f360-f024-7db7-8dbe-9f18385e2a55",
  "status": "PAID",
  "currency": "THB",
  "subtotalMinor": 125000,
  "shippingMinor": 6000,
  "platformFeeMinor": 9000,
  "taxMinor": 0,
  "totalMinor": 140000,
  "priceSnapshot": {},
  "buyerSnapshot": {},
  "providerSnapshot": {},
  "schemaVersion": 1,
  "version": 3,
  "createdAt": "2026-06-27T08:00:00Z",
  "updatedAt": "2026-06-27T08:10:00Z",
  "deletedAt": null
}
```

## 18.7 Index Strategy

Index ต้องกำหนดตาม Query Use Case ไม่สร้างตามการคาดเดา ตัวอย่าง Composite Index:

- `service_requests(status, categoryCode, provinceCode, createdAt desc)`
- `proposals(serviceRequestId, status, createdAt desc)`
- `orders(buyerId, status, updatedAt desc)`
- `orders(providerId, status, updatedAt desc)`
- `provider_services(serviceType, provinceCode, instantOrderEnabled, rating desc)`
- `posts(status, visibility, publishedAt desc)`
- `products(categoryCode, status, createdAt desc)`

ต้องเก็บไฟล์กำหนด Index ใน Source Control และมี Index Review ก่อนเพิ่ม Query ใหม่

## 18.8 Read Model และ Denormalization

อนุญาต Denormalization เฉพาะเมื่อ:

- มี Source of Truth ชัดเจน
- มี Field `sourceVersion` หรือ `projectionVersion`
- Rebuild ได้จาก Entity ต้นทาง
- ไม่ใช้เป็นข้อมูลการเงินหรือสิทธิที่ต้องแม่นยำโดยไม่มีการตรวจต้นทาง

ตัวอย่าง Read Model:

- Provider Search Card
- Content Feed Card
- Order Summary
- Product Search Card

---

# 19. Repository Interfaces

ตัวอย่าง Interface แบบไม่ผูกฐานข้อมูล:

```ts
export interface OrderRepository {
  findById(id: string): Promise<Order | null>;
  findByBuyer(criteria: OrderSearchCriteria): Promise<Page<Order>>;
  save(order: Order, expectedVersion?: number): Promise<void>;
  appendStatusEvent(event: OrderStatusEvent): Promise<void>;
}
```

ข้อกำหนด:

- Domain Layer ไม่รับ Firestore Transaction Object
- Adapter จัดการ Transaction, Batch และ Optimistic Concurrency
- Use Case ต้องทดสอบด้วย In-memory Repository ได้
- PostgreSQL และ MongoDB Adapter ต้องผ่าน Contract Test ชุดเดียวกับ Firestore Adapter

## 19.1 Optimistic Concurrency

Entity ที่มีการเปลี่ยนพร้อมกันต้องใช้ `version`:

1. Client ส่ง Expected Version เมื่อแก้ไขข้อมูลสำคัญ
2. Repository ตรวจ Version ปัจจุบัน
3. หากไม่ตรง ส่ง `409 CONFLICT`
4. Firestore Adapter ใช้ Transaction
5. PostgreSQL ใช้ `WHERE id = ? AND version = ?`
6. MongoDB ใช้ Filter `{_id, version}` พร้อม `$inc`

## 19.2 Transaction Boundary

Transaction สำคัญ:

- เลือก Proposal และสร้าง Order
- ยืนยัน Payment และเปลี่ยน Order
- เปลี่ยน Order Status และเพิ่ม Status Event
- สร้าง Refund และปรับยอด
- สร้าง Payout และล็อกยอด

Transaction ต้องจำกัดเฉพาะ Aggregate ที่จำเป็น และใช้ Outbox สำหรับ Side Effect ภายนอก

---

# 20. API Requirements

## 20.1 มาตรฐาน Endpoint

ตัวอย่าง:

```text
POST   /api/v1/service-requests
GET    /api/v1/service-requests/{id}
POST   /api/v1/service-requests/{id}/proposals
POST   /api/v1/files/upload-sessions
POST   /api/v1/instant-quotes
POST   /api/v1/orders
POST   /api/v1/orders/{id}/transitions
POST   /api/v1/payments/{id}/confirm
POST   /api/v1/posts
GET    /api/v1/search/providers
POST   /api/v1/products
```

## 20.2 Response Envelope

```json
{
  "data": {},
  "meta": {
    "requestId": "req_...",
    "nextCursor": null
  }
}
```

## 20.3 Error Format

```json
{
  "error": {
    "code": "ORDER_VERSION_CONFLICT",
    "message": "ข้อมูลคำสั่งซื้อมีการเปลี่ยนแปลง",
    "details": {},
    "requestId": "req_..."
  }
}
```

## 20.4 Pagination

- ใช้ `limit` และ `cursor`
- Cursor เป็น Opaque Base64 หรือ Signed Token
- ห้ามส่ง Firestore Document Snapshot ให้ Client
- รองรับ Stable Sort

## 20.5 Idempotency

Endpoint ต่อไปนี้ต้องรองรับ `Idempotency-Key`:

- สร้าง Order
- สร้าง Payment Intent
- ยืนยัน Payment Webhook
- Refund
- Payout
- สร้าง Shipment

## 20.6 API Compatibility

- เปลี่ยน Field แบบ Breaking Change ต้องออก API Version ใหม่
- Field ใหม่ต้อง Optional ใน Version เดิม
- Enum ใหม่ต้องมี Unknown Handling ใน Client
- OpenAPI ต้องอยู่ใน CI และตรวจ Breaking Change

---

# 21. Security Requirements

## SEC-001 Authentication

- Backend ตรวจ Firebase ID Token
- ตรวจ Token Revocation สำหรับ Operation ความเสี่ยงสูงตามนโยบาย
- Mapping เป็น Internal User ID

## SEC-002 Authorization

- ตรวจ Role และ Ownership ใน Application Layer
- Security Rules เป็น Defense in Depth ไม่ใช่ Business Rule หลัก
- Admin Permission ใช้ Least Privilege

## SEC-003 App Check

เปิดใช้ App Check แบบ Monitor ก่อน Enforce เพื่อป้องกัน Client ที่ไม่ได้รับอนุญาต โดยต้องมีแผน Debug Token สำหรับ Development และ CI

## SEC-004 File Security

- Validate MIME Type และ Extension
- จำกัดขนาด
- Malware Scan
- Checksum
- Signed/Temporary Access
- ห้าม Public Bucket สำหรับไฟล์งานส่วนตัว

## SEC-005 Secrets

- เก็บ Secret ใน Secret Manager หรือระบบที่เทียบเท่า
- ห้าม Commit Secret
- แยก Environment Dev/Staging/Production
- Rotate Key ตามนโยบาย

## SEC-006 Payment Security

- ไม่เก็บ PAN/CVV
- ตรวจ Webhook Signature
- Restrict Payment Logs
- Mask Sensitive Data

## SEC-007 Abuse Protection

- Rate Limit
- App Check
- CAPTCHA ใน Flow เสี่ยง
- Login Attempt Monitoring
- Spam Detection
- Upload Quota

## SEC-008 Audit

Operation ความเสี่ยงสูงต้องมี Audit Log แบบ Append-only ในระดับ Application

## SEC-009 PDPA

- Consent Record
- Purpose of Processing
- Data Export
- Account Deletion
- Retention
- Access Log สำหรับข้อมูลอ่อนไหว
- Data Processing Agreement กับ Vendor ที่เกี่ยวข้อง

## SEC-010 Backup และ Recovery

- Backup Schedule
- Portable Export
- Restore Test
- Recovery Runbook
- RPO/RTO ตามระดับบริการ

---

# 22. Non-functional Requirements

## NFR-PERF-001 API Response

เป้าหมาย P95 โดยไม่รวมงาน Background:

- Read API ทั่วไปไม่เกิน 800 ms
- Write API ทั่วไปไม่เกิน 1,500 ms
- Search ไม่เกิน 1,500 ms
- สร้าง Upload Session ไม่เกิน 1,000 ms

## NFR-PERF-002 Background Job

- วิเคราะห์ไฟล์ต้องแสดงสถานะ Processing
- Client Poll หรือรับ Notification
- งานต้อง Retry ได้
- ต้องมี Dead Letter Handling

## NFR-AVL-001 Availability

- เป้าหมายเฟส 1 อย่างน้อย 99.5% ต่อเดือนสำหรับ Core API
- แยก Degraded Mode เช่น Content ล่มแต่ Order ยังใช้งานได้

## NFR-SCL-001 Scalability

- Stateless API
- Horizontal Scaling
- Queue สำหรับงานหนัก
- Object Storage สำหรับ Binary
- Index Review
- จำกัด Fan-out ต่อ Request

## NFR-MNT-001 Maintainability

- Modular Codebase
- Unit Test Domain
- Contract Test Repository
- OpenAPI
- ADR
- Code Review
- Static Analysis

## NFR-OBS-001 Observability

- Structured Log
- Request ID
- Trace ID
- Error Monitoring
- Metrics
- Audit Log
- Alert

## NFR-LOC-001 Localization

- ภาษาไทยและอังกฤษ
- เก็บ Text Key ไม่ฝังข้อความทุกจุด
- เวลาแสดงตาม Asia/Bangkok แต่เก็บ UTC
- Currency THB เป็นค่าเริ่มต้น

## NFR-ACC-001 Accessibility

- WCAG ระดับที่ทีมกำหนด
- Keyboard Navigation
- Screen Reader Label
- Contrast
- Error Message ที่เข้าใจได้

## NFR-COMP-001 Browser

รองรับ Browser รุ่นปัจจุบันและย้อนหลังตามนโยบาย รวมถึง Chrome, Safari, Edge และ Mobile Browser ที่มีสัดส่วนใช้งานหลัก

---

# 23. PWA Requirements เฟส 1

## PWA-001 Installability

- Web App Manifest
- Icon หลายขนาด
- HTTPS
- Install Prompt ตามแนวทาง Browser

## PWA-002 Offline

Offline รองรับเฉพาะ:

- App Shell
- Draft บางประเภท
- รายการที่ Cache ล่าสุดแบบ Read-only
- Queue Upload Draft เมื่อกลับ Online ตามข้อจำกัด

ห้ามแสดงข้อมูลธุรกรรมว่าเป็นข้อมูลล่าสุดหาก Offline

## PWA-003 Push

- ขอ Permission หลังมี Context
- จัดการ Token เปลี่ยนหรือหมดอายุ
- เปิด Deep Link ไปหน้าที่เกี่ยวข้อง

## PWA-004 Update

- แจ้งผู้ใช้เมื่อมีเวอร์ชันใหม่
- ไม่ให้ Service Worker Cache API Response ที่มีข้อมูลอ่อนไหวโดยไม่มีนโยบาย

---

# 24. Mobile App Requirements เฟส 2

## MOB-001 Shared API

Mobile ใช้ API Contract เดียวกับ Web

## MOB-002 Native Capability

- Camera
- Video
- File Picker
- Background Upload
- Push Notification
- Biometric Unlock
- Deep Link
- Location Permission

## MOB-003 Offline Draft

เก็บ Draft ภายในเครื่องด้วย Local Repository Interface และ Sync ผ่าน API เมื่อ Online

## MOB-004 Security

- Secure Storage สำหรับ Token
- Certificate/Network Security ตาม Platform
- App Check
- Root/Jailbreak Signal ใช้เป็น Risk Signal ไม่ใช่เงื่อนไขเดียว

---

# 25. Testing Requirements

## 25.1 Test Pyramid

- Unit Test: Domain, Pricing, State Machine, Permission
- Integration Test: Repository, Payment Adapter, Storage Adapter
- Contract Test: API และ Adapter
- End-to-End: Buyer, Provider, Payment, Order, Review
- Security Test: Rules, Authorization, Upload, Webhook
- Performance Test: Search, Quote, Order, Feed

## 25.2 Firebase Emulator

ใช้ Firebase Local Emulator Suite สำหรับ:

- Authentication
- Firestore
- Storage
- Functions
- Security Rules Test

แต่ Unit Test ของ Domain ต้องทำงานได้โดยไม่เปิด Emulator

## 25.3 Repository Contract Test

Test Suite เดียวกันต้องรันกับ:

- In-memory Repository
- Firestore Adapter
- PostgreSQL Adapter ในอนาคต
- MongoDB Adapter ในอนาคต

กรณีทดสอบ:

- CRUD
- Pagination
- Filter
- Optimistic Concurrency
- Soft Delete
- Transaction
- Unique Constraint Simulation

## 25.4 Data Portability Test

CI หรือ Scheduled Test ต้องตรวจ:

- Export JSONL สำเร็จ
- Validate Canonical Schema
- Import เข้า Local PostgreSQL Test Database
- Import เข้า Local MongoDB Test Database
- Row/Document Count ตรง
- Referential Integrity Report
- Checksum ของ File Manifest

## 25.5 Acceptance Test หลัก

- อัปโหลดไฟล์และดู Preview
- ระบบคำนวณราคาอัตโนมัติ
- Fallback เป็น Manual Quote
- เลือก Proposal และชำระเงิน
- Order State Transition ถูกต้อง
- ผู้ขายอัปเดตการผลิต
- จัดส่งและยืนยันรับ
- Verified Review
- สร้าง Content
- ปักหมุดร้าน/คอนเทนต์
- ลงขายเครื่องพิมพ์
- เปิดและแก้ข้อพิพาท

---

# 26. CI/CD และ Environment

## 26.1 Environment

- Local
- Development
- Staging
- Production

แต่ละ Environment ต้องแยก:

- Firebase Project
- Database
- Storage Bucket
- Payment Credential
- Domain
- Analytics
- Secret

## 26.2 Pipeline

1. Install
2. Lint
3. Type Check
4. Unit Test
5. API Contract Test
6. Build
7. Emulator Integration Test
8. Security Rules Test
9. Dependency Scan
10. Deploy Preview/Staging
11. Smoke Test
12. Manual Approval Production
13. Post-deploy Verification

## 26.3 Infrastructure as Code

- Firebase Configuration อยู่ใน Source Control
- Firestore Indexes อยู่ใน Source Control
- Security Rules อยู่ใน Source Control
- Cloud Run/Functions Configuration เป็น Code
- Environment Variable Schema มีการตรวจสอบ

---

# 27. การ Export และแผนย้ายฐานข้อมูล

## 27.1 เป้าหมาย

ระบบต้องสามารถย้ายไป PostgreSQL หรือ MongoDB โดยไม่เปลี่ยน Frontend Contract และไม่เปลี่ยน Domain Model หลัก

## 27.2 Portable Export Format

Export เป็นโครงสร้าง:

```text
export-2026-06-27/
  manifest.json
  users.ndjson
  user_identities.ndjson
  providers.ndjson
  printers.ndjson
  service_requests.ndjson
  proposals.ndjson
  orders.ndjson
  payments.ndjson
  posts.ndjson
  products.ndjson
  file_assets.ndjson
  file-manifest.ndjson
  checksums.sha256
```

`manifest.json` ต้องมี:

- Export Version
- Schema Versions
- Started/Completed At
- Record Counts
- Source Environment
- Checksum
- Encryption Metadata

## 27.3 Export Frequency

- Daily Incremental Export สำหรับข้อมูลธุรกรรม
- Weekly Full Portable Export
- Monthly Restore Drill ตามระดับความพร้อม
- Backup ของ Provider-managed Data แยกจาก Portable Export

## 27.4 การย้ายไป PostgreSQL

Mapping หลัก:

- Collection -> Table
- Entity ID -> UUID/VARCHAR Primary Key
- Reference ID -> Foreign Key
- Timestamp -> `timestamptz`
- Money Minor -> `bigint`
- Metadata -> `jsonb`
- Relationship Collection -> Join Table
- Version -> Optimistic Lock Column

ขั้นตอน:

1. สร้าง PostgreSQL Schema จาก Canonical Model
2. Implement PostgreSQL Repository Adapter
3. รัน Repository Contract Test
4. Backfill จาก Portable Export
5. Validate Count, Checksum และ Referential Integrity
6. เปิด Shadow Read เปรียบเทียบผล
7. เปิด Dual-write ผ่าน Application Layer หรือ Outbox
8. ตรวจ Lag และ Error
9. Cutover Read
10. Cutover Write
11. เก็บ Firestore Read-only ชั่วคราว
12. ปิดหลังพ้น Rollback Window

## 27.5 การย้ายไป MongoDB

Mapping หลัก:

- Collection -> MongoDB Collection
- Canonical ID -> `_id` หรือ Field `id` ตาม Adapter
- Relationship ขนาดใหญ่ยังคงแยก Collection
- Embedded Object ใช้เฉพาะ Value Object ขนาดเล็ก
- Timestamp -> BSON Date
- Money Minor -> 64-bit Integer/Decimal ตามการตัดสินใจ
- ใช้ Schema Validation
- ใช้ Index จาก Query Contract

ขั้นตอนเหมือน PostgreSQL โดยเปลี่ยน Adapter และ Validation Target

## 27.6 Dual-write Rule

ห้ามให้ Use Case เขียนฐานข้อมูลสองแห่งด้วยโค้ดกระจัดกระจาย ให้เลือกหนึ่งในแนวทาง:

- Repository Decorator ที่เขียน Primary และบันทึก Outbox สำหรับ Secondary
- Change Data Capture ที่มี Source ชัดเจน
- Outbox Replicator

Primary Write ต้องสำเร็จก่อน และ Secondary Failure ต้อง Retry ได้ ไม่ทำให้ Client สร้างธุรกรรมซ้ำ

## 27.7 Shadow Read

ระบบสุ่มอ่านจากฐานข้อมูลใหม่และเปรียบเทียบกับฐานเดิมโดยไม่ส่งผลต่อผู้ใช้ รายงาน:

- Missing Record
- Field Difference
- Sort Difference
- Pagination Difference
- Query Count Difference

## 27.8 Exit Criteria จาก Firebase

ถือว่าพร้อม Cutover เมื่อ:

- Adapter ใหม่ผ่าน Contract Test 100%
- Backfill ผ่าน Count และ Checksum
- Shadow Read Difference ต่ำกว่าเกณฑ์
- Dual-write Lag อยู่ในเกณฑ์
- Payment/Order Critical Flow ผ่าน E2E
- Backup และ Rollback ผ่านการทดสอบ
- Frontend ไม่ต้องเปลี่ยน API

---

# 28. Firestore-to-Target Mapping ตัวอย่าง

| Canonical Entity | Firestore | PostgreSQL | MongoDB |
|---|---|---|---|
| User | `users/{id}` | `users` table | `users` collection |
| User Identity | `user_identities/{id}` | `user_identities` table | `user_identities` collection |
| Printer | `printers/{id}` | `printers` table | `printers` collection |
| Order | `orders/{id}` | `orders` table | `orders` collection |
| Order Status Event | `order_status_events/{id}` | `order_status_events` table | `order_status_events` collection |
| Post | `posts/{id}` | `posts` table | `posts` collection |
| Reaction | `reactions/{id}` | `reactions` join table | `reactions` collection |
| File Asset | `file_assets/{id}` | `file_assets` table | `file_assets` collection |
| Outbox Event | `outbox_events/{id}` | `outbox_events` table | `outbox_events` collection |

---

# 29. ข้อห้ามด้านการออกแบบเพื่อป้องกัน Vendor Lock-in

ทีมพัฒนาห้าม:

- เรียก Firestore จาก UI Component โดยตรง
- ส่ง Firestore DocumentReference ผ่าน API
- ใช้ Firebase UID เป็น Foreign Key ธุรกิจทุกตาราง
- ใช้ Firestore Auto ID เป็น Public Business Identifier
- เก็บ Timestamp เป็นชนิด Firebase ใน Domain
- ใช้ GeoPoint ใน Domain Contract
- เก็บ User ID หลายหมื่นรายการใน Array
- ใช้ Subcollection ลึกสำหรับ Entity หลัก
- ฝังข้อมูลที่เปลี่ยนบ่อยหลายชุดโดยไม่มี Source of Truth
- ใช้ Firebase Trigger เป็นกลไกเดียวของ Payment หรือ Order State
- เขียน Business Rule สำคัญไว้เฉพาะใน Security Rules
- สร้าง Query โดยไม่มี Repository Method และ Use Case
- ใช้ Firebase-specific Cursor ใน Public API
- เก็บ Binary File ใน Firestore
- สร้าง Export ที่อ่านได้เฉพาะ Firebase Tool เท่านั้น

---

# 30. Logging, Monitoring และ Audit

## 30.1 Structured Log

Field ขั้นต่ำ:

- timestamp
- severity
- service
- environment
- requestId
- traceId
- userId แบบไม่เปิดเผยเกินจำเป็น
- operation
- durationMs
- result
- errorCode

## 30.2 Metrics

- API Latency
- Error Rate
- Function Instance
- Firestore Read/Write
- Queue Age
- File Analysis Duration
- Instant Quote Success Rate
- Payment Webhook Failure
- Order Transition Failure
- Notification Failure
- Export Success

## 30.3 Alert

- Payment Webhook ล้มเหลวต่อเนื่อง
- Order State Error
- Queue Backlog
- Storage Upload Failure
- Firestore Quota/Cost Spike
- Elevated 5xx
- Backup/Export Failure
- Unauthorized Admin Attempt

---

# 31. Business Continuity

## 31.1 RPO/RTO เป้าหมายเริ่มต้น

- Core Transaction RPO: ไม่เกิน 24 ชั่วโมงจาก Backup และลดลงด้วย Event/Export ตามความเหมาะสม
- Core API RTO: เป้าหมาย 4-8 ชั่วโมงสำหรับเหตุการณ์ร้ายแรงในเฟสแรก
- Payment Reconciliation ต้องสามารถสร้างสถานะใหม่จาก Provider Event และรายงานได้

ตัวเลขต้องถูกทบทวนตาม SLA ทางธุรกิจและงบประมาณก่อน Production

## 31.2 Recovery Runbook

- ระบุผู้รับผิดชอบ
- ตรวจ Source ของเหตุการณ์
- Freeze Operation ที่เสี่ยง
- Restore หรือ Failover
- Reconcile Payment
- Rebuild Read Model
- แจ้งผู้ใช้งาน
- Post-incident Review

---

# 32. Release Scope ตามเฟส

## 32.1 เฟส 1A: Marketplace Foundation

- Account และ Role
- Provider Profile
- บริการสามประเภท
- เครื่องและวัสดุ
- Service Request
- Proposal
- Chat
- Order
- Payment
- Shipping
- Review
- Admin

## 32.2 เฟส 1B: Instant Pricing

- File Upload
- 3D Viewer
- Model Analysis
- Pricing Profile
- Printer Matching
- Instant Quote
- Capacity
- Quote Snapshot

## 32.3 เฟส 1C: Content และ Commerce

- Content Feed
- Showcase
- Verified Review
- Follow/Like/Comment
- Sponsored Content
- Product Marketplace
- Pinned Shop/Product/Post
- Subscription

## 32.4 เฟส 2A: Cross-platform Mobile App

- Android/iOS
- Push
- Camera
- Background Upload
- Seller Workspace
- Creator Tools
- Location

## 32.5 เฟส 2B: Advanced Platform

- Cloud Slicing
- Smart Matching
- Dynamic Pricing
- Print Farm Integration
- API Partner
- Creator Affiliate
- Official Store
- Advanced Analytics

---

# 33. Acceptance Criteria ระดับระบบ

ระบบเฟส 1 พร้อมเปิดใช้งานเมื่อ:

1. ผู้ใช้สมัครและ Login ได้
2. Internal User ID ไม่ขึ้นกับ Firebase UID
3. ผู้ใช้เปิดหลายบทบาทได้
4. ผู้ให้บริการเปิดบริการสามประเภทได้
5. ผู้ให้บริการเพิ่มเครื่องและ Pricing Profile ได้
6. ผู้ซื้ออัปโหลดไฟล์ผ่าน Upload Session ได้
7. ระบบวิเคราะห์ไฟล์และแสดงสถานะได้
8. ระบบสร้าง Instant Quote เมื่อผ่าน Eligibility
9. ระบบ Fallback เป็น Manual Quote ได้
10. ผู้ซื้อเลือก Proposal และชำระเงินได้
11. Payment Webhook เป็น Idempotent
12. Order เปลี่ยนสถานะตาม State Machine เท่านั้น
13. ผู้ขายอัปโหลดหลักฐานการผลิตได้
14. ผู้ซื้อและผู้ขายสนทนาใน Order ได้
15. จัดส่งและ Tracking ได้
16. รีวิวจาก Order สำเร็จมี Verified Badge
17. ผู้ใช้สร้าง Content และ Tag ร้านหรือสินค้าได้
18. ผู้ขายลงขายเครื่องและอุปกรณ์ได้
19. ระบบโปรโมตแสดง Sponsored Label
20. Admin จัดการ KYC, Order, Dispute, Content และ Product ได้
21. Security Rules และ Authorization Test ผ่าน
22. Repository Layer ไม่มี Firebase Type รั่วเข้าสู่ Domain
23. Portable Export ทำงานได้
24. ทดลอง Import ตัวอย่างเข้า PostgreSQL และ MongoDB ได้
25. Web ใช้งานบนมือถือและติดตั้ง PWA ได้

---

# 34. Requirement Traceability Summary

| PRD Capability | SRS Section |
|---|---|
| บริการดีไซน์อย่างเดียว | 6, 8, 10 |
| บริการปริ้นอย่างเดียว | 6, 7, 9, 10 |
| บริการดีไซน์และปริ้น | 6, 8, 10 |
| คำนวณราคาอัตโนมัติ | 9, 18, 19 |
| Mobile-first Web/PWA | 23, 32 |
| Cross-platform Mobile App | 24, 32 |
| Content รีวิวและ Showcase | 13 |
| ปักหมุดร้านและคอนเทนต์ | 13, 15 |
| Marketplace เครื่องพิมพ์ | 14 |
| Firebase | 3, 4 |
| ลด Vendor Lock-in | 3, 18, 19, 27-29 |
| ย้าย PostgreSQL/MongoDB | 27, 28 |

---

# 35. สรุปข้อเสนอด้านฐานข้อมูล

สำหรับเฟสแรก แนะนำใช้ Cloud Firestore เพื่อความเร็วในการพัฒนาและลดภาระดูแลระบบ แต่ต้องใช้ Firestore เป็นเพียง Infrastructure Adapter ไม่ใช่แกนของ Business Model

หัวใจของการลด Vendor Lock-in คือ:

- Canonical Domain Model
- REST/OpenAPI Contract
- Repository Interface
- Internal UUID
- Top-level Collections
- Portable Data Types
- Outbox Event
- Portable Export
- Repository Contract Test
- Dual-write และ Shadow Read Plan

ด้วยแนวทางนี้ การย้ายไป PostgreSQL หรือ MongoDB ในอนาคตจะเป็นการเปลี่ยน Data Adapter และ Migration Pipeline เป็นหลัก โดยไม่ต้องเขียน Frontend และ Business Workflow ใหม่ทั้งหมด
