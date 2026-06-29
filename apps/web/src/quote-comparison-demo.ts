// apps/web boundary type usage; no domain types needed yet

// ── Demo data ─────────────────────────────────────────────────────────────

export type DemoQuoteCard = Readonly<{
  id: string;
  providerId: string;
  providerName: string;
  verified: boolean;
  sponsored: boolean;
  ratingAverage: number;
  ratingCount: number;
  totalMinor: number;
  expiresAt: string;
  estimateMinutes: number;
  printerTechnology: string;
  materialCode: string;
  colorCode: string;
  qualityCode: string;
  distanceKm: number | null;
  pickupOnly: boolean;
  availableCapacity: number;
  capacityTotal: number;
  lineItems: ReadonlyArray<{ code: string; amountMinor: number }>;
  capacityChanged: boolean;
  currency: string;
}>;

export const demoQuoteCards: readonly DemoQuoteCard[] = Object.freeze([
  Object.freeze({
    id: 'q-1',
    providerId: 'prov-1',
    providerName: 'Bangkok Print Lab',
    verified: true,
    sponsored: false,
    ratingAverage: 4.8,
    ratingCount: 247,
    totalMinor: 39015,
    expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    estimateMinutes: 180,
    printerTechnology: 'FDM',
    materialCode: 'PLA',
    colorCode: 'BLACK',
    qualityCode: 'STANDARD',
    distanceKm: 4.2,
    pickupOnly: false,
    availableCapacity: 5,
    capacityTotal: 10,
    lineItems: [
      { code: 'MATERIAL', amountMinor: 17500 },
      { code: 'MACHINE', amountMinor: 7200 },
      { code: 'SETUP', amountMinor: 5000 },
      { code: 'SUPPORT', amountMinor: 2100 },
      { code: 'RISK', amountMinor: 2544 },
      { code: 'SHIPPING', amountMinor: 5000 },
      { code: 'PLATFORM_FEE', amountMinor: 1967 },
      { code: 'TAX', amountMinor: 2752 },
    ],
    capacityChanged: false,
    currency: 'THB',
  }),
  Object.freeze({
    id: 'q-2',
    providerId: 'prov-2',
    providerName: 'Fast Print Studio',
    verified: true,
    sponsored: true,
    ratingAverage: 4.5,
    ratingCount: 112,
    totalMinor: 35000,
    expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    estimateMinutes: 150,
    printerTechnology: 'FDM',
    materialCode: 'PLA',
    colorCode: 'BLACK',
    qualityCode: 'STANDARD',
    distanceKm: 7.8,
    pickupOnly: false,
    availableCapacity: 3,
    capacityTotal: 8,
    lineItems: [
      { code: 'MATERIAL', amountMinor: 14000 },
      { code: 'MACHINE', amountMinor: 6000 },
      { code: 'SETUP', amountMinor: 4000 },
      { code: 'SUPPORT', amountMinor: 1680 },
      { code: 'RISK', amountMinor: 2054 },
      { code: 'SHIPPING', amountMinor: 4000 },
      { code: 'PLATFORM_FEE', amountMinor: 1587 },
      { code: 'TAX', amountMinor: 2223 },
    ],
    capacityChanged: false,
    currency: 'THB',
  }),
  Object.freeze({
    id: 'q-3',
    providerId: 'prov-3',
    providerName: 'Maker Space Bangkok',
    verified: false,
    sponsored: false,
    ratingAverage: 4.2,
    ratingCount: 38,
    totalMinor: 42000,
    expiresAt: new Date(Date.now() + 2700_000).toISOString(),
    estimateMinutes: 200,
    printerTechnology: 'SLA',
    materialCode: 'RESIN',
    colorCode: 'CLEAR',
    qualityCode: 'FINE',
    distanceKm: 12.1,
    pickupOnly: true,
    availableCapacity: 1,
    capacityTotal: 5,
    lineItems: [
      { code: 'MATERIAL', amountMinor: 19000 },
      { code: 'MACHINE', amountMinor: 8000 },
      { code: 'SETUP', amountMinor: 5000 },
      { code: 'RISK', amountMinor: 2560 },
      { code: 'SHIPPING', amountMinor: 0 },
      { code: 'PLATFORM_FEE', amountMinor: 1728 },
      { code: 'TAX', amountMinor: 2419 },
    ],
    capacityChanged: true,
    currency: 'THB',
  }),
]);

export const emptyQuoteCards: readonly DemoQuoteCard[] = Object.freeze([]);

export type ManualFallbackDraft = Readonly<{
  requirements: string;
  budgetMinor: number | null;
  dueAt: string;
  materialCode: string;
  qualityCode: string;
  colorCode: string;
  quantity: number;
  pickupOnly: boolean;
  deliveryAddress: string;
}>;

export function createEmptyManualFallbackDraft(): ManualFallbackDraft {
  return {
    requirements: '',
    budgetMinor: null,
    dueAt: '',
    materialCode: 'PLA',
    qualityCode: 'STANDARD',
    colorCode: 'BLACK',
    quantity: 1,
    pickupOnly: false,
    deliveryAddress: '',
  };
}

export const demoManualFallbackReason =
  'ไฟล์นี้ต้องประเมินราคาโดยผู้ให้บริการ เนื่องจากไม่ผ่านการตรวจสอบอัตโนมัติ';

export const eligibilityReasonLabels: Record<string, string> = {
  ANALYSIS_MISSING: 'ยังไม่มีการวิเคราะห์โมเดล',
  ANALYSIS_FAILED: 'การวิเคราะห์โมเดลล้มเหลว',
  BUILD_VOLUME_EXCEEDED: 'ขนาดโมเดลเกินความจุเครื่อง',
  PRINTER_NOT_FOUND: 'ไม่พบเครื่องพิมพ์ที่รองรับ',
  PRINTER_INACTIVE: 'เครื่องพิมพ์ปิดให้บริการชั่วคราว',
  MATERIAL_NOT_SUPPORTED: 'วัสดุไม่รองรับ',
  COLOR_NOT_SUPPORTED: 'สีไม่รองรับ',
  QUALITY_NOT_SUPPORTED: 'ความละเอียดไม่รองรับ',
  CAPACITY_UNAVAILABLE: 'คิวเต็ม',
  DUE_DATE_TOO_EARLY: 'กำหนดส่งเร็วเกินไป',
  MANUAL_REVIEW_REQUIRED: 'ต้องประเมินราคาโดยผู้ให้บริการ',
  UNIT_AMBIGUITY: 'หน่วยไม่ชัดเจน กรุณายืนยัน',
  PRICING_PROFILE_MISSING: 'ยังไม่ได้ตั้งราคาสำหรับงานนี้',
  PRICING_PROFILE_INACTIVE: 'ตารางราคาไม่พร้อมใช้งาน',
};

export function lineItemLabel(code: string): string {
  const labels: Record<string, string> = {
    MATERIAL: 'วัสดุ',
    MACHINE: 'ค่าเครื่อง',
    SETUP: 'ค่าเตรียมงาน',
    SUPPORT: 'Support',
    LABOR: 'ค่าแรง',
    RISK: 'ค่าเสี่ยง',
    RUSH: 'ค่าด่วน',
    QUANTITY_DISCOUNT: 'ส่วนลดจำนวน',
    SHIPPING: 'ค่าจัดส่ง',
    PLATFORM_FEE: 'ค่าธรรมเนียม',
    TAX: 'ภาษี',
  };
  return labels[code] ?? code;
}
