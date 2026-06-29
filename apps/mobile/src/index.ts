export { mobileConfig } from './env-config.js';
export type { MobileConfig, MobileEnvironment } from './env-config.js';

export { createApiClient } from './api-client.js';
export type {
  ApiClient,
  ApiEnvelope,
  ApiErrorBody,
  ApiMeta,
  ApiRequestInit,
  HealthResponse,
} from './api-client.js';

export { ROUTES, TAB_ROUTES, CREATE_MENU, TAB_LABELS } from './navigation.js';
export type {
  CreateMenuItem,
  ScreenPlaceholderProps,
  TabRoute,
} from './navigation.js';

export { createAuthClient, MobileAuthError } from './auth.js';
export type {
  AuthClient,
  AuthClientPorts,
  AuthErrorCode,
  AuthSession,
  AuthStatus,
  FireAuthPort,
  SecureStoragePort,
} from './auth.js';

export {
  loadingState,
  loadedState,
  offlineState,
  errorState,
  expiredState,
} from './buyer-flows.js';
export type {
  MobileHomeItem,
  MobileOrderTracking,
  MobileQuoteCard,
  MobileUploadDraft,
  ScreenState,
  ScreenStateWrapper,
} from './buyer-flows.js';

export { createPushDeepLinkService } from './push-deep-links.js';
export type {
  DeepLinkAuthorization,
  PushDeepLinkService,
  PushDeepLinkServicePorts,
  PushNotificationPayload,
  TokenRegistrationResult,
} from './push-deep-links.js';

export {
  createCameraUploadService,
  COMPRESSION_POLICIES,
  MediaPermissionDeniedError,
} from './camera-upload.js';
export type {
  BackgroundUploadPort,
  CameraGalleryPort,
  CameraUploadService,
  CameraUploadServicePorts,
  CompressionPolicy,
  MediaPurpose,
  MediaSelectionResult,
  MediaSource,
  UploadProgress,
  UploadResult,
} from './camera-upload.js';

export {
  createOfflineDraftService,
  OFFLINE_DRAFT_SCHEMA_VERSION,
  DRAFT_EXPIRY_DAYS,
  isTransitionSafeOffline,
  schemaUpToDate,
} from './offline-drafts.js';
export type {
  OfflineDraft,
  OfflineDraftKind,
  OfflineDraftStoragePort,
  SyncResult,
} from './offline-drafts.js';

export {
  createSellerWorkspaceService,
  SellerActionError,
} from './seller-workspace.js';
export type {
  ActionConfirmation,
  EarningsSummary,
  ProductionUpdateInput,
  SellerOrderItem,
  SellerWorkspaceService,
  SellerWorkspacePorts,
  ServiceOrPrinterItem,
  ShipmentCreateInput,
} from './seller-workspace.js';

export { runMobileQualityChecklist } from './mobile-quality-checklist.js';
export type {
  QualityCheckResult,
  QualityReport,
  QualityReportConfig,
} from './mobile-quality-checklist.js';

export {
  getEnvironmentTarget,
  getBuildConfig,
  PRIVACY_DISCLOSURES,
  PERMISSION_RATIONALES,
  ROLLBACK_PROCEDURE,
  MOBILE_APP_VERSION,
  MOBILE_BUILD_NUMBER,
} from './store-deployment.js';
export type {
  BuildConfig,
  EnvironmentTarget,
  PrivacyDisclosure,
  ReleaseTrack,
} from './store-deployment.js';
