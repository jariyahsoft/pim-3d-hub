import {
  type CommentFilter,
  type CommentRecord,
  type CommentRepository,
  type CommentSortField,
  type CommentStatus,
  type FollowFilter,
  type FollowRecord,
  type FollowRepository,
  type FollowSortField,
  type ReactionFilter,
  type ReactionKind,
  type ReactionRecord,
  type ReactionRepository,
  type ReactionSortField,
  type RepositoryListPage,
  type RepositoryListRequest,
  type SaveFilter,
  type SaveRecord,
  type SaveRepository,
  type SaveSortField,
  type Uuidv7,
} from '@pim/domain';

// ── Command types ─────────────────────────────────────────────────────────

export type ToggleReactionCommand = Readonly<{
  actorUserId: Uuidv7;
  idempotencyKey: string;
  postId: Uuidv7;
  reaction: ReactionKind;
  userId: Uuidv7;
}>;

export type PostCommentCommand = Readonly<{
  actorUserId: Uuidv7;
  body: string;
  postId: Uuidv7;
  userId: Uuidv7;
}>;

export type FollowUserCommand = Readonly<{
  actorUserId: Uuidv7;
  followeeId: Uuidv7;
  followerId: Uuidv7;
  idempotencyKey: string;
}>;

export type UnfollowUserCommand = Readonly<{
  expectedVersion: number;
  followId: Uuidv7;
}>;

export type SaveItemCommand = Readonly<{
  actorUserId: Uuidv7;
  collectionId: Uuidv7 | null;
  contentId: Uuidv7;
  contentType: 'POST' | 'PRODUCT' | 'PROVIDER';
  idempotencyKey: string;
  userId: Uuidv7;
}>;

// ── DTOs ──────────────────────────────────────────────────────────────────

export type ReactionDto = Readonly<{
  createdAt: string;
  id: Uuidv7;
  postId: Uuidv7;
  reaction: ReactionKind;
  userId: Uuidv7;
}>;

export type CommentDto = Readonly<{
  body: string;
  createdAt: string;
  id: Uuidv7;
  moderationReason: string | null;
  postId: Uuidv7;
  status: CommentStatus;
  userId: Uuidv7;
  version: number;
}>;

export type FollowDto = Readonly<{
  createdAt: string;
  followeeId: Uuidv7;
  followerId: Uuidv7;
  id: Uuidv7;
  status: 'ACTIVE' | 'PAUSED';
  version: number;
}>;

export type SaveDto = Readonly<{
  collectionId: Uuidv7 | null;
  contentId: Uuidv7;
  contentType: 'POST' | 'PRODUCT' | 'PROVIDER';
  createdAt: string;
  id: Uuidv7;
  userId: Uuidv7;
}>;

function reactionToDto(r: ReactionRecord): ReactionDto {
  return {
    id: r.id,
    postId: r.postId,
    userId: r.userId,
    reaction: r.reaction,
    createdAt: r.createdAt,
  };
}

function commentToDto(c: CommentRecord): CommentDto {
  return {
    id: c.id,
    postId: c.postId,
    userId: c.userId,
    body: c.body,
    status: c.status,
    moderationReason: c.moderationReason,
    createdAt: c.createdAt,
    version: c.version,
  };
}

function followToDto(f: FollowRecord): FollowDto {
  return {
    id: f.id,
    followerId: f.followerId,
    followeeId: f.followeeId,
    status: f.status,
    createdAt: f.createdAt,
    version: f.version,
  };
}

function saveToDto(s: SaveRecord): SaveDto {
  return {
    id: s.id,
    userId: s.userId,
    collectionId: s.collectionId,
    contentType: s.contentType,
    contentId: s.contentId,
    createdAt: s.createdAt,
  };
}

// ── Errors ────────────────────────────────────────────────────────────────

export class SocialInteractionError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
    this.name = 'SocialInteractionError';
  }
}

// ── Service ───────────────────────────────────────────────────────────────

export type SocialInteractionsService = Readonly<{
  follow(command: FollowUserCommand): Promise<FollowDto>;
  listComments(
    filter: CommentFilter,
    cursor: string | null,
    limit: number,
    sort: { direction: 'asc' | 'desc'; field: CommentSortField },
  ): Promise<RepositoryListPage<CommentDto>>;
  listFollows(
    filter: FollowFilter,
    cursor: string | null,
    limit: number,
    sort: { direction: 'asc' | 'desc'; field: FollowSortField },
  ): Promise<RepositoryListPage<FollowDto>>;
  listReactions(
    filter: ReactionFilter,
    cursor: string | null,
    limit: number,
    sort: { direction: 'asc' | 'desc'; field: ReactionSortField },
  ): Promise<RepositoryListPage<ReactionDto>>;
  listSaves(
    filter: SaveFilter,
    cursor: string | null,
    limit: number,
    sort: { direction: 'asc' | 'desc'; field: SaveSortField },
  ): Promise<RepositoryListPage<SaveDto>>;
  postComment(command: PostCommentCommand): Promise<CommentDto>;
  save(command: SaveItemCommand): Promise<SaveDto>;
  toggleReaction(command: ToggleReactionCommand): Promise<{
    created: boolean;
    reaction: ReactionDto;
  }>;
  unfollow(command: UnfollowUserCommand): Promise<void>;
}>;

export type SocialInteractionsServicePorts = Readonly<{
  commentRepository: CommentRepository;
  followRepository: FollowRepository;
  reactionRepository: ReactionRepository;
  saveRepository: SaveRepository;
}>;

