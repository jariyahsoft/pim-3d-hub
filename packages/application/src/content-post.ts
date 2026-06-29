import {
  type CreatePostInput,
  type FeedCard,
  type PostFilter,
  type PostLinkedReferences,
  type PostMediaReference,
  type PostRecord,
  type PostRepository,
  type PostSortField,
  type PostStatus,
  type PostType,
  type PostVisibility,
  type RepositoryListPage,
  type RepositoryListRequest,
  type Uuidv7,
  assertPostTransition,
  feedProjectionVersion,
  isPrivateMedia,
  isPostVisibleInPublicFeed,
  parseUtcTimestamp,
} from '@pim/domain';

// ── Command types ─────────────────────────────────────────────────────────

export type CreatePostDraftCommand = Readonly<{
  actorUserId: Uuidv7;
  authorId: Uuidv7;
  caption: string;
  linkedReferences?: Partial<PostLinkedReferences>;
  media?: readonly PostMediaReference[];
  sourceFileAssetId?: Uuidv7 | null;
  type: PostType;
  visibility?: PostVisibility;
}>;

export type PublishPostCommand = Readonly<{
  actorUserId: Uuidv7;
  expectedVersion: number;
  postId: Uuidv7;
  visibility?: PostVisibility;
}>;

export type HidePostCommand = Readonly<{
  actorUserId: Uuidv7;
  expectedVersion: number;
  moderationReason: string;
  postId: Uuidv7;
}>;

export type RemovePostCommand = Readonly<{
  actorUserId: Uuidv7;
  expectedVersion: number;
  moderationReason: string;
  postId: Uuidv7;
}>;

export type RebuildFeedQuery = Readonly<{
  cursor: string | null;
  limit: number;
  now: Uuidv7 extends never ? never : string;
  providerId?: Uuidv7;
  sortField?: PostSortField;
  sortDirection?: 'asc' | 'desc';
}>;

// ── DTOs ──────────────────────────────────────────────────────────────────

export type PostDto = Readonly<{
  authorId: Uuidv7;
  caption: string;
  createdAt: string;
  id: Uuidv7;
  linkedReferences: PostLinkedReferences;
  media: readonly PostMediaReference[];
  publishedAt: string | null;
  sourceFileAssetId: Uuidv7 | null;
  status: PostStatus;
  type: PostType;
  version: number;
  visibility: PostVisibility;
}>;

export type RebuildFeedResult = Readonly<{
  cards: readonly FeedCard[];
  generatedAt: string;
  nextCursor: string | null;
  projectionVersion: number;
}>;

function toDto(rec: PostRecord): PostDto {
  return {
    id: rec.id,
    authorId: rec.authorId,
    caption: rec.caption,
    createdAt: rec.createdAt,
    linkedReferences: { ...rec.linkedReferences },
    media: [...rec.media],
    publishedAt: rec.publishedAt,
    sourceFileAssetId: rec.sourceFileAssetId,
    status: rec.status,
    type: rec.type,
    version: rec.version,
    visibility: rec.visibility,
  };
}

// ── Errors ────────────────────────────────────────────────────────────────

export class PostNotFoundError extends Error {
  readonly code = 'RESOURCE_NOT_FOUND';
  readonly status = 404;

  constructor(postId: Uuidv7) {
    super(`Post ${postId} not found`);
    this.name = 'PostNotFoundError';
  }
}

export class PostPrivateMediaBlockedError extends Error {
  readonly code = 'PRIVATE_MEDIA_BLOCKED';
  readonly status = 422;

  constructor(message: string) {
    super(message);
    this.name = 'PostPrivateMediaBlockedError';
  }
}

export class PostAuthorMismatchError extends Error {
  readonly code = 'AUTHORIZATION_DENIED';
  readonly status = 403;

  constructor(message: string) {
    super(message);
    this.name = 'PostAuthorMismatchError';
  }
}

export class PostVisibilityError extends Error {
  readonly code = 'STATE_TRANSITION_ERROR';
  readonly status = 422;

  constructor(message: string) {
    super(message);
    this.name = 'PostVisibilityError';
  }
}

export class PostVersionConflictError extends Error {
  readonly code = 'RESOURCE_VERSION_CONFLICT';
  readonly status = 409;

  constructor(message: string) {
    super(message);
    this.name = 'PostVersionConflictError';
  }
}

// ── Service ───────────────────────────────────────────────────────────────

export type ContentPostService = Readonly<{
  createDraft(command: CreatePostDraftCommand): Promise<PostDto>;
  getById(postId: Uuidv7): Promise<PostDto>;
  hide(command: HidePostCommand): Promise<PostDto>;
  list(query: {
    cursor: string | null;
    filter?: PostFilter;
    limit: number;
    sortDirection?: 'asc' | 'desc';
    sortField?: PostSortField;
  }): Promise<RepositoryListPage<PostDto>>;
  publish(command: PublishPostCommand): Promise<PostDto>;
  rebuildFeed(query: RebuildFeedQuery): Promise<RebuildFeedResult>;
  remove(command: RemovePostCommand): Promise<PostDto>;
}>;

export type ContentPostServicePorts = Readonly<{
  postRepository: PostRepository;
}>;

function assertPostVersionConflict(err: unknown): never {
  if (err instanceof Error && err.message.includes('version conflict')) {
    throw new PostVersionConflictError(err.message);
  }
  throw err;
}

