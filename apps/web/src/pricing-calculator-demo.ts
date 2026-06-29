import type {
  CalculatorInput,
  CalculatorResult,
  PricingFormulaConfiguration,
} from '@pim/domain';

// ── Demo data ─────────────────────────────────────────────────────────────

export const demoPricingFormula: PricingFormulaConfiguration = {
  minimumOrderMinor: 10000,
  materialRateMinorPerGram: 350,
  machineRateMinorPerMinute: 40,
  setupFeeMinor: 5000,
  supportMultiplierBps: 1200,
  riskBufferBps: 800,
  rushMultiplierBps: 15000,
  quantityDiscountBps: 500,
  platformFeeBps: 500,
  laborMultiplierBps: 300,
  shippingMinor: 5000,
  taxRateBps: 700,
};

export type PricingEditorDraft = Readonly<{
  currency: string;
  effectiveFrom: string;
  formula: PricingFormulaConfiguration;
  name: string;
  status: 'DRAFT' | 'ACTIVE' | 'RETIRED';
}>;

export function createEmptyPricingEditorDraft(): PricingEditorDraft {
  return {
    currency: 'THB',
    effectiveFrom:
      new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10) +
      'T00:00:00Z',
    formula: { ...demoPricingFormula },
    name: '',
    status: 'DRAFT',
  };
}

export function pricingFormulaToDisplay(
  f: PricingFormulaConfiguration,
): string {
  return [
    `Minimum order: ${f.minimumOrderMinor.toLocaleString('th-TH')}`,
    `Material rate: ${f.materialRateMinorPerGram} /g`,
    `Machine rate: ${f.machineRateMinorPerMinute} /min`,
    `Setup fee: ${f.setupFeeMinor.toLocaleString('th-TH')}`,
    `Support: ${(f.supportMultiplierBps / 100).toFixed(2)}%`,
    `Risk buffer: ${(f.riskBufferBps / 100).toFixed(2)}%`,
    `Rush surcharge: ${(f.rushMultiplierBps / 100).toFixed(2)}%`,
    `Qty discount: ${(f.quantityDiscountBps / 100).toFixed(2)}%`,
    `Platform fee: ${(f.platformFeeBps / 100).toFixed(2)}%`,
    `Labor: ${(f.laborMultiplierBps / 100).toFixed(2)}%`,
    `Shipping: ${f.shippingMinor.toLocaleString('th-TH')}`,
    `Tax: ${(f.taxRateBps / 100).toFixed(2)}%`,
  ].join('\n');
}

export function calculatorInputToDisplay(input: CalculatorInput): string {
  return [
    `Volume: ${input.volumeGrams}g`,
    `Est. time: ${input.estimatedMinutes} min`,
    `Material: ${input.materialCode}`,
    `Quality: ${input.qualityCode}`,
    `Quantity: ${input.quantity}`,
    `Support: ${input.hasSupport ? 'Yes' : 'No'}`,
    `Rush: ${input.isRush ? 'Yes' : 'No'}`,
  ].join(' | ');
}

export function calculatorResultToDisplay(result: CalculatorResult): string {
  const lines = result.lineItems.map(
    (li) => `  ${li.code.padEnd(18)} ${li.amountMinor.toLocaleString('th-TH')}`,
  );
  return [
    'Line items:',
    ...lines,
    '',
    `Total: ${result.totalMinor.toLocaleString('th-TH')}`,
    `(Min order: ${result.minimumOrderMinor.toLocaleString('th-TH')})`,
  ].join('\n');
}

export const lineItemCodeLabels: Record<string, string> = {
  MATERIAL: 'ค่าวัสดุ',
  MACHINE: 'ค่าเครื่องจักร',
  SETUP: 'ค่าเตรียมงาน',
  SUPPORT: 'ค่า Support',
  LABOR: 'ค่าแรง',
  RISK: 'ค่าความเสี่ยง',
  RUSH: 'ค่าด่วน',
  QUANTITY_DISCOUNT: 'ส่วนลดจำนวน',
  SHIPPING: 'ค่าจัดส่ง',
  PLATFORM_FEE: 'ค่าธรรมเนียม',
  TAX: 'ภาษี',
};
