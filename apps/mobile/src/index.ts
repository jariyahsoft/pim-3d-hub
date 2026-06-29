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
