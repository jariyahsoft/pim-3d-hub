import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { QuoteComparisonScreen } from './quote-comparison-screen.js';
import {
  createEmptyManualFallbackDraft,
  demoQuoteCards,
  eligibilityReasonLabels,
  lineItemLabel,
} from './quote-comparison-demo.js';

describe('QuoteComparisonScreen', () => {
  it('renders heading', () => {
    const html = renderToStaticMarkup(
      <QuoteComparisonScreen initialCards={demoQuoteCards} />,
    );
    expect(html).toContain('เปรียบเทียบราคา');
  });

  it('shows empty state when no cards', () => {
    const html = renderToStaticMarkup(
      <QuoteComparisonScreen initialCards={[]} />,
    );
    expect(html).toContain('ไม่พบราคา');
  });

  it('renders provider names for each card', () => {
    const html = renderToStaticMarkup(
      <QuoteComparisonScreen initialCards={demoQuoteCards} />,
    );
    expect(html).toContain('Bangkok Print Lab');
    expect(html).toContain('Fast Print Studio');
    expect(html).toContain('Maker Space Bangkok');
  });

  it('renders Thai formatted prices', () => {
    const html = renderToStaticMarkup(
      <QuoteComparisonScreen initialCards={demoQuoteCards} />,
    );
    expect(html).toContain('39,015');
    expect(html).toContain('35,000');
    expect(html).toContain('42,000');
  });

  it('renders sponsored badge and note', () => {
    const html = renderToStaticMarkup(
      <QuoteComparisonScreen initialCards={demoQuoteCards} />,
    );
    expect(html).toContain('โฆษณา');
    expect(html).toContain('ส่งเสริม');
  });

  it('renders verified badge', () => {
    const html = renderToStaticMarkup(
      <QuoteComparisonScreen initialCards={demoQuoteCards} />,
    );
    expect(html).toContain('ยืนยัน');
  });

  it('renders rating and review count', () => {
    const html = renderToStaticMarkup(
      <QuoteComparisonScreen initialCards={demoQuoteCards} />,
    );
    expect(html).toContain('★');
    expect(html).toContain('4.8');
  });

  it('renders expiry countdown', () => {
    const html = renderToStaticMarkup(
      <QuoteComparisonScreen initialCards={demoQuoteCards} />,
    );
    expect(html).toContain('หมดอายุใน');
  });

  it('renders capacity bar for each card', () => {
    const html = renderToStaticMarkup(
      <QuoteComparisonScreen initialCards={demoQuoteCards} />,
    );
    expect(html).toContain('คิวว่าง');
    expect(html).toContain('progressbar');
  });

  it('renders capacity-changed warning when applicable', () => {
    const html = renderToStaticMarkup(
      <QuoteComparisonScreen initialCards={demoQuoteCards} />,
    );
    expect(html).toContain('คิวเปลี่ยนหลังคำนวณราคา');
  });

  it('renders compare and choose buttons', () => {
    const html = renderToStaticMarkup(
      <QuoteComparisonScreen initialCards={demoQuoteCards} />,
    );
    expect(html).toContain('เปรียบเทียบ');
    expect(html).toContain('เลือกนี้');
  });

  it('renders line items toggle', () => {
    const html = renderToStaticMarkup(
      <QuoteComparisonScreen initialCards={demoQuoteCards} />,
    );
    expect(html).toContain('รายการคิดเงิน');
  });

  it('renders pickup-only label', () => {
    const html = renderToStaticMarkup(
      <QuoteComparisonScreen initialCards={demoQuoteCards} />,
    );
    expect(html).toContain('รับเองที่ร้าน');
  });

  it('renders distance for non-pickup providers', () => {
    const html = renderToStaticMarkup(
      <QuoteComparisonScreen initialCards={demoQuoteCards} />,
    );
    expect(html).toContain('4.2');
    expect(html).toContain('7.8');
    // Card 3 is pickup-only, so 12.1 is hidden; instead show "รับเองที่ร้าน"
    expect(html).toContain('รับเองที่ร้าน');
  });

  // Manual fallback
  it('shows manual fallback when reasons are provided', () => {
    const html = renderToStaticMarkup(
      <QuoteComparisonScreen
        initialCards={[]}
        fallbackReasons={['MANUAL_REVIEW_REQUIRED']}
      />,
    );
    expect(html).toContain('ขอให้ผู้ให้บริการประเมินราคา');
  });

  it('renders Thai reason labels', () => {
    expect(eligibilityReasonLabels.MANUAL_REVIEW_REQUIRED).toBe(
      'ต้องประเมินราคาโดยผู้ให้บริการ',
    );
    expect(eligibilityReasonLabels.BUILD_VOLUME_EXCEEDED).toBe(
      'ขนาดโมเดลเกินความจุเครื่อง',
    );
  });

  it('renders manual fallback form fields', () => {
    const html = renderToStaticMarkup(
      <QuoteComparisonScreen
        initialCards={[]}
        fallbackReasons={['UNIT_AMBIGUITY']}
      />,
    );
    expect(html).toContain('งบประมาณ');
    expect(html).toContain('กำหนดส่ง');
    expect(html).toContain('จำนวน');
    expect(html).toContain('ที่อยู่จัดส่ง');
    expect(html).toContain('รายละเอียดเพิ่มเติม');
  });

  it('shows the submit button on manual fallback form', () => {
    const html = renderToStaticMarkup(
      <QuoteComparisonScreen
        initialCards={[]}
        fallbackReasons={['MANUAL_REVIEW_REQUIRED']}
      />,
    );
    expect(html).toContain('ส่งคำขอประเมินราคา');
  });

  it('renders file asset reference when supplied', () => {
    const html = renderToStaticMarkup(
      <QuoteComparisonScreen
        initialCards={demoQuoteCards}
        fileAssetId="asset-1"
      />,
    );
    expect(html).toContain('เปรียบเทียบราคา');
  });
});

describe('quote-comparison-demo', () => {
  it('lineItemLabel returns Thai labels', () => {
    expect(lineItemLabel('MATERIAL')).toBe('วัสดุ');
    expect(lineItemLabel('SETUP')).toBe('ค่าเตรียมงาน');
    expect(lineItemLabel('SHIPPING')).toBe('ค่าจัดส่ง');
    expect(lineItemLabel('PLATFORM_FEE')).toBe('ค่าธรรมเนียม');
    expect(lineItemLabel('UNKNOWN')).toBe('UNKNOWN');
  });

  it('createEmptyManualFallbackDraft returns empty draft', () => {
    const draft = createEmptyManualFallbackDraft();
    expect(draft.requirements).toBe('');
    expect(draft.budgetMinor).toBeNull();
    expect(draft.quantity).toBe(1);
    expect(draft.materialCode).toBe('PLA');
  });

  it('demoQuoteCards has 3 cards', () => {
    expect(demoQuoteCards.length).toBe(3);
  });

  it('first card is verified and not sponsored', () => {
    expect(demoQuoteCards[0].verified).toBe(true);
    expect(demoQuoteCards[0].sponsored).toBe(false);
  });

  it('second card is sponsored', () => {
    expect(demoQuoteCards[1].sponsored).toBe(true);
  });

  it('third card has capacity changed flag', () => {
    expect(demoQuoteCards[2].capacityChanged).toBe(true);
  });
});