export function createContentPostService(
  ports: ContentPostServicePorts,
): ContentPostService {
  const repo = ports.postRepository;

  async function createDraft(
    command: CreatePostDraftCommand,
  ): Promise<PostDto> {
    if (command.authorId !== command.actorUserId) {
      throw new PostAuthorMismatchError(
        'Authors can only create their own posts',
      );
    }

    // Validate media against private-model policy
    for (const media of command.media ?? []) {
      if (media.assetId && isPrivateMedia(media)) {
        throw new PostPrivateMediaBlockedError(
          `Media asset ${media.assetId} cannot be used directly in a public post. Use derived media.`,
        );
      }
    }

    if (command.sourceFileAssetId && (command.media?.length ?? 0) === 0) {
      throw new PostPrivateMediaBlockedError(
        'A source file asset must be paired with derived media, never served as post media directly.',
      );
    }

    const input: CreatePostInput = {
      actorUserId: command.actorUserId,
      authorId: command.authorId,
      caption: command.caption,
      linkedReferences: command.linkedReferences,
      media: command.media,
      sourceFileAssetId: command.sourceFileAssetId ?? null,
      status: 'DRAFT',
      type: command.type,
      updatedBy: command.actorUserId,
      visibility: command.visibility,
    };

    const rec = await repo.create(input);
    return toDto(rec);
  }

  async function publish(command: PublishPostCommand): Promise<PostDto> {
    const existing = await repo.findById(command.postId);
    if (!existing) throw new PostNotFoundError(command.postId);
    if (existing.authorId !== command.actorUserId) {
      throw new PostAuthorMismatchError(
        `Only the author can publish post ${command.postId}`,
      );
    }

    assertPostTransition(existing.status, 'PUBLISHED');

    const visibility = command.visibility ?? existing.visibility;
    if (
      visibility !== 'PUBLIC' &&
      visibility !== 'FOLLOWERS' &&
      visibility !== 'PRIVATE'
    ) {
      throw new PostVisibilityError(`Unsupported visibility: ${visibility}`);
    }

    const updated: PostRecord = {
      ...existing,
      status: 'PUBLISHED',
      visibility,
      publishedAt: parseUtcTimestamp(new Date()),
      updatedBy: command.actorUserId,
    };

    try {
      const rec = await repo.update(updated, command.expectedVersion);
      return toDto(rec);
    } catch (err) {
      assertPostVersionConflict(err);
      throw err;
    }
  }

  async function hide(command: HidePostCommand): Promise<PostDto> {
    const existing = await repo.findById(command.postId);
    if (!existing) throw new PostNotFoundError(command.postId);

    assertPostTransition(existing.status, 'HIDDEN');
    const updated: PostRecord = {
      ...existing,
      status: 'HIDDEN',
      moderationReason: command.moderationReason,
      updatedBy: command.actorUserId,
    };

    try {
      const rec = await repo.update(updated, command.expectedVersion);
      return toDto(rec);
    } catch (err) {
      assertPostVersionConflict(err);
      throw err;
    }
  }

  async function remove(command: RemovePostCommand): Promise<PostDto> {
    const existing = await repo.findById(command.postId);
    if (!existing) throw new PostNotFoundError(command.postId);

    assertPostTransition(existing.status, 'REMOVED');
    const updated: PostRecord = {
      ...existing,
      status: 'REMOVED',
      moderationReason: command.moderationReason,
      updatedBy: command.actorUserId,
    };

    try {
      const rec = await repo.update(updated, command.expectedVersion);
      return toDto(rec);
    } catch (err) {
      assertPostVersionConflict(err);
      throw err;
    }
  }

  async function getById(postId: Uuidv7): Promise<PostDto> {
    const rec = await repo.findById(postId);
    if (!rec) throw new PostNotFoundError(postId);
    return toDto(rec);
  }

  async function list(query: {
    cursor: string | null;
    filter?: PostFilter;
    limit: number;
    sortDirection?: 'asc' | 'desc';
    sortField?: PostSortField;
  }): Promise<RepositoryListPage<PostDto>> {
    const request: RepositoryListRequest<PostFilter, PostSortField> = {
      cursor: query.cursor ?? undefined,
      filter: query.filter,
      limit: query.limit,
      sort: {
        direction: query.sortDirection ?? 'desc',
        field: query.sortField ?? 'updatedAt',
      },
    };
    const page = await repo.list(request);
    return {
      items: page.items.map(toDto),
      nextCursor: page.nextCursor,
    };
  }

  async function rebuildFeed(
    query: RebuildFeedQuery,
  ): Promise<RebuildFeedResult> {
    const request: RepositoryListRequest<PostFilter, PostSortField> = {
      cursor: query.cursor ?? undefined,
      filter: query.providerId
        ? { providerId: query.providerId, status: 'PUBLISHED' }
        : { status: 'PUBLISHED' },
      limit: query.limit,
      sort: {
        direction: query.sortDirection ?? 'desc',
        field: query.sortField ?? 'publishedAt',
      },
    };
    const page = await repo.list(request);

    // Filter for public-feed visibility (no draft, no hidden, no removed)
    const cards: FeedCard[] = [];
    for (const post of page.items) {
      if (!post.publishedAt) continue;
      if (!isPostVisibleInPublicFeed(post, parseUtcTimestamp(query.now)))
        continue;
      cards.push({
        postId: post.id,
        authorId: post.authorId,
        authorDisplayName: '',
        authorBadgeVerified: false,
        captionPreview: post.caption.slice(0, 200),
        publishedAt: post.publishedAt,
        type: post.type,
        hasMedia: post.media.length > 0,
        altTextSummary: post.media
          .map((m) => m.altText)
          .filter(Boolean)
          .join(' • '),
        reactionsSummary: {},
        commentsCount: 0,
        sponsored: false, // sponsorship lives in promotion placement; not in post domain
      });
    }

    return {
      cards,
      generatedAt: new Date().toISOString(),
      nextCursor: page.nextCursor,
      projectionVersion: feedProjectionVersion,
    };
  }

  return {
    createDraft,
    getById,
    hide,
    list,
    publish,
    rebuildFeed,
    remove,
  };
}
