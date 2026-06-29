'use client';

import { useState, type ReactElement } from 'react';
import {
  createEmptyPricingEditorDraft,
  lineItemCodeLabels,
  type PricingEditorDraft,
} from './pricing-calculator-demo.js';

export type PricingCalculatorScreenProps = Readonly<{
  initialDraft?: PricingEditorDraft;
  onCalculate?: (input: CalculatorFormState) => CalculatorResultDisplay;
}>;

export type CalculatorFormState = Readonly<{
  colorCode: string;
  estimatedMinutes: number;
  hasSupport: boolean;
  isRush: boolean;
  materialCode: string;
  qualityCode: string;
  quantity: number;
  volumeGrams: number;
}>;

export type CalculatorResultDisplay = Readonly<{
  lineItems: ReadonlyArray<{ amountMinor: number; code: string }>;
  totalMinor: number;
  minimumOrderMinor: number;
}>;

function defaultCalculatorForm(): CalculatorFormState {
  return {
    colorCode: 'BLACK',
    estimatedMinutes: 60,
    hasSupport: true,
    isRush: false,
    materialCode: 'PLA',
    qualityCode: 'STANDARD',
    quantity: 1,
    volumeGrams: 50,
  };
}

export function PricingCalculatorScreen(
  props: PricingCalculatorScreenProps,
): ReactElement {
  const [draft] = useState<PricingEditorDraft>(
    props.initialDraft ?? createEmptyPricingEditorDraft(),
  );
  const [form, setForm] = useState<CalculatorFormState>(
    defaultCalculatorForm(),
  );
  const [result, setResult] = useState<CalculatorResultDisplay | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  function handleCalculate(): void {
    const r = props.onCalculate?.(form);
    if (r) {
      setResult(r);
    }
  }

  const statusLabel =
    draft.status === 'ACTIVE'
      ? 'ใช้งาน'
      : draft.status === 'RETIRED'
        ? 'เลิกใช้งาน'
        : 'ร่าง';
  const statusClass =
    draft.status === 'ACTIVE'
      ? 'status-active'
      : draft.status === 'RETIRED'
        ? 'status-retired'
        : 'status-draft';

  return (
    <div className="pricing-calculator">
      <h2>เครื่องคำนวณราคา</h2>

      {/* Profile status banner */}
      <div className={`profile-status ${statusClass}`} role="status">
        <span className="status-label">{statusLabel}</span>
        {draft.status === 'DRAFT' && (
          <span className="effective-date">
            มีผลตั้งแต่: {draft.effectiveFrom.slice(0, 10)}
          </span>
        )}
      </div>

      {/* Input form */}
      <fieldset>
        <legend>ข้อมูลชิ้นงาน</legend>
        <div className="form-grid">
          <label>
            ปริมาตร (กรัม)
            <input
              type="number"
              min={0}
              step={1}
              value={form.volumeGrams}
              onChange={(e) =>
                setForm({ ...form, volumeGrams: Number(e.target.value) })
              }
              aria-label="ปริมาตรชิ้นงานในหน่วยกรัม"
            />
          </label>
          <label>
            เวลาผลิต (นาที)
            <input
              type="number"
              min={0}
              step={1}
              value={form.estimatedMinutes}
              onChange={(e) =>
                setForm({ ...form, estimatedMinutes: Number(e.target.value) })
              }
              aria-label="เวลาที่ใช้ในการผลิตในหน่วยนาที"
            />
          </label>
          <label>
            จำนวน
            <input
              type="number"
              min={1}
              step={1}
              value={form.quantity}
              onChange={(e) =>
                setForm({
                  ...form,
                  quantity: Math.max(1, Number(e.target.value)),
                })
              }
              aria-label="จำนวนชิ้นที่ต้องการ"
            />
          </label>
          <label>
            วัสดุ
            <select
              value={form.materialCode}
              onChange={(e) =>
                setForm({ ...form, materialCode: e.target.value })
              }
              aria-label="เลือกวัสดุ"
            >
              <option value="PLA">PLA</option>
              <option value="ABS">ABS</option>
              <option value="PETG">PETG</option>
              <option value="TPU">TPU</option>
              <option value="RESIN">RESIN</option>
              <option value="PA12">PA12</option>
            </select>
          </label>
          <label>
            ความละเอียด
            <select
              value={form.qualityCode}
              onChange={(e) =>
                setForm({ ...form, qualityCode: e.target.value })
              }
              aria-label="เลือกความละเอียด"
            >
              <option value="DRAFT">ร่าง</option>
              <option value="STANDARD">มาตรฐาน</option>
              <option value="FINE">ละเอียด</option>
            </select>
          </label>
          <label>
            สี
            <select
              value={form.colorCode}
              onChange={(e) => setForm({ ...form, colorCode: e.target.value })}
              aria-label="เลือกสี"
            >
              <option value="BLACK">ดำ</option>
              <option value="WHITE">ขาว</option>
              <option value="BLUE">น้ำเงิน</option>
              <option value="RED">แดง</option>
              <option value="CLEAR">ใส</option>
              <option value="NATURAL">ธรรมชาติ</option>
            </select>
          </label>
        </div>
        <div className="checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={form.hasSupport}
              onChange={(e) =>
                setForm({ ...form, hasSupport: e.target.checked })
              }
            />
            มี Support Structure
          </label>
          <label>
            <input
              type="checkbox"
              checked={form.isRush}
              onChange={(e) => setForm({ ...form, isRush: e.target.checked })}
            />
            ด่วน
          </label>
        </div>
      </fieldset>

      <button
        type="button"
        className="calculate-btn"
        onClick={handleCalculate}
        aria-label="คำนวณราคา"
      >
        คำนวณราคา
      </button>

      {/* Result display */}
      {result && (
        <div
          className="calculator-result"
          role="region"
          aria-label="ผลการคำนวณราคา"
        >
          <h3>ผลการคำนวณ</h3>
          <table className="line-items" aria-label="รายการคิดเงิน">
            <thead>
              <tr>
                <th>รายการ</th>
                <th>จำนวนเงิน</th>
              </tr>
            </thead>
            <tbody>
              {result.lineItems.map((li) => (
                <tr key={li.code}>
                  <td>{lineItemCodeLabels[li.code] ?? li.code}</td>
                  <td className="amount">
                    {li.amountMinor.toLocaleString('th-TH')}
                    {li.amountMinor < 0 && (
                      <span className="discount-badge">ส่วนลด</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th>รวมทั้งสิ้น</th>
                <th className="amount">
                  {result.totalMinor.toLocaleString('th-TH')}
                </th>
              </tr>
            </tfoot>
          </table>
          <p className="min-order-note">
            * ยอดสั่งซื้อขั้นต่ำ:{' '}
            {result.minimumOrderMinor.toLocaleString('th-TH')}
          </p>
        </div>
      )}

      {/* Show/hide formula details */}
      <button
        type="button"
        className="details-toggle"
        onClick={() => setShowDetails(!showDetails)}
        aria-expanded={showDetails}
        aria-label="แสดงรายละเอียดสูตร"
      >
        {showDetails ? 'ซ่อน' : 'แสดง'}รายละเอียดสูตร
      </button>
      {showDetails && (
        <div
          className="formula-details"
          role="region"
          aria-label="รายละเอียดสูตรคำนวณ"
        >
          <h3>รายละเอียดสูตรคำนวณ</h3>
          <dl>
            <dt>ยอดขั้นต่ำ</dt>
            <dd>{draft.formula.minimumOrderMinor.toLocaleString('th-TH')}</dd>
            <dt>ค่าวัสดุต่อกรัม</dt>
            <dd>{draft.formula.materialRateMinorPerGram}</dd>
            <dt>ค่าเครื่องจักรต่อนาที</dt>
            <dd>{draft.formula.machineRateMinorPerMinute}</dd>
            <dt>ค่าเตรียมงาน</dt>
            <dd>{draft.formula.setupFeeMinor.toLocaleString('th-TH')}</dd>
            <dt>ค่า Support</dt>
            <dd>{(draft.formula.supportMultiplierBps / 100).toFixed(2)}%</dd>
            <dt>ค่าความเสี่ยง</dt>
            <dd>{(draft.formula.riskBufferBps / 100).toFixed(2)}%</dd>
            <dt>ค่าด่วน</dt>
            <dd>{(draft.formula.rushMultiplierBps / 100).toFixed(2)}%</dd>
            <dt>ส่วนลดจำนวน</dt>
            <dd>{(draft.formula.quantityDiscountBps / 100).toFixed(2)}%</dd>
            <dt>ค่าธรรมเนียม</dt>
            <dd>{(draft.formula.platformFeeBps / 100).toFixed(2)}%</dd>
            <dt>ค่าแรง</dt>
            <dd>{(draft.formula.laborMultiplierBps / 100).toFixed(2)}%</dd>
            <dt>ค่าจัดส่ง</dt>
            <dd>{draft.formula.shippingMinor.toLocaleString('th-TH')}</dd>
            <dt>ภาษี</dt>
            <dd>{(draft.formula.taxRateBps / 100).toFixed(2)}%</dd>
          </dl>
        </div>
      )}

      <style>{`
        .pricing-calculator {
          font-family: system-ui, -apple-system, sans-serif;
          max-width: 640px;
          margin: 0 auto;
          padding: 1.5rem;
        }
        .pricing-calculator h2 {
          margin: 0 0 1rem;
          font-size: 1.5rem;
        }
        .profile-status {
          padding: 0.5rem 1rem;
          border-radius: 6px;
          margin-bottom: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .status-draft { background: #fff3cd; color: #856404; }
        .status-active { background: #d4edda; color: #155724; }
        .status-retired { background: #e2e3e5; color: #383d41; }
        .status-label { font-weight: 600; }
        .effective-date { font-size: 0.875rem; }
        fieldset {
          border: 1px solid #ccc;
          border-radius: 6px;
          padding: 1rem;
          margin-bottom: 1rem;
        }
        legend { font-weight: 600; padding: 0 0.5rem; }
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
        }
        .form-grid label {
          display: flex;
          flex-direction: column;
          font-size: 0.875rem;
          gap: 0.25rem;
        }
        .form-grid input,
        .form-grid select {
          padding: 0.375rem 0.5rem;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 1rem;
        }
        .checkbox-group {
          display: flex;
          gap: 1.5rem;
          margin-top: 0.75rem;
        }
        .checkbox-group label {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.875rem;
        }
        .calculate-btn {
          display: block;
          width: 100%;
          padding: 0.625rem;
          background: #007bff;
          color: #fff;
          border: none;
          border-radius: 6px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          margin-bottom: 1rem;
        }
        .calculate-btn:hover { background: #0056b3; }
        .calculator-result {
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 6px;
          padding: 1rem;
          margin-bottom: 1rem;
        }
        .calculator-result h3 { margin: 0 0 0.75rem; font-size: 1.125rem; }
        .line-items { width: 100%; border-collapse: collapse; }
        .line-items th,
        .line-items td {
          padding: 0.375rem 0.5rem;
          text-align: left;
          border-bottom: 1px solid #dee2e6;
        }
        .line-items tfoot th { border-top: 2px solid #333; }
        .amount { text-align: right; font-variant-numeric: tabular-nums; }
        .discount-badge {
          display: inline-block;
          font-size: 0.75rem;
          background: #28a745;
          color: #fff;
          padding: 0.125rem 0.375rem;
          border-radius: 3px;
          margin-left: 0.375rem;
        }
        .min-order-note {
          font-size: 0.8rem;
          color: #666;
          margin: 0.5rem 0 0;
        }
        .details-toggle {
          background: none;
          border: 1px solid #ccc;
          border-radius: 4px;
          padding: 0.375rem 0.75rem;
          font-size: 0.875rem;
          cursor: pointer;
        }
        .details-toggle:hover { background: #f0f0f0; }
        .formula-details {
          margin-top: 0.75rem;
          padding: 0.75rem;
          background: #f8f9fa;
          border-radius: 6px;
        }
        .formula-details h3 { margin: 0 0 0.5rem; font-size: 1rem; }
        .formula-details dl {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.25rem 1rem;
          margin: 0;
        }
        .formula-details dt { font-weight: 600; font-size: 0.875rem; }
        .formula-details dd { margin: 0; font-size: 0.875rem; }
      `}</style>
    </div>
  );
}
