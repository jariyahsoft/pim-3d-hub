import { parseUtcTimestamp, parseUuidv7 } from '@pim/domain';
import type { FileUploadSessionDto } from '@pim/application';

export const uploadDraftStorageKey = 'pim-3d-hub:upload-draft';

export type UploadState =
  | 'idle'
  | 'preparing'
  | 'uploading'
  | 'paused'
  | 'offline'
  | 'verifying'
  | 'scanning'
  | 'ready'
  | 'rejected'
  | 'failed';

export type DraftStorageLike = Pick<
  Storage,
  'getItem' | 'removeItem' | 'setItem'
>;

export type UploadDraft = Readonly<{
  currentState: UploadState;
  filename: string;
  fileSize: number;
  mimeType: string;
  progress: number; // 0–100
  receivedBytes: number;
  sessionId: string | null;
  assetId: string | null;
  expiresAt: string | null;
  errorMessage: string | null;
  scanVerdict: string | null;
  purpose: string;
}>;

export const demoSessions: readonly FileUploadSessionDto[] = Object.freeze([
  Object.freeze({
    actorUserId: parseUuidv7('018f18b2-4c4f-7c7a-9e12-000000000001'),
    assetId: parseUuidv7('018f18b2-4c4f-7c7a-9e12-000000000201'),
    checksumSha256: 'a'.repeat(64),
    expectedSizeBytes: 2048,
    expiresAt: parseUtcTimestamp('2026-06-29T01:00:00.000Z'),
    id: parseUuidv7('018f18b2-4c4f-7c7a-9e12-000000000301'),
    kind: 'RESUMABLE' as const,
    maxChunkBytes: 16777216,
    mimeType: 'model/stl',
    objectKey:
      'private/standard/018f18b2-4c4f-7c7a-9e12-000000000201/bracket.stl',
    originalFilename: 'bracket.stl',
    purpose: 'MODEL_3D',
    receivedBytes: 0,
    receivedChunks: 0,
    status: 'OPEN' as const,
    storageProvider: 'STANDARD',
    version: 1,
    visibility: 'PRIVATE' as const,
  }),
]);

export const demoUploadDraft: UploadDraft = Object.freeze({
  currentState: 'idle',
  filename: '',
  fileSize: 0,
  mimeType: '',
  progress: 0,
  receivedBytes: 0,
  sessionId: null,
  assetId: null,
  expiresAt: null,
  errorMessage: null,
  scanVerdict: null,
  purpose: '',
});

export const demoSessionInProgress: UploadDraft = Object.freeze({
  ...demoUploadDraft,
  currentState: 'uploading',
  filename: 'bracket.stl',
  fileSize: 2048,
  mimeType: 'model/stl',
  progress: 45,
  receivedBytes: 921,
  sessionId: '018f18b2-4c4f-7c7a-9e12-000000000301',
  assetId: '018f18b2-4c4f-7c7a-9e12-000000000201',
  expiresAt: '2026-06-29T01:00:00.000Z',
  purpose: 'MODEL_3D',
});

export function createEmptyUploadDraft(): UploadDraft {
  return demoUploadDraft;
}

export function clearDraft(storage: DraftStorageLike, key: string): void {
  storage.removeItem(key);
}

export function loadDraft<T>(storage: DraftStorageLike, key: string): T | null {
  const raw = storage.getItem(key);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function saveDraft(
  storage: DraftStorageLike,
  key: string,
  draft: UploadDraft,
): void {
  storage.setItem(key, JSON.stringify(draft));
}

// Mapping from upload state to ARIA live region announcements in Thai.
export function uploadStateAriaLabel(
  state: UploadState,
  filename: string,
): string {
  switch (state) {
    case 'idle':
      return `พร้อมอัปโหลด${filename ? `ไฟล์ ${filename}` : ''}`;
    case 'preparing':
      return 'กำลังเตรียมอัปโหลด';
    case 'uploading':
      return `กำลังอัปโหลด${filename ? `ไฟล์ ${filename}` : ''}`;
    case 'paused':
      return 'หยุดอัปโหลดชั่วคราว';
    case 'offline':
      return 'ไม่มีการเชื่อมต่อเครือข่าย การอัปโหลดถูกหยุดไว้ชั่วคราว';
    case 'verifying':
      return 'กำลังตรวจสอบไฟล์';
    case 'scanning':
      return 'กำลังสแกนหาไวรัส';
    case 'ready':
      return 'อัปโหลดเสร็จสมบูรณ์';
    case 'rejected':
      return 'ไฟล์ถูกปฏิเสธเนื่องจากผลการสแกน';
    case 'failed':
      return 'การอัปโหลดล้มเหลว';
  }
}

export function uploadStateIconLabel(state: UploadState): string {
  switch (state) {
    case 'idle':
      return 'ไอคอนอัปโหลด';
    case 'preparing':
      return 'กำลังโหลด';
    case 'uploading':
    case 'paused':
    case 'offline':
      return 'สถานะการอัปโหลด';
    case 'verifying':
    case 'scanning':
      return 'กำลังตรวจสอบ';
    case 'ready':
      return 'สำเร็จ';
    case 'rejected':
    case 'failed':
      return 'ข้อผิดพลาด';
  }
}

export function isTerminalState(state: UploadState): boolean {
  return state === 'ready' || state === 'rejected' || state === 'failed';
}

export function isProgressState(state: UploadState): boolean {
  return state === 'uploading' || state === 'verifying' || state === 'scanning';
}
