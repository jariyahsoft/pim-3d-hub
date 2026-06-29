'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from 'react';
import {
  clearDraft,
  createEmptyUploadDraft,
  isProgressState,
  isTerminalState,
  loadDraft,
  saveDraft,
  uploadStateAriaLabel,
  type DraftStorageLike,
  type UploadDraft,
  type UploadState,
} from './upload-demo.js';

export type UploadScreenProps = Readonly<{
  initialDraft?: UploadDraft;
  initialErrorMessage?: string | null;
  initialLoading?: boolean;
  initialOfflineMessage?: string | null;
  onCancel?: () => void | Promise<void>;
  onFileSelect?: (file: File) => void | Promise<void>;
  onPause?: () => void | Promise<void>;
  onResume?: () => void | Promise<void>;
  onRetry?: () => void | Promise<void>;
  storageKey?: string;
}>;

export function UploadScreen(props: UploadScreenProps): ReactElement {
  const storageKey = props.storageKey ?? 'pim-3d-hub:upload-draft';
  const [draft, setDraft] = useState<UploadDraft>(
    props.initialDraft ?? createEmptyUploadDraft(),
  );
  const [loading, setLoading] = useState(props.initialLoading ?? false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    props.initialErrorMessage ?? null,
  );
  const [offlineMessage, setOfflineMessage] = useState<string | null>(
    props.initialOfflineMessage ?? null,
  );
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const announcementRef = useRef<HTMLDivElement>(null);

  // Restore draft from storage on mount.
  useEffect(() => {
    const storage = getStorage();
    if (!storage) {
      return;
    }
    const stored = loadDraft<UploadDraft>(storage, storageKey);
    if (
      stored &&
      stored.currentState !== 'idle' &&
      !isTerminalState(stored.currentState)
    ) {
      setDraft(stored);
    }
  }, [storageKey]);

  // Persist draft changes.
  useEffect(() => {
    const storage = getStorage();
    if (!storage || draft.currentState === 'idle') {
      return;
    }
    saveDraft(storage, storageKey, draft);
  }, [draft, storageKey]);

  // Announce state changes to assistive technology.
  useEffect(() => {
    if (!announcementRef.current) {
      return;
    }
    announcementRef.current.textContent = uploadStateAriaLabel(
      draft.currentState,
      draft.filename,
    );
  }, [draft.currentState, draft.filename]);

  // Online/offline detection.
  useEffect(() => {
    function handleOnline(): void {
      setOfflineMessage(null);
      if (draft.currentState === 'offline') {
        setDraft((prev) => ({ ...prev, currentState: draft.currentState }));
      }
    }
    function handleOffline(): void {
      setOfflineMessage('ไม่มีการเชื่อมต่ออินเทอร์เน็ต');
      if (isProgressState(draft.currentState)) {
        setDraft((prev) => ({
          ...prev,
          currentState: 'offline' as UploadState,
        }));
      }
    }
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [draft.currentState]);

  const handleFileSelect = useCallback(
    async (file: File | null) => {
      if (!file) {
        return;
      }
      setLoading(true);
      setErrorMessage(null);
      setDraft({
        ...createEmptyUploadDraft(),
        currentState: 'preparing',
        filename: file.name,
        fileSize: file.size,
        mimeType: file.type || 'model/stl',
        purpose: 'MODEL_3D',
        progress: 0,
      });
      try {
        await props.onFileSelect?.(file);
        setDraft((prev) => ({
          ...prev,
          currentState: 'uploading',
          progress: 5,
        }));
      } catch {
        setDraft((prev) => ({
          ...prev,
          currentState: 'failed',
          errorMessage: 'ไม่สามารถเริ่มอัปโหลดได้',
        }));
      } finally {
        setLoading(false);
      }
    },
    [props],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragOver(false);
      const file = event.dataTransfer.files[0];
      if (file) {
        void handleFileSelect(file);
      }
    },
    [handleFileSelect],
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragOver(true);
    },
    [],
  );

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleClickSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        void handleFileSelect(file);
      }
    },
    [handleFileSelect],
  );

  const handlePause = useCallback(() => {
    setDraft((prev) => ({ ...prev, currentState: 'paused' }));
    void props.onPause?.();
  }, [props]);

  const handleResume = useCallback(() => {
    setDraft((prev) => ({ ...prev, currentState: 'uploading' }));
    void props.onResume?.();
  }, [props]);

  const handleRetry = useCallback(() => {
    setDraft((prev) => ({
      ...prev,
      currentState: 'preparing',
      errorMessage: null,
      progress: 0,
      receivedBytes: 0,
    }));
    void props.onRetry?.();
  }, [props]);

  const handleCancel = useCallback(() => {
    setDraft(createEmptyUploadDraft());
    setErrorMessage(null);
    setOfflineMessage(null);
    const storage = getStorage();
    if (storage) {
      clearDraft(storage, storageKey);
    }
    void props.onCancel?.();
  }, [props, storageKey]);

  const state = draft.currentState;

  return (
    <div className="upload-screen" role="region" aria-label="อัปโหลดไฟล์">
      {/* ARIA live region for screen reader announcements */}
      <div
        ref={announcementRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />

      <h2 className="upload-screen__title">อัปโหลดไฟล์ 3D</h2>

      {/* Drop zone when idle */}
      {(state === 'idle' || state === 'failed') && (
        <div
          className={`upload-screen__dropzone ${dragOver ? 'upload-screen__dropzone--dragover' : ''} ${state === 'failed' ? 'upload-screen__dropzone--error' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          role="button"
          tabIndex={0}
          aria-label={uploadStateAriaLabel(state, draft.filename)}
          onClick={handleClickSelect}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleClickSelect();
            }
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".stl,.obj,.3mf,.zip,.step,.stp,.3ds"
            onChange={handleInputChange}
            className="upload-screen__file-input"
            tabIndex={-1}
            aria-hidden="true"
          />
          <div className="upload-screen__icon" aria-hidden="true">
            {state === 'failed' ? '⚠️' : '📁'}
          </div>
          <p className="upload-screen__dropzone-text">
            {state === 'failed'
              ? 'การอัปโหลดล้มเหลว คลิกเพื่อลองอีกครั้ง หรือลากไฟล์มาวาง'
              : 'ลากไฟล์ 3D มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์'}
          </p>
          <p className="upload-screen__dropzone-hint">
            รองรับไฟล์ STL, OBJ, 3MF, STEP และ ZIP สูงสุด 5 GiB
          </p>
        </div>
      )}

      {/* Progress area while uploading / paused / offline */}
      {(state === 'preparing' ||
        state === 'uploading' ||
        state === 'paused' ||
        state === 'offline' ||
        state === 'verifying' ||
        state === 'scanning') && (
        <div
          className="upload-screen__progress"
          role="status"
          aria-label={uploadStateAriaLabel(state, draft.filename)}
        >
          {/* File info */}
          <div className="upload-screen__file-info">
            <div className="upload-screen__file-icon" aria-hidden="true">
              {state === 'preparing'
                ? '⏳'
                : state === 'uploading'
                  ? '📤'
                  : state === 'paused'
                    ? '⏸️'
                    : state === 'offline'
                      ? '📡'
                      : state === 'verifying'
                        ? '🔍'
                        : '🛡️'}
            </div>
            <div className="upload-screen__file-details">
              <span className="upload-screen__filename">{draft.filename}</span>
              <span className="upload-screen__filesize">
                {formatBytes(draft.fileSize)}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div
            className="upload-screen__progress-bar"
            role="progressbar"
            aria-valuenow={draft.progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`ความคืบหน้า ${draft.progress} เปอร์เซ็นต์`}
          >
            <div
              className={`upload-screen__progress-fill ${state === 'paused' || state === 'offline' ? 'upload-screen__progress-fill--paused' : ''}`}
              style={{ width: `${draft.progress}%` }}
            />
          </div>

          {/* State label */}
          <p className="upload-screen__state-label">
            {state === 'preparing' && 'กำลังเตรียมอัปโหลด...'}
            {state === 'uploading' && `กำลังอัปโหลด... ${draft.progress}%`}
            {state === 'paused' && 'หยุดชั่วคราว'}
            {state === 'offline' &&
              'ไม่มีการเชื่อมต่อเครือข่าย — รอการเชื่อมต่อใหม่...'}
            {state === 'verifying' && 'กำลังตรวจสอบความถูกต้องของไฟล์...'}
            {state === 'scanning' && 'กำลังสแกนหาไวรัส...'}
          </p>

          {/* Offline message */}
          {offlineMessage && (
            <p className="upload-screen__offline-message" role="alert">
              {offlineMessage}
            </p>
          )}

          {/* Action buttons */}
          <div className="upload-screen__actions">
            {state === 'uploading' && (
              <button
                className="upload-screen__btn upload-screen__btn--pause"
                onClick={handlePause}
                aria-label="หยุดอัปโหลดชั่วคราว"
              >
                ⏸️ หยุดชั่วคราว
              </button>
            )}
            {state === 'paused' && (
              <button
                className="upload-screen__btn upload-screen__btn--resume"
                onClick={handleResume}
                aria-label="ดำเนินการอัปโหลดต่อ"
              >
                ▶️ ดำเนินการต่อ
              </button>
            )}
            {state === 'offline' && (
              <button
                className="upload-screen__btn upload-screen__btn--retry"
                onClick={handleRetry}
                aria-label="ลองอัปโหลดอีกครั้งเมื่อเชื่อมต่อได้"
                disabled
              >
                🔄 ลองอีกครั้ง (รอเครือข่าย)
              </button>
            )}
            {(state === 'uploading' ||
              state === 'paused' ||
              state === 'offline') && (
              <button
                className="upload-screen__btn upload-screen__btn--cancel"
                onClick={handleCancel}
                aria-label="ยกเลิกการอัปโหลดและล้างข้อมูล"
              >
                ❌ ยกเลิก
              </button>
            )}
          </div>
        </div>
      )}

      {/* Ready state */}
      {state === 'ready' && (
        <div
          className="upload-screen__result upload-screen__result--success"
          role="status"
          aria-label={uploadStateAriaLabel('ready', draft.filename)}
        >
          <div className="upload-screen__result-icon" aria-hidden="true">
            ✅
          </div>
          <h3 className="upload-screen__result-title">อัปโหลดเสร็จสมบูรณ์</h3>
          <p className="upload-screen__result-detail">
            ไฟล์ {draft.filename} ({formatBytes(draft.fileSize)})
            อัปโหลดและตรวจสอบเรียบร้อย
          </p>
          <button
            className="upload-screen__btn upload-screen__btn--primary"
            onClick={handleCancel}
            aria-label="เริ่มอัปโหลดไฟล์ใหม่"
          >
            อัปโหลดไฟล์ใหม่
          </button>
        </div>
      )}

      {/* Rejected state */}
      {state === 'rejected' && (
        <div
          className="upload-screen__result upload-screen__result--error"
          role="alert"
          aria-label={uploadStateAriaLabel('rejected', draft.filename)}
        >
          <div className="upload-screen__result-icon" aria-hidden="true">
            🚫
          </div>
          <h3 className="upload-screen__result-title">ไฟล์ไม่ผ่านการตรวจสอบ</h3>
          <p className="upload-screen__result-detail">
            {draft.scanVerdict
              ? `ผลการสแกน: ${draft.scanVerdict}`
              : 'ไฟล์ถูกปฏิเสธเนื่องจากมีปัญหา'}
          </p>
          <div className="upload-screen__actions">
            <button
              className="upload-screen__btn upload-screen__btn--retry"
              onClick={handleRetry}
              aria-label="ลองอีกครั้งกับไฟล์อื่น"
            >
              🔄 ลองอีกครั้ง
            </button>
            <button
              className="upload-screen__btn upload-screen__btn--cancel"
              onClick={handleCancel}
              aria-label="ยกเลิก"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      {/* Error message display */}
      {errorMessage && (
        <p className="upload-screen__error" role="alert">
          {errorMessage}
        </p>
      )}

      {/* Loading overlay */}
      {loading && (
        <div
          className="upload-screen__loading"
          role="status"
          aria-label="กำลังดำเนินการ"
        >
          <span className="upload-screen__spinner" aria-hidden="true" />
          <span>กำลังดำเนินการ...</span>
        </div>
      )}
    </div>
  );
}

function getStorage(): DraftStorageLike | null {
  return typeof window !== 'undefined' && 'localStorage' in window
    ? window.localStorage
    : null;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MiB', 'GiB'];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** i;
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
