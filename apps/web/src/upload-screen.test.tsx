import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { UploadScreen } from './upload-screen.js';
import {
  createEmptyUploadDraft,
  demoSessions,
  demoUploadDraft,
  isProgressState,
  isTerminalState,
  uploadStateAriaLabel,
  uploadStateIconLabel,
} from './upload-demo.js';

describe('upload screen', () => {
  it('renders idle state with file drop zone', () => {
    const html = renderToStaticMarkup(<UploadScreen />);
    expect(html).toContain('อัปโหลดไฟล์ 3D');
    expect(html).toContain('ลากไฟล์ 3D มาวางที่นี่');
    expect(html).toContain('.stl,.obj,.3mf');
  });

  it('renders loading state when initialLoading is true', () => {
    const html = renderToStaticMarkup(<UploadScreen initialLoading />);
    expect(html).toContain('กำลังดำเนินการ');
  });

  it('renders the progress UI during upload', () => {
    const html = renderToStaticMarkup(
      <UploadScreen
        initialDraft={{
          ...demoUploadDraft,
          currentState: 'uploading',
          filename: 'model.stl',
          progress: 60,
          fileSize: 4096,
          mimeType: 'model/stl',
          purpose: 'MODEL_3D',
        }}
      />,
    );
    expect(html).toContain('model.stl');
    expect(html).toContain('กำลังอัปโหลด');
    expect(html).toContain('หยุดชั่วคราว');
    expect(html).toContain('ยกเลิก');
  });

  it('renders paused state with resume button', () => {
    const html = renderToStaticMarkup(
      <UploadScreen
        initialDraft={{
          ...demoUploadDraft,
          currentState: 'paused',
          filename: 'model.stl',
          progress: 45,
          fileSize: 2048,
        }}
      />,
    );
    expect(html).toContain('หยุดชั่วคราว');
    expect(html).toContain('ดำเนินการต่อ');
    expect(html).toContain('ยกเลิก');
  });

  it('renders offline state with disabled retry', () => {
    const html = renderToStaticMarkup(
      <UploadScreen
        initialDraft={{
          ...demoUploadDraft,
          currentState: 'offline',
          filename: 'model.stl',
          progress: 50,
        }}
        initialOfflineMessage="ไม่มีการเชื่อมต่ออินเทอร์เน็ต"
      />,
    );
    expect(html).toContain('ไม่มีการเชื่อมต่อเครือข่าย');
    expect(html).toContain('รอเครือข่าย');
    expect(html).toContain('disabled');
  });

  it('renders verifying state during checksum verification', () => {
    const html = renderToStaticMarkup(
      <UploadScreen
        initialDraft={{
          ...demoUploadDraft,
          currentState: 'verifying',
          filename: 'part.stl',
          progress: 90,
          fileSize: 2048,
        }}
      />,
    );
    expect(html).toContain('กำลังตรวจสอบความถูกต้องของไฟล์');
  });

  it('renders scanning state during malware scan', () => {
    const html = renderToStaticMarkup(
      <UploadScreen
        initialDraft={{
          ...demoUploadDraft,
          currentState: 'scanning',
          filename: 'safe.stl',
          progress: 95,
          fileSize: 1024,
        }}
      />,
    );
    expect(html).toContain('กำลังสแกนหาไวรัส');
  });

  it('renders ready state after successful upload', () => {
    const html = renderToStaticMarkup(
      <UploadScreen
        initialDraft={{
          ...demoUploadDraft,
          currentState: 'ready',
          filename: 'done.stl',
          fileSize: 5120,
          mimeType: 'model/stl',
          purpose: 'MODEL_3D',
        }}
      />,
    );
    expect(html).toContain('อัปโหลดเสร็จสมบูรณ์');
    expect(html).toContain('done.stl');
    expect(html).toContain('อัปโหลดไฟล์ใหม่');
  });

  it('renders rejected state with retry action', () => {
    const html = renderToStaticMarkup(
      <UploadScreen
        initialDraft={{
          ...demoUploadDraft,
          currentState: 'rejected',
          filename: 'bad.stl',
          scanVerdict: 'MALICIOUS',
        }}
      />,
    );
    expect(html).toContain('ไฟล์ไม่ผ่านการตรวจสอบ');
    expect(html).toContain('MALICIOUS');
    expect(html).toContain('ลองอีกครั้ง');
  });

  it('renders failed state with retry from drop zone', () => {
    const html = renderToStaticMarkup(
      <UploadScreen
        initialDraft={{
          ...demoUploadDraft,
          currentState: 'failed',
          filename: 'lost.stl',
          errorMessage: 'ไม่สามารถเริ่มอัปโหลดได้',
        }}
      />,
    );
    expect(html).toContain('การอัปโหลดล้มเหลว');
    expect(html).toContain('คลิกเพื่อลองอีกครั้ง');
    expect(html).toContain('ลากไฟล์มาวาง');
  });

  it('renders error message from props', () => {
    const html = renderToStaticMarkup(
      <UploadScreen initialErrorMessage="เกิดข้อผิดพลาด: ไม่พบเซสชัน" />,
    );
    expect(html).toContain('เกิดข้อผิดพลาด: ไม่พบเซสชัน');
  });

  it('initialDraft overrides the default empty draft', () => {
    const html = renderToStaticMarkup(
      <UploadScreen
        initialDraft={{
          ...demoUploadDraft,
          currentState: 'uploading',
          filename: 'override.stl',
          progress: 33,
          fileSize: 8192,
          mimeType: 'model/stl',
          purpose: 'MODEL_3D',
        }}
      />,
    );
    expect(html).toContain('override.stl');
    expect(html).toContain('33%');
  });
});

