import type {
  CanonicalRecord,
  RepositoryListPage,
  RepositoryListRequest,
} from './repository.js';
import type { UtcTimestamp, Uuidv7 } from './index.js';

// ── Creator profile states ────────────────────────────────────────────────

export const creatorProfileVisibilities = [
  'PUBLIC_ACTIVE',
  'PUBLIC_HIDDEN',
  'SUSPENDED',
  'REMOVED',
] as const;
export type CreatorProfileVisibility =
  (typeof creatorProfileVisibilities)[number];

export const creatorProfileSortFields = [
  'createdAt',
  'updatedAt',
  'suspendedUntil',
] as const;
export type CreatorProfileSortField = (typeof creatorProfileSortFields)[number];

// ── Public-facing record ──────────────────────────────────────────────────

/**
 * A creator profile is the public-facing summary exposed via the marketplace.
 * It contains only public-safe data; KYC, contact, and private account fields
 * live in the internal `users` table and must NEVER be projected here.
 */
export type CreatorSocialLink = Readonly<{
  platform:
    | 'WEBSITE'
    | 'TWITTER'
    | 'INSTAGRAM'
    | 'FACEBOOK'
    | 'LINE'
    | 'TIKTOK'
    | 'YOUTUBE';
  url: string;
}>;

export type CreatorLinkedReference = Readonly<{
  productId: Uuidv7 | null;
  providerServiceId: Uuidv7 | null;
  showcaseConsentId: Uuidv7 | null;
}>;

export type CreatorProfileRecord = Readonly<
  CanonicalRecord & {
    creatorUserId: Uuidv7;
    displayName: string;
    bio: string;
    province: string | null;
    avatarAssetId: Uuidv7 | null;
    coverAssetId: Uuidv7 | null;
    followedByViewerIds: readonly Uuidv7[];
    linkedReferences: CreatorLinkedReference;
    postsCount: number;
    productsCount: number;
    ratingAverage: number | null;
    ratingCount: number;
    socialLinks: readonly CreatorSocialLink[];
    suspendedReason: string | null;
    suspendedUntil: UtcTimestamp | null;
    visibility: CreatorProfileVisibility;
  }
>;

export type CreateCreatorProfileInput = Readonly<{
  actorUserId?: Uuidv7 | null;
  bio?: string;
  coverAssetId?: Uuidv7 | null;
  creatorUserId: Uuidv7;
  displayName: string;
  followedByViewerIds?: readonly Uuidv7[];
  id?: Uuidv7;
  avatarAssetId?: Uuidv7 | null;
  province?: string | null;
  socialLinks?: readonly CreatorSocialLink[];
  visibility?: CreatorProfileVisibility;
}>;

export type CreatorProfileFilter = Readonly<{
  creatorUserId?: Uuidv7;
  province?: string | null;
  visibility?: CreatorProfileVisibility;
}>;

// ── Repository ────────────────────────────────────────────────────────────

export type CreatorProfileRepository = Readonly<{
  create(input: CreateCreatorProfileInput): Promise<CreatorProfileRecord>;
  findByCreatorUserId(
    creatorUserId: Uuidv7,
    options?: Readonly<{ includeSuspended?: boolean }>,
  ): Promise<CreatorProfileRecord | null>;
  findById(
    id: Uuidv7,
    options?: Readonly<{ includeDeleted?: boolean }>,
  ): Promise<CreatorProfileRecord | null>;
  list(
    request: RepositoryListRequest<
      CreatorProfileFilter,
      CreatorProfileSortField
    >,
  ): Promise<RepositoryListPage<CreatorProfileRecord>>;
  suspend(
    id: Uuidv7,
    expectedVersion: number,
    reason: string,
    suspendedUntil: UtcTimestamp | null,
  ): Promise<CreatorProfileRecord>;
  unhide(id: Uuidv7, expectedVersion: number): Promise<CreatorProfileRecord>;
  update(
    profile: CreatorProfileRecord,
    expectedVersion: number,
  ): Promise<CreatorProfileRecord>;
}>;

// ── Errors ────────────────────────────────────────────────────────────────

export class CreatorProfileNotFoundError extends Error {
  readonly code = 'RESOURCE_NOT_FOUND';
  readonly status = 404;

  constructor(creatorUserId: Uuidv7) {
    super(`Creator profile for user ${creatorUserId} not found`);
    this.name = 'CreatorProfileNotFoundError';
  }
}

export class CreatorProfileSuspendedError extends Error {
  readonly code = 'CREATOR_PROFILE_SUSPENDED';
  readonly status = 423;

  constructor(
    creatorUserId: Uuidv7,
    reason: string,
    until: UtcTimestamp | null,
  ) {
    super(
      `Creator ${creatorUserId} is suspended until ${until ?? 'further notice'}: ${reason}`,
    );
    this.name = 'CreatorProfileSuspendedError';
  }
}

export class CreatorProfileVersionConflictError extends Error {
  readonly code = 'RESOURCE_VERSION_CONFLICT';
  readonly status = 409;

  constructor(message: string) {
    super(message);
    this.name = 'CreatorProfileVersionConflictError';
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────

export function isCreatorProfilePubliclyVisible(
  profile: CreatorProfileRecord,
): boolean {
  return profile.visibility === 'PUBLIC_ACTIVE';
}

export function canCreatorPublishContent(
  profile: CreatorProfileRecord,
  now: UtcTimestamp,
): boolean {
  if (profile.visibility === 'SUSPENDED' || profile.visibility === 'REMOVED') {
    return false;
  }
  if (profile.visibility === 'PUBLIC_HIDDEN') {
    return false;
  }
  if (profile.suspendedUntil && profile.suspendedUntil > now) {
    return false;
  }
  return true;
}

export function isCreatorProfileAvailableForViewer(
  profile: CreatorProfileRecord,
  viewerUserId: Uuidv7 | null,
): boolean {
  if (profile.visibility === 'REMOVED') return false;
  if (profile.visibility === 'SUSPENDED') return false;
  // Authors may always view their own profile (even when hidden)
  if (profile.creatorUserId === viewerUserId) return true;
  if (profile.visibility === 'PUBLIC_HIDDEN') return false;
  return true;
}
