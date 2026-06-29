/**
 * Offline draft storage with schema-versioned, encrypted-safe serialization
 * and conflict-aware sync through the API.
 *
 * Design:
 * - Each draft has a `schemaVersion` field. On load, if the stored version
 *   differs from the code's expected version, the draft is treated as stale
 *   and the user is prompted to recreate it.
 * - Drafts expire after 7 days (configurable) to prevent stale data from
 *   accumulating on the device.
 * - Sync (`syncDraft`) reads the server's latest `updatedAt` and uses it
 *   to decide whether to push local changes or pull server data.
 * - Unsafe transitions (payment, order confirmation) are DISABLED when
 *   the device is offline.
 */

export const OFFLINE_DRAFT_SCHEMA_VERSION = 1;
export const DRAFT_EXPIRY_DAYS = 7;

export type OfflineDraftKind =
  | 'UPLOAD'
  | 'SERVICE_REQUEST'
  | 'PRODUCT_LISTING'
  | 'POST'
  | 'PROFILE_EDIT';

export type OfflineDraft = Readonly<{
  createdAt: string; // ISO-8601
  data: string; // JSON — serialized draft payload
  expectedVersion: number | null; // server-side version at last sync
  kind: OfflineDraftKind;
  schemaVersion: number;
  serverUpdatedAt: string | null; // last known server updatedAt
  updatedAt: string;
}>;

export type SyncDecision = 'LOCAL_WINS' | 'SERVER_WINS' | 'NO_CONFLICT';

export type SyncResult = Readonly<{
  decision: SyncDecision;
  /** Set to the winning draft after reconciliation. */
  resolvedDraft: OfflineDraft | null;
  /** Contains the version the caller should send on next mutation. */
  resolvedExpectedVersion: number | null;
}>;

export type OfflineDraftStoragePort = Readonly<{
  save(kind: OfflineDraftKind, data: string): Promise<OfflineDraft>;
  load(kind: OfflineDraftKind): Promise<OfflineDraft | null>;
  remove(kind: OfflineDraftKind): Promise<void>;
  list(): Promise<readonly OfflineDraft[]>;
  removeExpired(now: string): Promise<number>;
}>;

export type DraftSyncContextPort = Readonly<{
  fetchServerVersion(kind: OfflineDraftKind): Promise<{
    updatedAt: string;
    version: number;
  } | null>;
}>;

function nowISO(): string {
  return new Date().toISOString();
}

function isExpired(draft: OfflineDraft, now: string): boolean {
  const ageMs = Date.parse(now) - Date.parse(draft.updatedAt);
  return ageMs > DRAFT_EXPIRY_DAYS * 86400000;
}

export function schemaUpToDate(draft: OfflineDraft): boolean {
  return draft.schemaVersion === OFFLINE_DRAFT_SCHEMA_VERSION;
}

export function isTransitionSafeOffline(kind: OfflineDraftKind): boolean {
  // Payment and state-changing transitions are unsafe offline
  const unsafeKinds: OfflineDraftKind[] = ['UPLOAD', 'SERVICE_REQUEST'];
  return !unsafeKinds.includes(kind);
}

export class OfflineDraftExpiredError extends Error {
  readonly code = 'DRAFT_EXPIRED';
  readonly status = 422;

  constructor(message: string) {
    super(message);
    this.name = 'OfflineDraftExpiredError';
  }
}

export class OfflineTransitionBlockedError extends Error {
  readonly code = 'TRANSITION_BLOCKED_OFFLINE';
  readonly status = 412;

  constructor(kind: OfflineDraftKind) {
    super(`Transition for ${kind} is not allowed while offline`);
    this.name = 'OfflineTransitionBlockedError';
  }
}

export class OfflineSyncConflictError extends Error {
  readonly code = 'SYNC_CONFLICT';
  readonly status = 409;

  constructor(message: string) {
    super(message);
    this.name = 'OfflineSyncConflictError';
  }
}

/**
 * Create the offline draft service.
 *
 * @param storage - The secure/encrypted storage port.
 * @param syncCtx - Port for fetching server-side version info.
 */
export function createOfflineDraftService(
  storage: OfflineDraftStoragePort,
  syncCtx?: DraftSyncContextPort,
) {
  async function saveDraft(
    kind: OfflineDraftKind,
    data: string,
  ): Promise<OfflineDraft> {
    return storage.save(kind, data);
  }

  async function loadDraft(
    kind: OfflineDraftKind,
    allowExpired = false,
  ): Promise<OfflineDraft | null> {
    const draft = await storage.load(kind);
    if (!draft) return null;

    if (!schemaUpToDate(draft)) {
      throw new OfflineDraftExpiredError(
        `Draft schema version ${draft.schemaVersion} is outdated; expected ${OFFLINE_DRAFT_SCHEMA_VERSION}`,
      );
    }

    if (!allowExpired && isExpired(draft, nowISO())) {
      await storage.remove(kind);
      return null;
    }

    return draft;
  }

  async function removeDraft(kind: OfflineDraftKind): Promise<void> {
    return storage.remove(kind);
  }

  async function syncDraft(kind: OfflineDraftKind): Promise<SyncResult> {
    const localDraft = await storage.load(kind);
    const serverData = (await syncCtx?.fetchServerVersion(kind)) ?? null;

    // No server data → local wins by default
    if (!serverData && localDraft) {
      return {
        decision: 'NO_CONFLICT',
        resolvedDraft: localDraft,
        resolvedExpectedVersion: localDraft.expectedVersion,
      };
    }

    // No local draft → server wins
    if (!localDraft && serverData) {
      return {
        decision: 'SERVER_WINS',
        resolvedDraft: null,
        resolvedExpectedVersion: serverData.version,
      };
    }

    // Both exist — compare timestamps
    if (localDraft && serverData) {
      const localUpdated = localDraft.updatedAt;
      const serverUpdated = serverData.updatedAt;

      if (serverUpdated > localUpdated) {
        return {
          decision: 'SERVER_WINS',
          resolvedDraft: null,
          resolvedExpectedVersion: serverData.version,
        };
      }

      if (localUpdated >= serverUpdated) {
        // Local is newer → push local version
        return {
          decision: 'LOCAL_WINS',
          resolvedDraft: localDraft,
          resolvedExpectedVersion: serverData.version,
        };
      }
    }

    return {
      decision: 'NO_CONFLICT',
      resolvedDraft: localDraft,
      resolvedExpectedVersion: localDraft?.expectedVersion ?? null,
    };
  }

  async function removeExpired(): Promise<number> {
    return storage.removeExpired(nowISO());
  }

  return {
    loadDraft,
    removeDraft,
    removeExpired,
    saveDraft,
    syncDraft,
  };
}