describe('upload draft helpers', () => {
  it('isProgressState returns true for active upload states', () => {
    expect(isProgressState('uploading')).toBe(true);
    expect(isProgressState('verifying')).toBe(true);
    expect(isProgressState('scanning')).toBe(true);
    expect(isProgressState('idle')).toBe(false);
    expect(isProgressState('paused')).toBe(false);
    expect(isProgressState('offline')).toBe(false);
    expect(isProgressState('ready')).toBe(false);
  });

  it('isTerminalState returns true for terminal states', () => {
    expect(isTerminalState('ready')).toBe(true);
    expect(isTerminalState('rejected')).toBe(true);
    expect(isTerminalState('failed')).toBe(true);
    expect(isTerminalState('uploading')).toBe(false);
    expect(isTerminalState('idle')).toBe(false);
  });

  it('uploadStateAriaLabel returns Thai labels', () => {
    expect(uploadStateAriaLabel('idle', '')).toContain('พร้อมอัปโหลด');
    expect(uploadStateAriaLabel('uploading', 'test.stl')).toContain(
      'กำลังอัปโหลด',
    );
    expect(uploadStateAriaLabel('offline', '')).toContain(
      'ไม่มีการเชื่อมต่อเครือข่าย',
    );
    expect(uploadStateAriaLabel('ready', '')).toContain('อัปโหลดเสร็จสมบูรณ์');
    expect(uploadStateAriaLabel('rejected', '')).toContain('ไฟล์ถูกปฏิเสธ');
    expect(uploadStateAriaLabel('failed', '')).toContain('การอัปโหลดล้มเหลว');
  });

  it('uploadStateIconLabel returns descriptive labels', () => {
    expect(uploadStateIconLabel('idle')).toBe('ไอคอนอัปโหลด');
    expect(uploadStateIconLabel('ready')).toBe('สำเร็จ');
    expect(uploadStateIconLabel('rejected')).toBe('ข้อผิดพลาด');
  });

  it('demo sessions are frozen and well-formed', () => {
    expect(demoSessions.length).toBeGreaterThan(0);
    expect(demoSessions[0]?.kind).toBe('RESUMABLE');
    expect(demoSessions[0]?.status).toBe('OPEN');
    expect(demoSessions[0]?.mimeType).toBe('model/stl');
  });

  it('createEmptyUploadDraft returns a well-typed draft', () => {
    const draft = createEmptyUploadDraft();
    expect(draft.currentState).toBe('idle');
    expect(draft.filename).toBe('');
    expect(draft.progress).toBe(0);
    expect(draft.sessionId).toBeNull();
  });
});