export function createSocialInteractionsService(
  ports: SocialInteractionsServicePorts,
): SocialInteractionsService {
  async function toggleReaction(
    command: ToggleReactionCommand,
  ): Promise<{ created: boolean; reaction: ReactionDto }> {
    if (command.userId !== command.actorUserId) {
      throw new SocialInteractionError(
        'AUTHORIZATION_DENIED',
        'Cannot react on behalf of another user',
        403,
      );
    }
    const result = await ports.reactionRepository.createIfNotExists({
      actorUserId: command.actorUserId,
      idempotencyKey: command.idempotencyKey,
      postId: command.postId,
      reaction: command.reaction,
      userId: command.userId,
    });
    return {
      created: result.created,
      reaction: reactionToDto(result.reaction),
    };
  }

  async function postComment(command: PostCommentCommand): Promise<CommentDto> {
    if (command.userId !== command.actorUserId) {
      throw new SocialInteractionError(
        'AUTHORIZATION_DENIED',
        'Cannot post comment on behalf of another user',
        403,
      );
    }
    const body = command.body.trim();
    if (body.length === 0 || body.length > 1000) {
      throw new SocialInteractionError(
        'VALIDATION_ERROR',
        'Comment body must be between 1 and 1000 characters',
        400,
      );
    }
    const rec = await ports.commentRepository.create({
      actorUserId: command.actorUserId,
      body,
      postId: command.postId,
      userId: command.userId,
    });
    return commentToDto(rec);
  }

  async function follow(command: FollowUserCommand): Promise<FollowDto> {
    if (command.followerId !== command.actorUserId) {
      throw new SocialInteractionError(
        'AUTHORIZATION_DENIED',
        'Cannot follow on behalf of another user',
        403,
      );
    }
    if (command.followerId === command.followeeId) {
      throw new SocialInteractionError(
        'VALIDATION_ERROR',
        'Cannot follow yourself',
        400,
      );
    }
    const result = await ports.followRepository.createIfNotExists({
      actorUserId: command.actorUserId,
      followerId: command.followerId,
      followeeId: command.followeeId,
      idempotencyKey: command.idempotencyKey,
    });
    return followToDto(result.follow);
  }

  async function unfollow(command: UnfollowUserCommand): Promise<void> {
    try {
      await ports.followRepository.pause(
        command.followId,
        command.expectedVersion,
      );
    } catch (err) {
      throw new SocialInteractionError(
        'RESOURCE_NOT_FOUND',
        err instanceof Error ? err.message : 'unfollow failed',
        404,
      );
    }
  }

  async function save(command: SaveItemCommand): Promise<SaveDto> {
    if (command.userId !== command.actorUserId) {
      throw new SocialInteractionError(
        'AUTHORIZATION_DENIED',
        'Cannot save on behalf of another user',
        403,
      );
    }
    const result = await ports.saveRepository.createIfNotExists({
      actorUserId: command.actorUserId,
      collectionId: command.collectionId,
      contentType: command.contentType,
      contentId: command.contentId,
      idempotencyKey: command.idempotencyKey,
      userId: command.userId,
    });
    return saveToDto(result.save);
  }

  async function listReactions(
    filter: ReactionFilter,
    cursor: string | null,
    limit: number,
    sort: { direction: 'asc' | 'desc'; field: ReactionSortField },
  ): Promise<RepositoryListPage<ReactionDto>> {
    const request: RepositoryListRequest<ReactionFilter, ReactionSortField> = {
      cursor: cursor ?? undefined,
      filter,
      limit,
      sort,
    };
    const page = await ports.reactionRepository.list(request);
    return {
      items: page.items.map(reactionToDto),
      nextCursor: page.nextCursor,
    };
  }

  async function listComments(
    filter: CommentFilter,
    cursor: string | null,
    limit: number,
    sort: { direction: 'asc' | 'desc'; field: CommentSortField },
  ): Promise<RepositoryListPage<CommentDto>> {
    const request: RepositoryListRequest<CommentFilter, CommentSortField> = {
      cursor: cursor ?? undefined,
      filter,
      limit,
      sort,
    };
    const page = await ports.commentRepository.list(request);
    return {
      items: page.items.map(commentToDto),
      nextCursor: page.nextCursor,
    };
  }

  async function listFollows(
    filter: FollowFilter,
    cursor: string | null,
    limit: number,
    sort: { direction: 'asc' | 'desc'; field: FollowSortField },
  ): Promise<RepositoryListPage<FollowDto>> {
    const request: RepositoryListRequest<FollowFilter, FollowSortField> = {
      cursor: cursor ?? undefined,
      filter,
      limit,
      sort,
    };
    const page = await ports.followRepository.list(request);
    return {
      items: page.items.map(followToDto),
      nextCursor: page.nextCursor,
    };
  }

  async function listSaves(
    filter: SaveFilter,
    cursor: string | null,
    limit: number,
    sort: { direction: 'asc' | 'desc'; field: SaveSortField },
  ): Promise<RepositoryListPage<SaveDto>> {
    const request: RepositoryListRequest<SaveFilter, SaveSortField> = {
      cursor: cursor ?? undefined,
      filter,
      limit,
      sort,
    };
    const page = await ports.saveRepository.list(request);
    return {
      items: page.items.map(saveToDto),
      nextCursor: page.nextCursor,
    };
  }

  return {
    follow,
    listComments,
    listFollows,
    listReactions,
    listSaves,
    postComment,
    save,
    toggleReaction,
    unfollow,
  };
}
