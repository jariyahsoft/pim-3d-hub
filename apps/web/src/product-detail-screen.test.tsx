import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { ProductDetailScreen } from './product-detail-screen.js';
import {
  demoUsedPrinterProduct,
  demoIncompleteEvidenceProduct,
  demoSuspendedProduct,
} from './product-detail-screen-demo.js';

describe('ProductDetailScreen', () => {
  it('renders heading and description', () => {
    const html = renderToStaticMarkup(<ProductDetailScreen />);
    expect(html).toContain('Used Ender 3 Pro');
    expect(html).toContain('Carefully used 3D printer');
  });

  it('shows price in Thai locale', () => {
    const html = renderToStaticMarkup(<ProductDetailScreen />);
    expect(html).toContain('250,000');
  });

  it('renders printer details', () => {
    const html = renderToStaticMarkup(<ProductDetailScreen />);
    expect(html).toContain('LIKE_NEW');
    expect(html).toContain('อายุการใช้งาน');
    expect(html).toContain('SN-XX-XX-1234');
  });

  it('does not expose raw serial number', () => {
    const html = renderToStaticMarkup(<ProductDetailScreen />);
    expect(html).not.toMatch(/SN-RAW-[A-Z0-9]{8,}/);
  });

  it('shows evidence complete checkmark list when complete', () => {
    const html = renderToStaticMarkup(<ProductDetailScreen />);
    expect(html).toContain('ทดสอบเปิดเครื่อง');
    expect(html).toContain('ทดสอบ Homing');
    expect(html).toContain('ทดสอบ Extrusion');
  });

  it('shows evidence-incomplete alert when evidence incomplete', () => {
    const html = renderToStaticMarkup(
      <ProductDetailScreen product={demoIncompleteEvidenceProduct} />,
    );
    expect(html).toContain('หลักฐานไม่ครบ');
  });

  it('renders inventory stock line', () => {
    const html = renderToStaticMarkup(<ProductDetailScreen />);
    expect(html).toContain('คงเหลือ');
    expect(html).toContain('ชิ้น');
  });

  it('renders report button when handler provided', () => {
    const html = renderToStaticMarkup(
      <ProductDetailScreen onReport={() => {}} />,
    );
    expect(html).toContain('รายงานสินค้า');
  });

  it('hides report button when no handler', () => {
    const html = renderToStaticMarkup(<ProductDetailScreen />);
    expect(html).not.toContain('รายงานสินค้า');
  });

  it('renders suspended banner with moderation note', () => {
    const html = renderToStaticMarkup(
      <ProductDetailScreen product={demoSuspendedProduct} />,
    );
    expect(html).toContain('ระงับ:');
    expect(html).toContain('under review');
  });

  it('renders blocked state for REMOVED', () => {
    const html = renderToStaticMarkup(
      <ProductDetailScreen
        product={{ ...demoUsedPrinterProduct, status: 'REMOVED' }}
      />,
    );
    expect(html).toContain('สินค้านี้ถูกลบแล้ว');
  });

  it('renders loading banner', () => {
    const html = renderToStaticMarkup(<ProductDetailScreen initialLoading />);
    expect(html).toContain('กำลังโหลด');
  });

  it('renders error banner', () => {
    const html = renderToStaticMarkup(
      <ProductDetailScreen initialErrorMessage="ผิดพลาด" />,
    );
    expect(html).toContain('ผิดพลาด');
  });
});
