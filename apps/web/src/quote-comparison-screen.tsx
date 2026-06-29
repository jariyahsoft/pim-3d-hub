'use client';

import { useState, type ReactElement } from 'react';
import {
  createEmptyManualFallbackDraft,
  demoManualFallbackReason,
  eligibilityReasonLabels,
  emptyQuoteCards,
  lineItemLabel,
  type DemoQuoteCard,
  type ManualFallbackDraft,
} from './quote-comparison-demo.js';

export type QuoteComparisonScreenProps = Readonly<{
  fileAssetId?: string | null;
  initialCards?: readonly DemoQuoteCard[];
  fallbackReasons?: readonly string[];
  onProceedToCheckout?: (quoteId: string) => void;
  onManualFallback?: (draft: ManualFallbackDraft) => void;
  onAddToCompare?: (quoteId: string) => void;
}>;

export type ManualFallbackReasonCode =
  | 'ANALYSIS_FAILED'
  | 'BUILD_VOLUME_EXCEEDED'
  | 'MANUAL_REVIEW_REQUIRED'
  | 'UNIT_AMBIGUITY';

export function QuoteComparisonScreen(
  props: QuoteComparisonScreenProps,
): ReactElement {
  const cards = props.initialCards ?? emptyQuoteCards;
  const fallbackReasons = props.fallbackReasons ?? [];

  const [compareSet, setCompareSet] = useState<ReadonlySet<string>>(
    new Set<string>(),
  );
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [showFallbackForm, setShowFallbackForm] = useState(
    fallbackReasons.length > 0,
  );
  const [fallbackDraft, setFallbackDraft] = useState<ManualFallbackDraft>(
    createEmptyManualFallbackDraft(),
  );

  function toggleCompare(quoteId: string): void {
    const next = new Set(compareSet);
    if (next.has(quoteId)) {
      next.delete(quoteId);
    } else {
      if (next.size >= 2) {
        next.delete(Array.from(next)[0]);
      }
      next.add(quoteId);
    }
    setCompareSet(next);
    props.onAddToCompare?.(quoteId);
  }

  function formatMinor(amountMinor: number, currency: string): string {
    return `${amountMinor.toLocaleString('th-TH')} ${currency}`;
  }

  function formatExpiry(expiresAt: string): string {
    const ms = new Date(expiresAt).getTime() - Date.now();
    const minutes = Math.floor(ms / 60000);
    if (minutes < 60) return `${minutes} นาที`;
    const hours = Math.floor(minutes / 60);
    return `${hours} ชั่วโมง`;
  }

  return (
    <div className="quote-comparison">
      <h2>เปรียบเทียบราคา</h2>

      {showFallbackForm && fallbackReasons.length > 0 ? (
        <ManualFallback
          draft={fallbackDraft}
          reasons={fallbackReasons}
          onChange={setFallbackDraft}
          onSubmit={() => {
            props.onManualFallback?.(fallbackDraft);
            setShowFallbackForm(false);
          }}
        />
      ) : (
        <CompareView
          cards={cards}
          compareSet={compareSet}
          expandedCardId={expandedCardId}
          selectedQuoteId={selectedQuoteId}
          formatExpiry={formatExpiry}
          formatMinor={formatMinor}
          onChangeExpandedCardId={setExpandedCardId}
          onProceedToCheckout={(id) => {
            setSelectedQuoteId(id);
            props.onProceedToCheckout?.(id);
          }}
          onToggleCompare={toggleCompare}
        />
      )}

      {fallbackReasons.length > 0 && !showFallbackForm && (
        <div className="fallback-prompt">
          <h3>ไม่สามารถคำนวณราคาอัตโนมัติได้</h3>
          <p>{demoManualFallbackReason}</p>
          <button
            type="button"
            onClick={() => setShowFallbackForm(true)}
            className="fallback-btn"
          >
            ขอให้ผู้ให้บริการประเมินราคา
          </button>
        </div>
      )}

      <style>{`
        .quote-comparison {
          max-width: 880px;
          margin: 0 auto;
          padding: 1.5rem;
        }
        .quote-comparison h2 { font-size: 1.5rem; margin: 0 0 1rem; }
        .quote-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .quote-card {
          background: #fff;
          border: 1px solid #e1e5eb;
          border-radius: 8px;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          position: relative;
        }
        .quote-card.selected {
          border-color: #2563eb;
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
        }
        .quote-card.capacity-changed {
          border-color: #d97706;
          background: #fffbeb;
        }
        .provider-name {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: 600;
          font-size: 1.125rem;
        }
        .verified-badge {
          background: #16a34a;
          color: #fff;
          padding: 0.125rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 500;
        }
        .sponsored-badge {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          background: #f97316;
          color: #fff;
          padding: 0.125rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
        }
        .sponsored-note {
          font-size: 0.75rem;
          color: #6b7280;
          font-style: italic;
          margin-top: 0.25rem;
        }
        .total-price {
          font-size: 1.5rem;
          font-weight: 700;
          color: #2563eb;
          font-variant-numeric: tabular-nums;
        }
        .meta-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.875rem;
          color: #4b5563;
        }
        .capacity-bar {
          height: 6px;
          background: #e5e7eb;
          border-radius: 3px;
          overflow: hidden;
        }
        .capacity-fill {
          height: 100%;
          background: #16a34a;
        }
        .capacity-fill.low { background: #f59e0b; }
        .actions-row {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }
        .action-btn {
          flex: 1;
          padding: 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          background: #fff;
          font-size: 0.875rem;
          cursor: pointer;
        }
        .action-btn:hover { background: #f3f4f6; }
        .action-btn.compare-selected {
          background: #2563eb;
          color: #fff;
          border-color: #2563eb;
        }
        .action-btn.primary {
          background: #2563eb;
          color: #fff;
          border-color: #2563eb;
        }
        .action-btn.primary:hover { background: #1d4ed8; }
        .breakdown-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
          margin-top: 0.5rem;
        }
        .breakdown-table th,
        .breakdown-table td {
          padding: 0.25rem 0.5rem;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }
        .breakdown-table td:last-child {
          text-align: right;
          font-variant-numeric: tabular-nums;
        }
        .line-items-toggle {
          background: none;
          border: none;
          color: #2563eb;
          font-size: 0.875rem;
          padding: 0;
          cursor: pointer;
          text-align: left;
        }
        .line-items-toggle:hover { text-decoration: underline; }
        .capacity-warning {
          font-size: 0.875rem;
          color: #b45309;
          font-weight: 500;
        }
        .expires-in {
          background: #fef3c7;
          color: #92400e;
          padding: 0.125rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
        }
        .empty-state {
          text-align: center;
          padding: 3rem 1rem;
          color: #6b7280;
        }
        .fallback-prompt {
          margin-top: 1.5rem;
          padding: 1.5rem;
          background: #fef3c7;
          border-radius: 8px;
        }
        .fallback-prompt h3 {
          margin: 0 0 0.5rem;
          color: #92400e;
        }
        .fallback-prompt p { margin: 0 0 1rem; }
        .fallback-btn {
          padding: 0.625rem 1.25rem;
          background: #d97706;
          color: #fff;
          border: none;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
        }
        .fallback-btn:hover { background: #b45309; }
        .fallback-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .reason-list {
          padding-left: 1.5rem;
          margin: 0;
        }
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
        }
        .form-grid label {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          font-size: 0.875rem;
        }
        .form-grid input,
        .form-grid select,
        .form-grid textarea {
          padding: 0.375rem 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 1rem;
        }
        .full-row { grid-column: 1 / -1; }
      `}</style>
    </div>
  );
}

