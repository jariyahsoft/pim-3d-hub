'use client';

import { useState, type ReactElement } from 'react';
import type { GateResult, Phase1BVerificationReport } from '@pim/application';
import {
  formatReadinessReport,
  phase1bReadinessReport,
} from './verification-report-demo.js';

export type VerificationScreenProps = Readonly<{
  initialReport?: Phase1BVerificationReport;
  onRunGates?: () => Promise<Phase1BVerificationReport>;
}>;

export function VerificationScreen(
  props: VerificationScreenProps,
): ReactElement {
  const [report, setReport] = useState<Phase1BVerificationReport | null>(
    props.initialReport ?? null,
  );
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleRun(): Promise<void> {
    if (!props.onRunGates) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const r = await props.onRunGates();
      setReport(r);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'ไม่สามารถเรียกใช้การตรวจสอบ',
      );
    } finally {
      setLoading(false);
    }
  }

  const readiness =
    report?.summary.readiness ?? phase1bReadinessReport.summary.readiness;

  return (
    <div className="verification-screen">
      <h2>Phase 1B Readiness Report — {readiness}</h2>

      {errorMessage && (
        <div className="error-banner" role="alert" aria-live="polite">
          {errorMessage}
        </div>
      )}

      {report && <ReportSummary report={report} />}

      {report && (
        <section className="gates-section" aria-labelledby="gates-heading">
          <h3 id="gates-heading">เกตตรวจสอบ</h3>
          <ul className="gate-list" role="list">
            {report.gates.map((gate) => (
              <li key={gate.gateId}>
                <GateItem gate={gate} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="actions">
        <button
          type="button"
          onClick={handleRun}
          disabled={loading || !props.onRunGates}
          aria-busy={loading}
          className="run-button"
        >
          {loading ? 'กำลังตรวจสอบ...' : 'เรียกใช้การตรวจสอบ'}
        </button>
        <details className="report-details">
          <summary>ข้อมูลรายงาน (ข้อความ)</summary>
          <pre aria-label="ข้อความรายงาน">
            {formatReadinessReport(
              report ??
                (phase1bReadinessReport as unknown as Phase1BVerificationReport),
            )}
          </pre>
        </details>
      </section>

      <style>{`
        .verification-screen {
          max-width: 880px;
          margin: 0 auto;
          padding: 1.5rem;
          font-family: system-ui, -apple-system, sans-serif;
        }
        h2 { margin: 0 0 1rem; }
        h3 { margin: 0 0 0.5rem; font-size: 1.125rem; }
        .readiness-banner {
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1rem;
        }
        .readiness-ready {
          background: #d4edda;
          color: #155724;
        }
        .readiness-not-ready {
          background: #f8d7da;
          color: #721c24;
        }
        .readiness-banner strong { font-size: 1.125rem; }
        .summary-stats {
          display: flex;
          gap: 1rem;
          margin-top: 0.5rem;
        }
        .gates-section { margin-bottom: 1rem; }
        .gate-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .gate-list > li { margin-bottom: 0.5rem; }
        .gate-item {
          display: flex;
          gap: 1rem;
          align-items: flex-start;
          padding: 0.75rem;
          border: 1px solid #e1e5eb;
          border-radius: 6px;
          background: #fff;
        }
        .gate-status {
          flex: 0 0 auto;
          width: 2rem;
          height: 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          color: #fff;
          font-weight: 700;
        }
        .gate-status.passed { background: #16a34a; }
        .gate-status.failed { background: #dc2626; }
        .gate-body { flex: 1; }
        .gate-name { font-weight: 600; margin-bottom: 0.25rem; }
        .gate-evidence {
          font-size: 0.875rem;
          color: #4b5563;
          margin: 0;
        }
        .error-banner {
          padding: 0.75rem 1rem;
          background: #fee2e2;
          color: #991b1b;
          border-radius: 6px;
          margin-bottom: 1rem;
        }
        .actions {
          margin-top: 1rem;
        }
        .run-button {
          padding: 0.625rem 1.25rem;
          background: #2563eb;
          color: #fff;
          border: none;
          border-radius: 6px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
        }
        .run-button:hover { background: #1d4ed8; }
        .run-button:disabled {
          background: #cbd5e1;
          cursor: not-allowed;
        }
        .report-details {
          margin-top: 1rem;
          padding: 0.5rem;
          border: 1px solid #e1e5eb;
          border-radius: 4px;
        }
        pre {
          font-family: monospace;
          font-size: 0.875rem;
          white-space: pre-wrap;
          margin: 0;
        }
      `}</style>
    </div>
  );
}

function ReportSummary({
  report,
}: {
  report: Phase1BVerificationReport;
}): ReactElement {
  const isReady = report.summary.readiness === 'READY';
  return (
    <div
      className={`readiness-banner ${isReady ? 'readiness-ready' : 'readiness-not-ready'}`}
      role="status"
    >
      <strong>
        {isReady ? 'พร้อมใช้งาน' : 'ยังไม่พร้อม'} — Phase {report.phase}
      </strong>
      <div className="summary-stats">
        <span>ผ่าน {report.summary.passed}</span>
        <span>ไม่ผ่าน {report.summary.failed}</span>
        <span>ทั้งหมด {report.summary.total}</span>
      </div>
    </div>
  );
}

function GateItem({ gate }: { gate: GateResult }): ReactElement {
  return (
    <article className="gate-item" aria-label={gate.name}>
      <span
        className={`gate-status ${gate.passed ? 'passed' : 'failed'}`}
        aria-hidden
      >
        {gate.passed ? '✓' : '✗'}
      </span>
      <div className="gate-body">
        <div className="gate-name">{gate.name}</div>
        <p className="gate-evidence">{gate.evidence}</p>
      </div>
    </article>
  );
}
