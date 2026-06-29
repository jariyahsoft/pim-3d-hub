import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AnalysisScreen } from './analysis-screen.js';
import {
  analysisAriaLabel,
  demoAnalysisDraft,
  demoWarningMessages,
  isProgressState,
  isTerminalState,
} from './analysis-demo.js';

describe('AnalysisScreen', () => {
  it('renders empty state', () => {
    const html = renderToStaticMarkup(<AnalysisScreen />);
    expect(html).toContain('วิเคราะห์โมเดล');
  });

  it('renders scanning state with progress', () => {
    const html = renderToStaticMarkup(
      <AnalysisScreen
        initialDraft={{
          ...demoAnalysisDraft,
          currentState: 'scanning',
          filename: 'model.stl',
          fileSize: 2048,
        }}
      />,
    );
    expect(html).toContain('กำลังสแกนไฟล์');
    expect(html).toContain('model.stl');
    expect(html).toContain('progressbar');
    expect(html).toContain('ยกเลิก');
  });

  it('renders analyzing state with progress', () => {
    const html = renderToStaticMarkup(
      <AnalysisScreen
        initialDraft={{
          ...demoAnalysisDraft,
          currentState: 'analyzing',
          filename: 'part.stl',
          statusMessage: 'กำลังคำนวณปริมาตร...',
        }}
      />,
    );
    expect(html).toContain('กำลังวิเคราะห์โมเดล');
    expect(html).toContain('กำลังคำนวณปริมาตร');
  });

  it('renders ready state with proceed button', () => {
    const html = renderToStaticMarkup(
      <AnalysisScreen
        initialDraft={{
          ...demoAnalysisDraft,
          currentState: 'ready',
          filename: 'done.stl',
        }}
      />,
    );
    expect(html).toContain('การวิเคราะห์เสร็จสมบูรณ์');
    expect(html).toContain('ดำเนินการต่อ');
  });

  it('renders warning state with messages and proceed button', () => {
    const html = renderToStaticMarkup(
      <AnalysisScreen
        initialDraft={{
          ...demoAnalysisDraft,
          currentState: 'warning',
          filename: 'warning.stl',
          warningMessages: demoWarningMessages,
        }}
      />,
    );
    expect(html).toContain('ข้อควรระวัง');
    expect(html).toContain('ผนังบางเกินไป');
    expect(html).toContain('overhang');
    expect(html).toContain('ดำเนินการต่อ');
  });

  it('renders manual_fallback state with preserved data note', () => {
    const html = renderToStaticMarkup(
      <AnalysisScreen
        initialDraft={{
          ...demoAnalysisDraft,
          currentState: 'manual_fallback',
          filename: 'unsupported.stl',
          fallbackPreserved: true,
        }}
      />,
    );
    expect(html).toContain('ส่งคำขอด้วยตนเอง');
    expect(html).toContain('ไฟล์แนบและข้อมูลที่กรอกถูกบันทึกไว้แล้ว');
    expect(html).toContain('ลองอีกครั้ง');
  });

  it('renders rejected state with retry and fallback', () => {
    const html = renderToStaticMarkup(
      <AnalysisScreen
        initialDraft={{
          ...demoAnalysisDraft,
          currentState: 'rejected',
          filename: 'bad.stl',
          errorMessage: 'ไฟล์มีรูปสามเหลี่ยมที่ผิดปกติ',
        }}
      />,
    );
    expect(html).toContain('ไฟล์ไม่ผ่านการวิเคราะห์');
    expect(html).toContain('รูปสามเหลี่ยมที่ผิดปกติ');
    expect(html).toContain('ลองอีกครั้ง');
    expect(html).toContain('ส่งด้วยตนเอง');
  });

  it('renders failed state with retry button', () => {
    const html = renderToStaticMarkup(
      <AnalysisScreen
        initialDraft={{
          ...demoAnalysisDraft,
          currentState: 'failed',
          errorMessage: 'เซิร์ฟเวอร์ไม่ตอบสนอง',
        }}
      />,
    );
    expect(html).toContain('การวิเคราะห์ล้มเหลว');
    expect(html).toContain('เซิร์ฟเวอร์ไม่ตอบสนอง');
    expect(html).toContain('ลองอีกครั้ง');
  });

  it('renders loading state', () => {
    const html = renderToStaticMarkup(<AnalysisScreen initialLoading />);
    expect(html).toContain('กำลังดำเนินการ');
  });
});

describe('analysis helpers', () => {
  it('analysisAriaLabel returns Thai labels', () => {
    expect(analysisAriaLabel('pending', '')).toBe('รอการวิเคราะห์');
    expect(analysisAriaLabel('ready', '')).toBe('การวิเคราะห์เสร็จสมบูรณ์');
    expect(analysisAriaLabel('rejected', '')).toBe('ไฟล์ไม่ผ่านการวิเคราะห์');
    expect(analysisAriaLabel('failed', '')).toBe('การวิเคราะห์ล้มเหลว');
    expect(analysisAriaLabel('scanning', 'test.stl')).toContain('test.stl');
  });

  it('isProgressState returns true for scanning and analyzing', () => {
    expect(isProgressState('scanning')).toBe(true);
    expect(isProgressState('analyzing')).toBe(true);
    expect(isProgressState('ready')).toBe(false);
    expect(isProgressState('failed')).toBe(false);
  });

  it('isTerminalState returns true for terminal states', () => {
    expect(isTerminalState('ready')).toBe(true);
    expect(isTerminalState('rejected')).toBe(true);
    expect(isTerminalState('failed')).toBe(true);
    expect(isTerminalState('pending')).toBe(false);
    expect(isTerminalState('scanning')).toBe(false);
  });

  it('demoWarningMessages contains expected messages', () => {
    expect(demoWarningMessages.length).toBeGreaterThan(0);
    expect(demoWarningMessages[0]).toContain('ผนังบาง');
  });
});
