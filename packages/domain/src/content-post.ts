import type {
  CanonicalRecord,
  RepositoryListPage,
  RepositoryListRequest,
} from './repository.js';
import type { UtcTimestamp, Uuidv7 } from './index.js';

// ── Statuses ──────────────────────────────────────────────────────────────

export const postStatuses = [
  'DRAFT',
  'PUBLISHED',
  'HIDDEN',
  'REMOVED',
] as const;
export type PostStatus = (typeof postStatuses)[number];

export const postVisibilities = ['PUBLIC', 'FOLLOWERS', 'PRIVATE'] as const;
export type PostVisibility = (typeof postVisibilities)[number];

export const postTypes = ['IMAGE', 'VIDEO', 'TEXT', 'SHOWCASE'] as const;
export type PostType = (typeof postTypes)[number];

export const postMediaKinds = [
  'DERIVED_IMAGE',
  'DERIVED_VIDEO',
  'EXTERNAL_IMAGE',
  'EXTERNAL_VIDEO',
  'NONE',
] as const;
export type PostMediaKind = (typeof postMediaKinds)[number];

export const postSortFields = [
  'createdAt',
  'publishedAt',
  'updatedAt',
] as const;
export type PostSortField = (typeof postSortFields)[number];

// ── Media references ──────────────────────────────────────────────────────

export type PostMediaReference = Readonly<{
  altText: string;
  aspectRatio: string | null;
  assetId: Uuidv7 | null;
  bytes: number | null;
  externalUrl: string | null;
  height: number | null;
  kind: PostMediaKind;
  width: number | null;
}>;

// ── Linked entities ───────────────────────────────────────────────────────

export type PostLinkedReferences = Readonly<{
  orderId: Uuidv7 | null;
  productId: Uuidv7 | null;
  providerId: Uuidv7 | null;
  serviceId: Uuidv7 | null;
  showcaseConsentId: Uuidv7 | null;
}>;

// ── Record types ──────────────────────────────────────────────────────────

export type PostRecord = Readonly<
  CanonicalRecord & {
    authorId: Uuidv7;
    caption: string;
    linkedReferences: PostLinkedReferences;
    media: readonly PostMediaReference[];
    moderationReason: string | null;
    publishedAt: UtcTimestamp | null;
    sourceFileAssetId: Uuidv7 | null;
    status: PostStatus;
    type: PostType;
    visibility: PostVisibility;
  }
>;

export type CreatePostInput = Readonly<{
  actorUserId?: Uuidv7 | null;
  authorId: Uuidv7;
  caption: string;
  id?: Uuidv7;
  linkedReferences?: Partial<PostLinkedReferences>;
  media?: readonly PostMediaReference[];
  sourceFileAssetId?: Uuidv7 | null;
  status?: PostStatus;
  type: PostType;
  updatedBy?: Uuidv7 | null;
  visibility?: PostVisibility;
}>;

export type PostFilter = Readonly<{
  authorId?: Uuidv7;
  providerId?: Uuidv7;
  publishedAfter?: UtcTimestamp;
  publishedBefore?: UtcTimestamp;
  status?: PostStatus;
  visibility?: PostVisibility;
}>;

// ── State transitions ──────────────────────────────────────────────────────

const allowedPostTransitions: Record<PostStatus, PostStatus[]> = {
  DRAFT: ['PUBLISHED', 'REMOVED'],
  PUBLISHED: ['HIDDEN', 'REMOVED', 'DRAFT'],
  HIDDEN: ['PUBLISHED', 'REMOVED'],
  REMOVED: [],
};

export class PostStateTransitionError extends Error {
  readonly code = 'STATE_TRANSITION_ERROR';
  readonly currentStatus: PostStatus;
  readonly status = 422;
  readonly targetStatus: PostStatus;

  constructor(input: { currentStatus: PostStatus; targetStatus: PostStatus }) {
    super(
      `Post cannot transition from ${input.currentStatus} to ${input.targetStatus}`,
    );
    this.name = 'PostStateTransitionError';
    this.currentStatus = input.currentStatus;
    this.targetStatus = input.targetStatus;
  }
}

export function assertPostTransition(
  current: PostStatus,
  target: PostStatus,
): void {
  if (!allowedPostTransitions[current].includes(target)) {
    throw new PostStateTransitionError({
      currentStatus: current,
      targetStatus: target,
    });
  }
}

// ── Repository interface ──────────────────────────────────────────────────

export type PostRepository = Readonly<{
  create(input: CreatePostInput): Promise<PostRecord>;
  findById(
    id: Uuidv7,
    options?: Readonly<{ includeDeleted?: boolean }>,
  ): Promise<PostRecord | null>;
  list(
    request: RepositoryListRequest<PostFilter, PostSortField>,
  ): Promise<RepositoryListPage<PostRecord>>;
  softDelete(
    id: Uuidv7,
    expectedVersion: number,
    deletedBy?: Uuidv7 | null,
  ): Promise<PostRecord>;
  update(post: PostRecord, expectedVersion: number): Promise<PostRecord>;
}>;

// ── Feed projection (rebuildable read model) ──────────────────────────────

export type FeedCard = Readonly<{
  altTextSummary: string;
  authorBadgeVerified: boolean;
  authorDisplayName: string;
  authorId: Uuidv7;
  captionPreview: string;
  commentsCount: number;
  hasMedia: boolean;
  postId: Uuidv7;
  publishedAt: UtcTimestamp;
  reactionsSummary: Readonly<Record<string, number>>;
  sponsored: boolean;
  type: PostType;
}>;

export const feedProjectionVersion = 1;

// ── Visibility helpers ────────────────────────────────────────────────────

export function isPostVisibleInPublicFeed(
  post: PostRecord,
  now: UtcTimestamp,
): boolean {
  if (post.status !== 'PUBLISHED') return false;
  if (post.visibility !== 'PUBLIC') return false;
  if (!post.publishedAt) return false;
  if (post.publishedAt > now) return false;
  return true;
}

export function canUserViewPost(
  post: PostRecord,
  viewerUserId: Uuidv7 | null,
): boolean {
  if (post.status === 'REMOVED') return false;
  if (post.status === 'DRAFT') return post.authorId === viewerUserId;
  if (post.status === 'HIDDEN') return post.authorId === viewerUserId;
  if (post.visibility === 'PUBLIC') return true;
  if (post.visibility === 'PRIVATE') {
    return post.authorId === viewerUserId;
  }
  if (post.visibility === 'FOLLOWERS') {
    // Without follow lookup, conservatively deny; caller can override by
    // supplying follow info via the eligibility context.
    return post.authorId === viewerUserId;
  }
  return false;
}

export function isPrivateMedia(media: PostMediaReference): boolean {
  // Source model files are never public; only derived / external are allowed.
  if (media.kind === 'EXTERNAL_IMAGE' || media.kind === 'EXTERNAL_VIDEO') {
    return false;
  }
  if (media.kind === 'DERIVED_IMAGE' || media.kind === 'DERIVED_VIDEO') {
    return false;
  }
  return true;
}
