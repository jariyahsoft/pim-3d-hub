/**
 * Camera / gallery selection and background upload for mobile.
 *
 * Design:
 * - `createMediaService(ports)` wraps camera/gallery access behind a port
 *   so the logic is testable without a real device camera.
 * - Upload happens through the existing upload-session API (see Task 42).
 * - Source media is NEVER written to public storage automatically.
 * - Compression policies and permission denials have defined fallbacks.
 */

import type { ApiClient } from './api-client.js';

// ── Types ───────────────────────────────────────────────────────────────

export type MediaSource = 'CAMERA' | 'GALLERY';
export type MediaPurpose =
  | 'MODEL_3D'
  | 'REFERENCE_PHOTO'
  | 'EVIDENCE'
  | 'AVATAR'
  | 'COVER';

export type MediaSelectionResult = Readonly<{
  /** Local file URI on the device (for uploading). */
  localUri: string;
  mimeType: string;
  originalName: string;
  originalSizeBytes: number;
}>;

export type CompressionPolicy = Readonly<{
  /** Max dimension (width or height) after resize. 0 = no resize. */
  maxDimensionPx: number;
  /** JPEG/PNG quality 0–1. 1 = lossless. */
  quality: number;
  /** If true and the source is HEIC, convert to JPEG. */
  convertHeicToJpeg: boolean;
}>;

export type UploadProgress = Readonly<{
  bytesUploaded: number;
  totalBytes: number;
}>;

export type UploadResult = Readonly<{
  assetId: string;
  sessionId: string;
  status: 'VERIFYING' | 'SCANNING' | 'READY';
  uploadUrl: string;
}>;

// ── Ports ───────────────────────────────────────────────────────────────

export type CameraGalleryPort = Readonly<{
  /** Opens camera or gallery picker. Returns null when the user cancels. */
  pickMedia(
    source: MediaSource,
    purpose: MediaPurpose,
  ): Promise<MediaSelectionResult | null>;
  /** Returns true when the requested permission is granted. */
  requestPermission(source: MediaSource): Promise<boolean>;
  /** Returns the current permission state without prompting. */
  checkPermission(
    source: MediaSource,
  ): Promise<'granted' | 'denied' | 'undetermined'>;
  /**
   * Compress an image at `localUri` according to the given policy.
   * Returns the compressed file URI.
   */
  compress(localUri: string, policy: CompressionPolicy): Promise<string>;
}>;

export type BackgroundUploadPort = Readonly<{
  /** Start a background upload task. Returns a task ID for status tracking. */
  startUpload(
    localUri: string,
    uploadUrl: string,
    mimeType: string,
  ): Promise<string>;
  /** Cancel an upload in progress. */
  cancelUpload(taskId: string): Promise<void>;
  /** Observe upload progress. Unsubscribe by calling the returned function. */
  onProgress(
    taskId: string,
    handler: (progress: UploadProgress) => void,
  ): () => void;
  /** Wait for the upload to finish or fail. */
  waitForCompletion(
    taskId: string,
  ): Promise<{ status: 'completed' | 'failed'; errorMessage?: string }>;
}>;

// ── Compression policies ─────────────────────────────────────────────────

export const COMPRESSION_POLICIES: Record<MediaPurpose, CompressionPolicy> =
  Object.freeze({
    MODEL_3D: Object.freeze({
      maxDimensionPx: 0,
      quality: 1,
      convertHeicToJpeg: false,
    }),
    REFERENCE_PHOTO: Object.freeze({
      maxDimensionPx: 2048,
      quality: 0.85,
      convertHeicToJpeg: true,
    }),
    EVIDENCE: Object.freeze({
      maxDimensionPx: 2048,
      quality: 0.9,
      convertHeicToJpeg: true,
    }),
    AVATAR: Object.freeze({
      maxDimensionPx: 512,
      quality: 0.8,
      convertHeicToJpeg: true,
    }),
    COVER: Object.freeze({
      maxDimensionPx: 1200,
      quality: 0.85,
      convertHeicToJpeg: true,
    }),
  });

