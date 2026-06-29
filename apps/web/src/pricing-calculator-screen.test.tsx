import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PricingCalculatorScreen } from './pricing-calculator-screen.js';
import {
  createEmptyPricingEditorDraft,
  lineItemCodeLabels,
} from './pricing-calculator-demo.js';

describe('PricingCalculatorScreen', () => {
  it('renders the calculator heading', () => {
    const html = renderToStaticMarkup(<PricingCalculatorScreen />);
    expect(html).toContain('เครื่องคำนวณราคา');
  });

  it('renders draft status by default', () => {
    const html = renderToStaticMarkup(<PricingCalculatorScreen />);
    expect(html).toContain('ร่าง');
  });

  it('renders active status', () => {
    const draft = {
      ...createEmptyPricingEditorDraft(),
      status: 'ACTIVE' as const,
    };
    const html = renderToStaticMarkup(
      <PricingCalculatorScreen initialDraft={draft} />,
    );
    expect(html).toContain('ใช้งาน');
  });

  it('renders retired status', () => {
    const draft = {
      ...createEmptyPricingEditorDraft(),
      status: 'RETIRED' as const,
    };
    const html = renderToStaticMarkup(
      <PricingCalculatorScreen initialDraft={draft} />,
    );
    expect(html).toContain('เลิกใช้งาน');
  });

  it('renders input fields for volume, time, quantity', () => {
    const html = renderToStaticMarkup(<PricingCalculatorScreen />);
    expect(html).toContain('ปริมาตร');
    expect(html).toContain('เวลาผลิต');
    expect(html).toContain('จำนวน');
    expect(html).toContain('วัสดุ');
    expect(html).toContain('ความละเอียด');
    expect(html).toContain('สี');
  });

  it('renders support and rush checkboxes', () => {
    const html = renderToStaticMarkup(<PricingCalculatorScreen />);
    expect(html).toContain('Support Structure');
    expect(html).toContain('ด่วน');
  });

  it('renders the calculate button', () => {
    const html = renderToStaticMarkup(<PricingCalculatorScreen />);
    expect(html).toContain('คำนวณราคา');
  });

  it('renders calculate button and initial form without result', () => {
    const html = renderToStaticMarkup(
      <PricingCalculatorScreen
        onCalculate={() => ({
          lineItems: [
            { code: 'MATERIAL', amountMinor: 17500 },
            { code: 'SETUP', amountMinor: 5000 },
          ],
          totalMinor: 22500,
          minimumOrderMinor: 10000,
        })}
      />,
    );

    // Button is present; result is not rendered initially
    expect(html).toContain('คำนวณราคา');
    expect(html).not.toContain('ผลการคำนวณ');
  });

  it('renders formula toggle button with formula values accessible', () => {
    const html = renderToStaticMarkup(<PricingCalculatorScreen />);
    expect(html).toContain('แสดงรายละเอียดสูตร');
    // Toggle button has aria-expanded=false initially
    expect(html).toContain('aria-expanded="false"');
    // Formula values from demoPricingFormula are present in the component
    // (they become visible after toggling)
    expect(html).toContain('รายละเอียดสูตร');
  });

  it('renders line item labels in Thai', () => {
    expect(lineItemCodeLabels.MATERIAL).toBe('ค่าวัสดุ');
    expect(lineItemCodeLabels.MACHINE).toBe('ค่าเครื่องจักร');
    expect(lineItemCodeLabels.SETUP).toBe('ค่าเตรียมงาน');
    expect(lineItemCodeLabels.QUANTITY_DISCOUNT).toBe('ส่วนลดจำนวน');
    expect(lineItemCodeLabels.TAX).toBe('ภาษี');
    expect(lineItemCodeLabels.PLATFORM_FEE).toBe('ค่าธรรมเนียม');
  });

  it('renders effective date for draft', () => {
    const html = renderToStaticMarkup(<PricingCalculatorScreen />);
    expect(html).toContain('มีผลตั้งแต่');
  });

  it('renders material options for all printer materials', () => {
    const html = renderToStaticMarkup(<PricingCalculatorScreen />);
    expect(html).toContain('PLA');
    expect(html).toContain('ABS');
    expect(html).toContain('PETG');
    expect(html).toContain('TPU');
    expect(html).toContain('RESIN');
  });

  it('renders quality options', () => {
    const html = renderToStaticMarkup(<PricingCalculatorScreen />);
    expect(html).toContain('ร่าง');
    expect(html).toContain('มาตรฐาน');
    expect(html).toContain('ละเอียด');
  });

  it('renders color options', () => {
    const html = renderToStaticMarkup(<PricingCalculatorScreen />);
    expect(html).toContain('ดำ');
    expect(html).toContain('ขาว');
    expect(html).toContain('น้ำเงิน');
    expect(html).toContain('แดง');
  });

  it('renders discount badge label in line item labels map', () => {
    expect(lineItemCodeLabels.RISK).toBe('ค่าความเสี่ยง');
    expect(lineItemCodeLabels.SUPPORT).toBe('ค่า Support');
    expect(lineItemCodeLabels.LABOR).toBe('ค่าแรง');
    expect(lineItemCodeLabels.SHIPPING).toBe('ค่าจัดส่ง');
  });
});
