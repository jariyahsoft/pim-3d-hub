'use client';

import { useState, type ReactElement } from 'react';
import {
  analysisAriaLabel,
  demoAnalysisDraft,
  isProgressState,
  type AnalysisDraft,
  type AnalysisState,
} from './analysis-demo.js';

export type AnalysisScreenProps = Readonly<{
  initialDraft?: AnalysisDraft;
  initialLoading?: boolean;
  onRetry?: () => void | Promise<void>;
  onManualFallback?: () => void | Promise<void>;
  onProceedToQuote?: () => void | Promise<void>;
  storageKey?: string;
}>;

const stateIcons: Record<AnalysisState, string> = {
  pending: '⏳',
  scanning: '🛡️',
  analyzing: '🔍',
  ready: '✅',
  warning: '⚠️',
  manual_fallback: '📝',
  rejected: '🚫',
  failed: '❌',
};

const stateTitles: Record<AnalysisState, string> = {
  pending: 'รอการวิเคราะห์',
  scanning: 'กำลังสแกนไฟล์',
  analyzing: 'กำลังวิเคราะห์โมเดล',
  ready: 'การวิเคราะห์เสร็จสมบูรณ์',
  warning: 'การวิเคราะห์มีข้อควรระวัง',
  manual_fallback: 'จำเป็นต้องใช้การส่งคำขอด้วยตนเอง',
  rejected: 'ไฟล์ไม่ผ่านการวิเคราะห์',
  failed: 'การวิเคราะห์ล้มเหลว',
};