// ── Compare View ──────────────────────────────────────────────────────────

type CompareViewProps = Readonly<{
  cards: readonly DemoQuoteCard[];
  compareSet: ReadonlySet<string>;
  expandedCardId: string | null;
  selectedQuoteId: string | null;
  formatExpiry: (expiresAt: string) => string;
  formatMinor: (amountMinor: number, currency: string) => string;
  onChangeExpandedCardId: (id: string | null) => void;
  onProceedToCheckout: (quoteId: string) => void;
  onToggleCompare: (quoteId: string) => void;
}>;

function CompareView(props: CompareViewProps): ReactElement {
  const {
    cards,
    compareSet,
    expandedCardId,
    selectedQuoteId,
    formatExpiry,
    formatMinor,
    onChangeExpandedCardId,
    onProceedToCheckout,
    onToggleCompare,
  } = props;

  if (cards.length === 0) {
    return (
      <div className="empty-state">
        <p>ไม่พบราคาที่เปรียบเทียบได้ในขณะนี้</p>
      </div>
    );
  }

  return (
    <>
      <div
        className="quote-grid"
        role="region"
        aria-label="ผลลัพธ์การเปรียบเทียบ"
      >
        {cards.map((card) => {
          const isCompared = compareSet.has(card.id);
          const isSelected = selectedQuoteId === card.id;
          const isExpanded = expandedCardId === card.id;
          const availableFraction =
            card.availableCapacity / Math.max(1, card.capacityTotal);
          return (
            <article
              key={card.id}
              className={`quote-card ${isSelected ? 'selected' : ''} ${card.capacityChanged ? 'capacity-changed' : ''}`}
              aria-labelledby={`provider-${card.id}`}
            >
              {card.sponsored && (
                <span
                  className="sponsored-badge"
                  role="note"
                  aria-label="ผู้ให้บริการที่ได้รับการส่งเสริม"
                >
                  โฆษณา
                </span>
              )}

              <div className="provider-name">
                <span id={`provider-${card.id}`}>{card.providerName}</span>
                {card.verified && (
                  <span className="verified-badge" aria-label="ยืนยันแล้ว">
                    ✓ ยืนยัน
                  </span>
                )}
              </div>

              <div className="total-price" aria-label="ราคารวม">
                {formatMinor(card.totalMinor, card.currency)}
              </div>

              <div className="meta-row">
                <span>
                  ★ {card.ratingAverage} ({card.ratingCount})
                </span>
                <span className="expires-in">
                  หมดอายุใน {formatExpiry(card.expiresAt)}
                </span>
              </div>

              <div className="meta-row">
                <span>
                  {card.printerTechnology} · {card.materialCode} ·{' '}
                  {card.colorCode} · {card.qualityCode}
                </span>
              </div>

              <div className="meta-row">
                <span>
                  {card.pickupOnly
                    ? 'รับเองที่ร้าน'
                    : `${card.distanceKm?.toFixed(1)} กม.`}
                </span>
                <span>
                  ประมาณ {Math.round(card.estimateMinutes / 60)} ชั่วโมง
                </span>
              </div>

              <div>
                <div className="capacity-bar">
                  <div
                    className={`capacity-fill ${availableFraction < 0.3 ? 'low' : ''}`}
                    style={{ width: `${availableFraction * 100}%` }}
                    role="progressbar"
                    aria-valuenow={card.availableCapacity}
                    aria-valuemin={0}
                    aria-valuemax={card.capacityTotal}
                  />
                </div>
                <small className="meta-row">
                  คิวว่าง {card.availableCapacity}/{card.capacityTotal}
                </small>
              </div>

              {card.capacityChanged && (
                <span className="capacity-warning" role="alert">
                  ⚠ คิวเปลี่ยนหลังคำนวณราคา กรุณาตรวจสอบใหม่
                </span>
              )}

              {card.sponsored && (
                <span className="sponsored-note">
                  ผลลัพธ์นี้ได้รับการส่งเสริม — คะแนนและรีวิวไม่ได้รับผลกระทบ
                </span>
              )}

              <button
                type="button"
                className="line-items-toggle"
                onClick={() =>
                  onChangeExpandedCardId(isExpanded ? null : card.id)
                }
                aria-expanded={isExpanded}
                aria-label={
                  isExpanded ? 'ซ่อนรายการคิดเงิน' : 'แสดงรายการคิดเงิน'
                }
              >
                {isExpanded ? 'ซ่อน' : 'แสดง'}รายการคิดเงิน
              </button>

              {isExpanded && (
                <table className="breakdown-table" aria-label="รายการคิดเงิน">
                  <tbody>
                    {card.lineItems.map((li) => (
                      <tr key={li.code}>
                        <td>{lineItemLabel(li.code)}</td>
                        <td>{formatMinor(li.amountMinor, card.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <div className="actions-row">
                <button
                  type="button"
                  className={`action-btn ${isCompared ? 'compare-selected' : ''}`}
                  aria-pressed={isCompared}
                  onClick={() => onToggleCompare(card.id)}
                >
                  {isCompared ? 'เปรียบเทียบแล้ว' : 'เปรียบเทียบ'}
                </button>
                <button
                  type="button"
                  className="action-btn primary"
                  onClick={() => onProceedToCheckout(card.id)}
                  aria-label={`เลือก ${card.providerName} และไปชำระเงิน`}
                >
                  เลือกนี้
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}

// ── Manual Fallback ───────────────────────────────────────────────────────

type ManualFallbackProps = Readonly<{
  draft: ManualFallbackDraft;
  reasons: readonly string[];
  onChange: (draft: ManualFallbackDraft) => void;
  onSubmit: () => void;
}>;

function ManualFallback(props: ManualFallbackProps): ReactElement {
  const { draft, reasons, onChange, onSubmit } = props;

  return (
    <div className="quote-comparison">
      <h2>ขอให้ผู้ให้บริการประเมินราคา</h2>

      <ul className="reason-list" aria-label="เหตุผลที่ไม่สามารถคำนวณอัตโนมัติ">
        {reasons.map((r) => (
          <li key={r}>{eligibilityReasonLabels[r] ?? r}</li>
        ))}
      </ul>

      <p>ระบบจะนำไฟล์และตัวเลือกเดิมไปใช้ ไม่ต้องอัปโหลดใหม่</p>

      <form
        className="fallback-form"
        aria-label="ฟอร์มประเมินราคาแบบแมนนวล"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <div className="form-grid">
          <label>
            งบประมาณ (บาท)
            <input
              type="number"
              min={0}
              value={draft.budgetMinor ?? ''}
              onChange={(e) =>
                onChange({
                  ...draft,
                  budgetMinor: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          </label>
          <label>
            กำหนดส่ง
            <input
              type="date"
              value={draft.dueAt.slice(0, 10)}
              onChange={(e) =>
                onChange({
                  ...draft,
                  dueAt: e.target.value ? `${e.target.value}T00:00:00Z` : '',
                })
              }
            />
          </label>
          <label>
            จำนวน
            <input
              type="number"
              min={1}
              value={draft.quantity}
              onChange={(e) =>
                onChange({
                  ...draft,
                  quantity: Math.max(1, Number(e.target.value)),
                })
              }
            />
          </label>
          <label>
            วัสดุ
            <select
              value={draft.materialCode}
              onChange={(e) =>
                onChange({ ...draft, materialCode: e.target.value })
              }
            >
              <option value="PLA">PLA</option>
              <option value="ABS">ABS</option>
              <option value="PETG">PETG</option>
              <option value="TPU">TPU</option>
              <option value="RESIN">เรซิน</option>
            </select>
          </label>
          <label>
            ความละเอียด
            <select
              value={draft.qualityCode}
              onChange={(e) =>
                onChange({ ...draft, qualityCode: e.target.value })
              }
            >
              <option value="DRAFT">ร่าง</option>
              <option value="STANDARD">มาตรฐาน</option>
              <option value="FINE">ละเอียด</option>
            </select>
          </label>
          <label>
            สี
            <select
              value={draft.colorCode}
              onChange={(e) =>
                onChange({ ...draft, colorCode: e.target.value })
              }
            >
              <option value="BLACK">ดำ</option>
              <option value="WHITE">ขาว</option>
              <option value="BLUE">น้ำเงิน</option>
              <option value="RED">แดง</option>
            </select>
          </label>
          <label className="full-row">
            ที่อยู่จัดส่ง (เว้นว่างถ้ารับเอง)
            <input
              type="text"
              value={draft.deliveryAddress}
              onChange={(e) =>
                onChange({ ...draft, deliveryAddress: e.target.value })
              }
            />
          </label>
          <label className="full-row">
            รายละเอียดเพิ่มเติม
            <textarea
              rows={3}
              value={draft.requirements}
              onChange={(e) =>
                onChange({ ...draft, requirements: e.target.value })
              }
            />
          </label>
        </div>

        <div>
          <label>
            <input
              type="checkbox"
              checked={draft.pickupOnly}
              onChange={(e) =>
                onChange({ ...draft, pickupOnly: e.target.checked })
              }
            />
            รับเองที่ร้าน (ไม่ต้องจัดส่ง)
          </label>
        </div>

        <button type="submit" className="fallback-btn">
          ส่งคำขอประเมินราคา
        </button>
      </form>
    </div>
  );
}