// ── Errors ───────────────────────────────────────────────────────────────

export class MediaPermissionDeniedError extends Error {
  readonly code = 'PERMISSION_DENIED';
  readonly source: MediaSource;
  readonly status = 403;

  constructor(source: MediaSource) {
    super(`Permission denied for ${source}`);
    this.name = 'MediaPermissionDeniedError';
    this.source = source;
  }
}

export class MediaUploadError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'MediaUploadError';
  }
}

// ── Service ─────────────────────────────────────────────────────────────

export type CameraUploadService = Readonly<{
  /** Pick and compress media, then start an upload session. */
  captureAndUpload(
    source: MediaSource,
    purpose: MediaPurpose,
  ): Promise<UploadResult | null>;
  /** Only pick and compress — returns a local URI for later upload. */
  pickAndCompress(
    source: MediaSource,
    purpose: MediaPurpose,
  ): Promise<MediaSelectionResult | null>;
  /** Upload a previously picked file. */
  uploadExisting(
    localUri: string,
    purpose: MediaPurpose,
  ): Promise<UploadResult>;
  /** Cancel a running upload. */
  cancel(taskId: string): Promise<void>;
}>;

export type CameraUploadServicePorts = Readonly<{
  apiClient: ApiClient;
  backgroundUploadPort: BackgroundUploadPort;
  cameraGalleryPort: CameraGalleryPort;
}>;

export function createCameraUploadService(
  ports: CameraUploadServicePorts,
): CameraUploadService {
  const camera = ports.cameraGalleryPort;
  const uploader = ports.backgroundUploadPort;

  async function pickAndCompress(
    source: MediaSource,
    purpose: MediaPurpose,
  ): Promise<MediaSelectionResult | null> {
    const permission = await camera.checkPermission(source);
    if (permission === 'denied') {
      throw new MediaPermissionDeniedError(source);
    }
    if (permission === 'undetermined') {
      const granted = await camera.requestPermission(source);
      if (!granted) {
        throw new MediaPermissionDeniedError(source);
      }
    }

    const selection = await camera.pickMedia(source, purpose);
    if (!selection) return null;

    const policy = COMPRESSION_POLICIES[purpose];
    const compressedUri = await camera.compress(selection.localUri, policy);

    return {
      ...selection,
      localUri: compressedUri,
    };
  }

  async function captureAndUpload(
    source: MediaSource,
    purpose: MediaPurpose,
  ): Promise<UploadResult | null> {
    const media = await pickAndCompress(source, purpose);
    if (!media) return null;
    return uploadExisting(media.localUri, purpose);
  }

  async function uploadExisting(
    localUri: string,
    purpose: MediaPurpose,
  ): Promise<UploadResult> {
    // Step 1: create an upload session via the API
    const sessionResult = await ports.apiClient.request<{
      assetId: string;
      id: string;
      uploadUrl: string;
    }>({
      method: 'POST',
      path: '/api/v1/upload/sessions',
      body: {
        mimeType: 'image/jpeg',
        purpose,
        storageProvider: 'STANDARD',
      },
    });

    if ('error' in sessionResult) {
      throw new MediaUploadError(
        sessionResult.error.code,
        sessionResult.error.message,
      );
    }

    const { data: session } = sessionResult;

    // Step 2: start background upload to the returned URL
    const taskId = await uploader.startUpload(
      localUri,
      session.uploadUrl,
      'image/jpeg',
    );

    // Step 3: wait for completion
    const outcome = await uploader.waitForCompletion(taskId);

    if (outcome.status === 'failed') {
      throw new MediaUploadError(
        'UPLOAD_FAILED',
        outcome.errorMessage ?? 'Upload failed',
      );
    }

    return {
      assetId: session.assetId,
      sessionId: session.id,
      status: 'VERIFYING',
      uploadUrl: session.uploadUrl,
    };
  }

  async function cancel(taskId: string): Promise<void> {
    await uploader.cancelUpload(taskId);
  }

  return {
    captureAndUpload,
    cancel,
    pickAndCompress,
    uploadExisting,
  };
}