export function AnalysisScreen(props: AnalysisScreenProps): ReactElement {
  const [draft] = useState<AnalysisDraft>(
    props.initialDraft ?? demoAnalysisDraft,
  );
  const [loading] = useState(props.initialLoading ?? false);

  const state = draft.currentState;

  return (
    <div
      className="analysis-screen"
      role="region"
      aria-label="วิเคราะห์โมเดล 3D"
    >
      {/* ARIA live region */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {analysisAriaLabel(state, draft.filename)}
      </div>

      <h2 className="analysis-screen__title">วิเคราะห์โมเดล</h2>

      {/* Loading overlay */}
      {loading && (
        <div
          className="analysis-screen__loading"
          role="status"
          aria-label="กำลังดำเนินการ"
        >
          <span>กำลังดำเนินการ...</span>
        </div>
      )}

      {/* File info */}
      {draft.filename && (
        <div className="analysis-screen__file-info">
          <p>
            <strong>ไฟล์:</strong> {draft.filename}
          </p>
          {draft.fileSize > 0 && (
            <p>
              <strong>ขนาด:</strong> {formatBytes(draft.fileSize)}
            </p>
          )}
          {draft.mimeType && (
            <p>
              <strong>ชนิด:</strong> {draft.mimeType}
            </p>
          )}
        </div>
      )}

      {/* Progress states */}
      {isProgressState(state) && (
        <div className="analysis-screen__progress" role="status">
          <div className="analysis-screen__state-icon" aria-hidden="true">
            {stateIcons[state]}
          </div>
          <p className="analysis-screen__state-title">{stateTitles[state]}</p>
          {draft.statusMessage && (
            <p className="analysis-screen__status-msg">{draft.statusMessage}</p>
          )}
          <div
            className="analysis-screen__progress-bar"
            role="progressbar"
            aria-valuenow={state === 'scanning' ? 30 : 70}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="analysis-screen__progress-fill"
              style={{ width: `${state === 'scanning' ? 30 : 70}%` }}
            />
          </div>
          <div className="analysis-screen__actions">
            <button
              className="analysis-screen__btn analysis-screen__btn--cancel"
              onClick={props.onRetry}
              aria-label="ยกเลิกและเริ่มใหม่"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      {/* Ready state */}
      {state === 'ready' && (
        <div
          className="analysis-screen__result analysis-screen__result--success"
          role="status"
        >
          <div className="analysis-screen__state-icon" aria-hidden="true">
            {stateIcons[state]}
          </div>
          <p className="analysis-screen__state-title">{stateTitles[state]}</p>
          <p className="analysis-screen__result-detail">
            โมเดลผ่านการวิเคราะห์และพร้อมสำหรับการตั้งราคา
          </p>
          <div className="analysis-screen__actions">
            <button
              className="analysis-screen__btn analysis-screen__btn--primary"
              onClick={props.onProceedToQuote}
              aria-label="ดำเนินการต่อเพื่อตั้งราคา"
            >
              ดำเนินการต่อ
            </button>
          </div>
        </div>
      )}

      {/* Warning state */}
      {state === 'warning' && (
        <div
          className="analysis-screen__result analysis-screen__result--warning"
          role="status"
        >
          <div className="analysis-screen__state-icon" aria-hidden="true">
            {stateIcons[state]}
          </div>
          <p className="analysis-screen__state-title">{stateTitles[state]}</p>
          {draft.warningMessages.length > 0 && (
            <ul className="analysis-screen__warnings">
              {draft.warningMessages.map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          )}
          <div className="analysis-screen__actions">
            <button
              className="analysis-screen__btn analysis-screen__btn--primary"
              onClick={props.onProceedToQuote}
              aria-label="ดำเนินการต่อแม้มีข้อควรระวัง"
            >
              ดำเนินการต่อ
            </button>
          </div>
        </div>
      )}

      {/* Manual fallback state */}
      {state === 'manual_fallback' && (
        <div
          className="analysis-screen__result analysis-screen__result--warning"
          role="alert"
        >
          <div className="analysis-screen__state-icon" aria-hidden="true">
            {stateIcons[state]}
          </div>
          <p className="analysis-screen__state-title">{stateTitles[state]}</p>
          <p className="analysis-screen__result-detail">
            ไม่สามารถวิเคราะห์ไฟล์นี้โดยอัตโนมัติได้
            คุณสามารถส่งคำขอให้ผู้รับบริการประเมินราคาแทนได้
          </p>
          {draft.fallbackPreserved && (
            <p className="analysis-screen__fallback-note">
              ✅ ไฟล์แนบและข้อมูลที่กรอกถูกบันทึกไว้แล้ว
            </p>
          )}
          <div className="analysis-screen__actions">
            <button
              className="analysis-screen__btn analysis-screen__btn--primary"
              onClick={props.onManualFallback}
              aria-label="ส่งคำขอให้ผู้รับบริการประเมิน"
            >
              ส่งคำขอด้วยตนเอง
            </button>
            <button
              className="analysis-screen__btn analysis-screen__btn--retry"
              onClick={props.onRetry}
              aria-label="ลองอีกครั้ง"
            >
              ลองอีกครั้ง
            </button>
          </div>
        </div>
      )}

      {/* Rejected state */}
      {state === 'rejected' && (
        <div
          className="analysis-screen__result analysis-screen__result--error"
          role="alert"
        >
          <div className="analysis-screen__state-icon" aria-hidden="true">
            {stateIcons[state]}
          </div>
          <p className="analysis-screen__state-title">{stateTitles[state]}</p>
          {draft.errorMessage && (
            <p className="analysis-screen__error-msg">{draft.errorMessage}</p>
          )}
          <div className="analysis-screen__actions">
            <button
              className="analysis-screen__btn analysis-screen__btn--retry"
              onClick={props.onRetry}
              aria-label="ลองอีกครั้งกับไฟล์อื่น"
            >
              ลองอีกครั้ง
            </button>
            <button
              className="analysis-screen__btn analysis-screen__btn--fallback"
              onClick={props.onManualFallback}
              aria-label="ส่งด้วยตนเองแทน"
            >
              ส่งด้วยตนเอง
            </button>
          </div>
        </div>
      )}

      {/* Failed state */}
      {state === 'failed' && (
        <div
          className="analysis-screen__result analysis-screen__result--error"
          role="alert"
        >
          <div className="analysis-screen__state-icon" aria-hidden="true">
            {stateIcons[state]}
          </div>
          <p className="analysis-screen__state-title">{stateTitles[state]}</p>
          {draft.errorMessage && (
            <p className="analysis-screen__error-msg">{draft.errorMessage}</p>
          )}
          <div className="analysis-screen__actions">
            <button
              className="analysis-screen__btn analysis-screen__btn--retry"
              onClick={props.onRetry}
              aria-label="ลองอีกครั้ง"
            >
              ลองอีกครั้ง
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MiB', 'GiB'];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** i;
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
