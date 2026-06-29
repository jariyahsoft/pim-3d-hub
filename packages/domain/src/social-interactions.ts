import type {
  CanonicalRecord,
  RepositoryListPage,
  RepositoryListRequest,
} from './repository.js';
import type { Uuidv7 } from './index.js';

// ── Reactions ─────────────────────────────────────────────────────────────

export const reactionKinds = [
  'LIKE',
  'WOW',
  'HELPFUL',
  'FOLLOW',
  'SAVE',
] as const;
export type ReactionKind = (typeof reactionKinds)[number];

export type ReactionRecord = Readonly<
  CanonicalRecord & {
    idempotencyKey: string;
    postId: Uuidv7;
    reaction: ReactionKind;
    userId: Uuidv7;
  }
>;

// ── Comments ──────────────────────────────────────────────────────────────

export const commentStatuses = ['PUBLISHED', 'HIDDEN', 'REMOVED'] as const;
export type CommentStatus = (typeof commentStatuses)[number];

export type CommentRecord = Readonly<
  CanonicalRecord & {
    body: string;
    moderationReason: string | null;
    postId: Uuidv7;
    status: CommentStatus;
    userId: Uuidv7;
  }
>;

// ── Follows ───────────────────────────────────────────────────────────────

export const followStatuses = ['ACTIVE', 'PAUSED'] as const;
export type FollowStatus = (typeof followStatuses)[number];

export type FollowRecord = Readonly<
  CanonicalRecord & {
    followerId: Uuidv7;
    followeeId: Uuidv7;
    idempotencyKey: string;
    status: FollowStatus;
  }
>;

// ── Saves ─────────────────────────────────────────────────────────────────

export type SaveRecord = Readonly<
  CanonicalRecord & {
    collectionId: Uuidv7 | null;
    contentType: 'POST' | 'PRODUCT' | 'PROVIDER';
    contentId: Uuidv7;
    idempotencyKey: string;
    userId: Uuidv7;
  }
>;

// ── Sort fields ───────────────────────────────────────────────────────────

export type ReactionSortField = 'createdAt' | 'updatedAt';
export type CommentSortField = 'createdAt' | 'updatedAt';
export type FollowSortField = 'createdAt' | 'updatedAt';
export type SaveSortField = 'createdAt' | 'updatedAt';

// ── Filters ──────────────────────────────────────────────────────────────

export type ReactionFilter = Readonly<{
  postId?: Uuidv7;
  reaction?: ReactionKind;
  userId?: Uuidv7;
}>;

export type CommentFilter = Readonly<{
  postId?: Uuidv7;
  status?: CommentStatus;
  userId?: Uuidv7;
}>;

export type FollowFilter = Readonly<{
  followeeId?: Uuidv7;
  followerId?: Uuidv7;
  status?: FollowStatus;
}>;

export type SaveFilter = Readonly<{
  collectionId?: Uuidv7;
  contentType?: 'POST' | 'PRODUCT' | 'PROVIDER';
  userId?: Uuidv7;
}>;

// ── Repositories ──────────────────────────────────────────────────────────

export type ReactionRepository = Readonly<{
  createIfNotExists(input: {
    actorUserId: Uuidv7;
    idempotencyKey: string;
    postId: Uuidv7;
    reaction: ReactionKind;
  }): Promise<Readonly<{ created: boolean; reaction: ReactionRecord }>>;
  findByIdempotencyKey(
    userId: Uuidv7,
    idempotencyKey: string,
  ): Promise<ReactionRecord | null>;
  list(
    request: RepositoryListRequest<ReactionFilter, ReactionSortField>,
  ): Promise<RepositoryListPage<ReactionRecord>>;
  remove(id: Uuidv7): Promise<void>;
}>;

export type CommentRepository = Readonly<{
  create(input: {
    actorUserId: Uuidv7;
    body: string;
    postId: Uuidv7;
    userId: Uuidv7;
  }): Promise<CommentRecord>;
  findById(
    id: Uuidv7,
    options?: Readonly<{ includeDeleted?: boolean }>,
  ): Promise<CommentRecord | null>;
  hide(
    id: Uuidv7,
    expectedVersion: number,
    moderationReason: string,
  ): Promise<CommentRecord>;
  list(
    request: RepositoryListRequest<CommentFilter, CommentSortField>,
  ): Promise<RepositoryListPage<CommentRecord>>;
  remove(
    id: Uuidv7,
    expectedVersion: number,
    moderationReason: string,
  ): Promise<CommentRecord>;
}>;

export type FollowRepository = Readonly<{
  createIfNotExists(input: {
    actorUserId: Uuidv7;
    followerId: Uuidv7;
    followeeId: Uuidv7;
    idempotencyKey: string;
  }): Promise<Readonly<{ created: boolean; follow: FollowRecord }>>;
  findByIdempotencyKey(
    followerId: Uuidv7,
    idempotencyKey: string,
  ): Promise<FollowRecord | null>;
  list(
    request: RepositoryListRequest<FollowFilter, FollowSortField>,
  ): Promise<RepositoryListPage<FollowRecord>>;
  pause(id: Uuidv7, expectedVersion: number): Promise<FollowRecord>;
}>;

// ── Errors ────────────────────────────────────────────────────────────────

export class DuplicateSocialInteractionError extends Error {
  readonly code = 'IDEMPOTENCY_CONFLICT';
  readonly status = 409;

  constructor(message: string) {
    super(message);
    this.name = 'DuplicateSocialInteractionError';
  }
}

export class SocialInteractionNotFoundError extends Error {
  readonly code = 'RESOURCE_NOT_FOUND';
  readonly status = 404;

  constructor(message: string) {
    super(message);
    this.name = 'SocialInteractionNotFoundError';
  }
}

export class SocialInteractionRateLimitError extends Error {
  readonly code = 'RATE_LIMIT_ERROR';
  readonly status = 429;

  constructor(message: string) {
    super(message);
    this.name = 'SocialInteractionRateLimitError';
  }
}

export class SocialInteractionInvalidError extends Error {
  readonly code = 'VALIDATION_ERROR';
  readonly fields: readonly string[];
  readonly status = 400;

  constructor(fields: readonly string[], message: string) {
    super(message);
    this.name = 'SocialInteractionInvalidError';
    this.fields = fields;
  }
}

// ── Uniqueness helpers ───────────────────────────────────────────────────

export function buildSocialIdempotencyKey(
  action: 'reaction' | 'follow' | 'save',
  subjectA: string,
  subjectB: string,
): string {
  return `${action}:${subjectA}:${subjectB}`;
}
