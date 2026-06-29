'use client';

import { useState, type ReactElement } from 'react';
import { demoUsedPrinterProduct } from './product-detail-screen-demo.js';

export type ProductDetailScreenProps = Readonly<{
  initialErrorMessage?: string | null;
  initialLoading?: boolean;
  product?: typeof demoUsedPrinterProduct;
  onReport?: (targetId: string) => void;
}>;

export function ProductDetailScreen(
  props: ProductDetailScreenProps,
): ReactElement {
  const product = props.product ?? demoUsedPrinterProduct;
  const [loading] = useState(props.initialLoading ?? false);
  const [errorMessage] = useState(props.initialErrorMessage ?? null);
  const [announcement, setAnnouncement] = useState('');

  if (loading) {
    return (
      <div className="product-detail">
        <div role="status" aria-live="polite" className="loading-banner">
          กำลังโหลดสินค้า...
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="product-detail">
        <div role="alert" className="error-banner">
          {errorMessage}
        </div>
      </div>
    );
  }

  if (product.status === 'REMOVED') {
    return (
      <div className="product-detail">
        <div role="status" className="blocked">
          <h2>สินค้านี้ถูกลบแล้ว</h2>
        </div>
      </div>
    );
  }

  const printerFields =
    product.category === 'PRINTER' &&
    product.categoryFields.category === 'PRINTER'
      ? product.categoryFields.fields
      : null;

  return (
    <div className="product-detail">
      <header className="product-header">
        <h2>{product.title}</h2>
        <p className="product-status">
          สถานะ:{' '}
          {product.status === 'PUBLISHED'
            ? 'เผยแพร่'
            : product.status === 'SUSPENDED'
              ? 'ระงับ'
              : product.status}
        </p>
        <p className="product-price">
          ฿{(product.variants[0]?.priceMinor ?? 0).toLocaleString('th-TH')}
        </p>
      </header>

      <p className="product-description">{product.description}</p>

      {product.status === 'SUSPENDED' && product.moderatedNotes && (
        <div role="alert" className="moderated-banner">
          <strong>ระงับ:</strong> {product.moderatedNotes}
        </div>
      )}

      {printerFields && (
        <section className="printer-section" aria-labelledby="printer-heading">
          <h3 id="printer-heading">ข้อมูลเครื่องพิมพ์</h3>
          <dl>
            <dt>สภาพ</dt>
            <dd>{printerFields.condition}</dd>
            <dt>อายุการใช้งาน</dt>
            <dd>{printerFields.ageMonths ?? '—'} เดือน</dd>
            <dt>เทคโนโลยี</dt>
            <dd>{printerFields.technologyCode ?? '—'}</dd>
            <dt>Serial (masked)</dt>
            <dd>{printerFields.serialNumberMasked ?? '—'}</dd>
            <dt>อุปกรณ์ที่มาพร้อม</dt>
            <dd>{printerFields.includedItems.join(', ') || 'ไม่มี'}</dd>
          </dl>
        </section>
      )}

      {printerFields && (
        <section
          className="evidence-section"
          aria-labelledby="evidence-heading"
        >
          <h3 id="evidence-heading">หลักฐานการตรวจสอบ (เครื่องมือสอง)</h3>

          {product.evidenceComplete ? (
            <ul className="evidence-list" role="list">
              <li>✓ ทดสอบเปิดเครื่อง</li>
              <li>✓ ทดสอบ Homing</li>
              <li>✓ ทดสอบ Extrusion</li>
              <li>✓ ทดสอบพิมพ์ตัวอย่าง</li>
              <li>✓ เปิดเผยข้อบกพร่อง</li>
            </ul>
          ) : (
            <div role="alert" className="evidence-incomplete">
              <strong>หลักฐานไม่ครบ</strong>
              <p>เครื่องมือสองที่ใช้ต้องครบก่อนเผยแพร่</p>
            </div>
          )}
        </section>
      )}

      <section
        className="inventory-section"
        aria-labelledby="inventory-heading"
      >
        <h3 id="inventory-heading">คงเหลือ</h3>
        {product.variants.map((v) => (
          <div key={v.sku} className="inventory-row">
            <span>SKU {v.sku}</span>
            <span>
              คงเหลือ {v.inventoryTotalUnits - v.inventoryReservedUnits} ชิ้น
              (จอง {v.inventoryReservedUnits}/{v.inventoryTotalUnits})
            </span>
          </div>
        ))}
      </section>

      <div className="product-actions">
        {props.onReport && (
          <button
            type="button"
            className="report-btn"
            onClick={() => {
              props.onReport?.(String(product.id));
              setAnnouncement('ส่งรายงานสินค้าแล้ว');
            }}
          >
            รายงานสินค้า
          </button>
        )}
      </div>

      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>

      <style>{`
        .product-detail {
          max-width: 720px;
          margin: 0 auto;
          padding: 1.5rem;
          font-family: system-ui, sans-serif;
        }
        h2 { margin: 0 0 0.25rem; font-size: 1.5rem; }
        h3 { margin: 0 0 0.5rem; font-size: 1.125rem; }
        .product-header h2 { font-size: 1.5rem; }
        .product-status { color: #6b7280; font-size: 0.875rem; }
        .product-price {
          font-size: 1.5rem;
          font-weight: 700;
          color: #2563eb;
          margin: 0.5rem 0;
        }
        .product-description { line-height: 1.5; }
        .printer-section,
        .evidence-section,
        .inventory-section {
          background: #f9fafb;
          padding: 1rem;
          border-radius: 6px;
          margin-bottom: 1rem;
        }
        .printer-section dl {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 0.375rem 1rem;
          margin: 0;
        }
        .printer-section dt { font-weight: 600; color: #4b5563; }
        .printer-section dd { margin: 0; }
        .evidence-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .evidence-list li {
          padding: 0.25rem 0;
          color: #16a34a;
        }
        .evidence-incomplete {
          background: #fef3cd;
          color: #92400e;
          padding: 0.75rem;
          border-radius: 4px;
        }
        .moderated-banner {
          padding: 0.75rem;
          background: #fef3cd;
          color: #92400e;
          border-radius: 4px;
          margin-bottom: 1rem;
        }
        .inventory-row {
          display: flex;
          justify-content: space-between;
          padding: 0.25rem 0;
        }
        .product-actions { margin-top: 1rem; }
        .report-btn {
          padding: 0.5rem 1rem;
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fca5a5;
          border-radius: 4px;
          cursor: pointer;
        }
        .loading-banner,
        .error-banner,
        .blocked {
          padding: 2rem;
          text-align: center;
          border-radius: 6px;
        }
        .loading-banner { background: #f3f4f6; }
        .error-banner { background: #fee2e2; color: #991b1b; }
        .blocked { background: #fff7ed; color: #6b7280; }
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          border: 0;
        }
      `}</style>
    </div>
  );
}
