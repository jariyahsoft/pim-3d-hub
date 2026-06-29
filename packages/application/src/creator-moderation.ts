import {
  type ContentPostRecord,
  type ContentPostRepository,
  type CreateReportInput,
  type CreatorLinkedReference,
  type CreatorProfileFilter,
  type CreatorProfileRecord,
  type CreatorProfileRepository,
  type CreatorProfileSortField,
  type CreatorProfileVisibility,
  type CreatorSocialLink,
  type ModerationActionType,
  type ModerationCaseRecord,
  type ModerationCaseRepository,
  type ModerationCaseStatus,
  type ReasonCode,
  type ReportRecord,
  type ReportRepository,
  type RepositoryListPage,
  type RepositoryListRequest,
  type ReportStatus,
  type ReportTargetType,
  type UtcTimestamp,
  type Uuidv7,
  assertPostTransition,
} from '@pim/domain';

// ── Command types ─────────────────────────────────────────────────────────

export type CreateCreatorProfileCommand = Readonly<{
  actorUserId: Uuidv7;
  bio: string;
  coverAssetId?: Uuidv7 | null;
  creatorUserId: Uuidv7;
  displayName: string;
  province?: string | null;
  socialLinks?: readonly CreatorSocialLink[];
}>;

export type UpdateCreatorProfileCommand = Readonly<{
  actorUserId: Uuidv7;
  bio?: string;
  coverAssetId?: Uuidv7 | null;
  expectedVersion: number;
  profileId: Uuidv7;
  province?: string | null;
  socialLinks?: readonly CreatorSocialLink[];
}>;

export type SuspendCreatorCommand = Readonly<{
  actorModeratorId: Uuidv7;
  expectedVersion: number;
  profileId: Uuidv7;
  reason: string;
  suspendedUntil?: UtcTimestamp | null;
}>;

export type FileReportCommand = Readonly<{
  actorUserId: Uuidv7;
  description: string;
  reason: ReasonCode;
  reporterUserId: Uuidv7;
  targetId: Uuidv7;
  targetType: ReportTargetType;
}>;

export type TakeModerationActionCommand = Readonly<{
  action: ModerationActionType;
  actionDuration: number | null;
  actionReason: string;
  actorStaffId: Uuidv7;
  expectedVersion: number;
  moderationCaseId: Uuidv7;
  targetId: Uuidv7;
  targetType: ReportTargetType;
}>;

// ── DTOs ──────────────────────────────────────────────────────────────────

export type CreatorProfileDto = Readonly<{
  avatarAssetId: Uuidv7 | null;
  bio: string;
  coverAssetId: Uuidv7 | null;
  creatorUserId: Uuidv7;
  displayName: string;
  id: Uuidv7;
  isFollowedByViewer: boolean;
  linkedReferences: CreatorLinkedReference;
  postsCount: number;
  productsCount: number;
  province: string | null;
  ratingAverage: number | null;
  ratingCount: number;
  socialLinks: readonly CreatorSocialLink[];
  suspendedReason: string | null;
  suspendedUntil: UtcTimestamp | null;
  version: number;
  visibility: CreatorProfileVisibility;
}>;

export type PublicCreatorProfileDto = Readonly<{
  creatorUserId: Uuidv7;
  displayName: string;
  id: Uuidv7;
  isFollowedByViewer: boolean;
  postsCount: number;
  productsCount: number;
  province: string | null;
  ratingAverage: number | null;
  ratingCount: number;
  socialLinks: readonly CreatorSocialLink[];
  visibility: 'PUBLIC_ACTIVE' | 'PUBLIC_HIDDEN';
}>;

export type ModerationActionResultDto = Readonly<{
  action: ModerationActionType;
  caseId: Uuidv7;
  postsAffected: number;
  reason: string;
  targetId: Uuidv7;
  targetType: ReportTargetType;
}>;

export type ReportDto = Readonly<{
  description: string;
  id: Uuidv7;
  moderationCaseId: Uuidv7 | null;
  reason: ReasonCode;
  reporterUserId: Uuidv7;
  status: ReportStatus;
  targetId: Uuidv7;
  targetType: ReportTargetType;
}>;

export type ModerationCaseDto = Readonly<{
  actionedAt: UtcTimestamp | null;
  actionedBy: Uuidv7 | null;
  actionReason: string | null;
  actionTaken: ModerationActionType | null;
  assignedModeratorId: Uuidv7 | null;
  id: Uuidv7;
  priority: number;
  reportIds: readonly Uuidv7[];
  status: ModerationCaseStatus;
  targetId: Uuidv7;
  targetType: ReportTargetType;
}>;

// ── Reason codes (UI string mapping lives in the presentation layer) ────

export const reportReasonCodes = [
  'SPAM',
  'HARASSMENT',
  'INAPPROPRIATE_CONTENT',
  'FRAUD',
  'COPYRIGHT_VIOLATION',
  'IMPERSONATION',
  'OTHER',
] as const;
export type ReasonCode = (typeof reportReasonCodes)[number];

// ── Errors ────────────────────────────────────────────────────────────────

export class CreatorProfileError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
    this.name = 'CreatorProfileError';
  }
}

// ── Service ports ─────────────────────────────────────────────────────────

export type CreatorModerationServicePorts = Readonly<{
  contentPostRepository: ContentPostRepository;
  creatorProfileRepository: CreatorProfileRepository;
  moderationCaseRepository: ModerationCaseRepository;
  notificationPort?: {
    notifyUser(
      userId: Uuidv7,
      payload: Readonly<{ reason: string; subject: string }>,
    ): Promise<void>;
  };
  reportRepository: ReportRepository;
}>;

// ── Service ───────────────────────────────────────────────────────────────

export type CreatorModerationService = Readonly<{
  createCreatorProfile(
    command: CreateCreatorProfileCommand,
  ): Promise<CreatorProfileDto>;
  fileReport(command: FileReportCommand): Promise<ReportDto>;
  findPublicProfile(
    creatorUserId: Uuidv7,
    viewerUserId: Uuidv7 | null,
  ): Promise<PublicCreatorProfileDto | null>;
  getPrivateProfile(
    creatorUserId: Uuidv7,
    viewerUserId: Uuidv7,
  ): Promise<CreatorProfileDto>;
  listProfiles(
    filter: CreatorProfileFilter | null,
    cursor: string | null,
    limit: number,
    sort: { direction: 'asc' | 'desc'; field: CreatorProfileSortField },
  ): Promise<RepositoryListPage<CreatorProfileDto>>;
  suspendCreator(command: SuspendCreatorCommand): Promise<CreatorProfileDto>;
  takeModerationAction(
    command: TakeModerationActionCommand,
  ): Promise<ModerationActionResultDto>;
  unhideCreator(
    expectedVersion: number,
    profileId: Uuidv7,
  ): Promise<CreatorProfileDto>;
  updateCreatorProfile(
    command: UpdateCreatorProfileCommand,
  ): Promise<CreatorProfileDto>;
}>;

// ── Helpers ──────────────────────────────────────────────────────────────

function toDto(
  rec: CreatorProfileRecord,
  viewerUserId: Uuidv7 | null,
): CreatorProfileDto {
  return {
    id: rec.id,
    creatorUserId: rec.creatorUserId,
    displayName: rec.displayName,
    bio: rec.bio,
    province: rec.province,
    avatarAssetId: rec.avatarAssetId,
    coverAssetId: rec.coverAssetId,
    isFollowedByViewer: viewerUserId
      ? rec.followedByViewerIds.includes(viewerUserId)
      : false,
    linkedReferences: { ...rec.linkedReferences },
    postsCount: rec.postsCount,
    productsCount: rec.productsCount,
    ratingAverage: rec.ratingAverage,
    ratingCount: rec.ratingCount,
    socialLinks: [...rec.socialLinks],
    suspendedReason: rec.suspendedReason,
    suspendedUntil: rec.suspendedUntil,
    version: rec.version,
    visibility: rec.visibility,
  };
}

function toPublicDto(
  rec: CreatorProfileRecord,
  viewerUserId: Uuidv7 | null,
): PublicCreatorProfileDto | null {
  if (rec.visibility === 'REMOVED' || rec.visibility === 'SUSPENDED')
    return null;
  return {
    id: rec.id,
    creatorUserId: rec.creatorUserId,
    displayName: rec.displayName,
    province: rec.province,
    isFollowedByViewer: viewerUserId
      ? rec.followedByViewerIds.includes(viewerUserId)
      : false,
    postsCount: rec.postsCount,
    productsCount: rec.productsCount,
    ratingAverage: rec.ratingAverage,
    ratingCount: rec.ratingCount,
    socialLinks: [...rec.socialLinks],
    visibility: rec.visibility,
  };
}

// ── Implementation ────────────────────────────────────────────────────────

export function createCreatorModerationService(
  ports: CreatorModerationServicePorts,
): CreatorModerationService {
  async function createCreatorProfile(
    command: CreateCreatorProfileCommand,
  ): Promise<CreatorProfileDto> {
    if (command.actorUserId !== command.creatorUserId) {
      throw new CreatorProfileError(
        'AUTHORIZATION_DENIED',
        'Only the creator can create their own profile',
        403,
      );
    }
    const input = {
      actorUserId: command.actorUserId,
      bio: command.bio,
      coverAssetId: command.coverAssetId ?? null,
      creatorUserId: command.creatorUserId,
      displayName: command.displayName,
      province: command.province ?? null,
      socialLinks: command.socialLinks,
    };
    const rec = await ports.creatorProfileRepository.create(input);
    return toDto(rec, command.actorUserId);
  }

  async function updateCreatorProfile(
    command: UpdateCreatorProfileCommand,
  ): Promise<CreatorProfileDto> {
    const existing = await ports.creatorProfileRepository.findById(
      command.profileId,
    );
    if (!existing) {
      throw new CreatorProfileError(
        'CREATOR_PROFILE_NOT_FOUND',
        `Creator profile ${command.profileId} not found`,
        404,
      );
    }
    if (existing.creatorUserId !== command.actorUserId) {
      throw new CreatorProfileError(
        'AUTHORIZATION_DENIED',
        'Only the creator can update their own profile',
        403,
      );
    }
    if (
      existing.visibility === 'SUSPENDED' ||
      existing.visibility === 'REMOVED'
    ) {
      throw new CreatorProfileError(
        'CREATOR_PROFILE_SUSPENDED',
        `Cannot edit a ${existing.visibility} profile`,
        423,
      );
    }

    const updated: CreatorProfileRecord = {
      ...existing,
      bio: command.bio ?? existing.bio,
      coverAssetId: command.coverAssetId ?? existing.coverAssetId,
      province: command.province ?? existing.province,
      socialLinks: command.socialLinks ?? existing.socialLinks,
      updatedBy: command.actorUserId,
    };

    try {
      const rec = await ports.creatorProfileRepository.update(
        updated,
        command.expectedVersion,
      );
      return toDto(rec, command.actorUserId);
    } catch (err) {
      if (err instanceof Error && err.message.includes('version conflict')) {
        throw new CreatorProfileError(
          'RESOURCE_VERSION_CONFLICT',
          err.message,
          409,
        );
      }
      throw err;
    }
  }

  async function suspendCreator(
    command: SuspendCreatorCommand,
  ): Promise<CreatorProfileDto> {
    const existing = await ports.creatorProfileRepository.findById(
      command.profileId,
    );
    if (!existing) {
      throw new CreatorProfileError(
        'CREATOR_PROFILE_NOT_FOUND',
        `Creator profile ${command.profileId} not found`,
        404,
      );
    }

    try {
      const rec = await ports.creatorProfileRepository.suspend(
        command.profileId,
        command.expectedVersion,
        command.reason,
        command.suspendedUntil ?? null,
      );

      if (ports.notificationPort) {
        await ports.notificationPort.notifyUser(rec.creatorUserId, {
          reason: command.reason,
          subject: 'Account suspended',
        });
      }

      return toDto(rec, rec.creatorUserId);
    } catch (err) {
      if (err instanceof Error && err.message.includes('version conflict')) {
        throw new CreatorProfileError(
          'RESOURCE_VERSION_CONFLICT',
          err.message,
          409,
        );
      }
      throw err;
    }
  }

  async function unhideCreator(
    expectedVersion: number,
    profileId: Uuidv7,
  ): Promise<CreatorProfileDto> {
    try {
      const rec = await ports.creatorProfileRepository.unhide(
        profileId,
        expectedVersion,
      );
      return toDto(rec, rec.creatorUserId);
    } catch (err) {
      if (err instanceof Error && err.message.includes('version conflict')) {
        throw new CreatorProfileError(
          'RESOURCE_VERSION_CONFLICT',
          err.message,
          409,
        );
      }
      if (err instanceof Error && err.message.includes('not found')) {
        throw new CreatorProfileError(
          'CREATOR_PROFILE_NOT_FOUND',
          err.message,
          404,
        );
      }
      throw err;
    }
  }

  async function getPrivateProfile(
    creatorUserId: Uuidv7,
    viewerUserId: Uuidv7,
  ): Promise<CreatorProfileDto> {
    const rec = await ports.creatorProfileRepository.findByCreatorUserId(
      creatorUserId,
      { includeSuspended: true },
    );
    if (!rec) {
      throw new CreatorProfileError(
        'CREATOR_PROFILE_NOT_FOUND',
        `Creator profile for ${creatorUserId} not found`,
        404,
      );
    }
    // Only the owner may view their full private profile
    if (rec.creatorUserId !== viewerUserId) {
      throw new CreatorProfileError(
        'AUTHORIZATION_DENIED',
        'Only the creator may view private profile fields',
        403,
      );
    }
    return toDto(rec, viewerUserId);
  }

  async function findPublicProfile(
    creatorUserId: Uuidv7,
    viewerUserId: Uuidv7 | null,
  ): Promise<PublicCreatorProfileDto | null> {
    const rec =
      await ports.creatorProfileRepository.findByCreatorUserId(creatorUserId);
    if (!rec) return null;
    return toPublicDto(rec, viewerUserId);
  }

  async function listProfiles(
    filter: CreatorProfileFilter | null,
    cursor: string | null,
    limit: number,
    sort: { direction: 'asc' | 'desc'; field: CreatorProfileSortField },
  ): Promise<RepositoryListPage<CreatorProfileDto>> {
    const request: RepositoryListRequest<
      CreatorProfileFilter,
      CreatorProfileSortField
    > = {
      cursor: cursor ?? undefined,
      filter: filter ?? undefined,
      limit,
      sort,
    };
    const page = await ports.creatorProfileRepository.list(request);
    return {
      items: page.items.map((r) => toDto(r, null)),
      nextCursor: page.nextCursor,
    };
  }

  async function fileReport(command: FileReportCommand): Promise<ReportDto> {
    const input: CreateReportInput = {
      description: command.description,
      reason: command.reason,
      reporterUserId: command.reporterUserId,
      targetId: command.targetId,
      targetType: command.targetType,
      createdBy: command.actorUserId,
      updatedBy: command.actorUserId,
    };
    const rec = await ports.reportRepository.create(input);
    return toReportDto(rec);
  }

  async function takeModerationAction(
    command: TakeModerationActionCommand,
  ): Promise<ModerationActionResultDto> {
    const caseRecord = await ports.moderationCaseRepository.findById(
      command.moderationCaseId,
    );
    if (!caseRecord) {
      throw new CreatorProfileError(
        'MODERATION_CASE_NOT_FOUND',
        `Moderation case ${command.moderationCaseId} not found`,
        404,
      );
    }

    let postsAffected = 0;
    if (
      command.targetType === 'POST' &&
      (command.action === 'HIDE' || command.action === 'REMOVE')
    ) {
      const post = await ports.contentPostRepository.findById(command.targetId);
      if (post) {
        const targetStatus = command.action === 'HIDE' ? 'HIDDEN' : 'REMOVED';
        try {
          assertPostTransition(post.status, targetStatus);
        } catch {
          throw new CreatorProfileError(
            'STATE_TRANSITION_ERROR',
            `Cannot transition post ${post.status} → ${targetStatus}`,
            422,
          );
        }
        const updated: ContentPostRecord = {
          ...post,
          status: targetStatus,
          moderationReason: command.actionReason,
          updatedBy: command.actorStaffId,
        };
        try {
          await ports.contentPostRepository.update(updated, post.version);
          postsAffected = 1;
        } catch {
          postsAffected = 0;
        }
      }
    }

    const updatedCase: ModerationCaseRecord = {
      ...caseRecord,
      status: 'RESOLVED',
      actionTaken: command.action,
      actionReason: command.actionReason,
      actionDuration: command.actionDuration,
      actionedAt:
        new Date().toISOString() as ModerationCaseRecord['actionedAt'],
      actionedBy: command.actorStaffId,
      updatedBy: command.actorStaffId,
    };
    await ports.moderationCaseRepository.update(
      command.moderationCaseId,
      command.expectedVersion,
      {
        status: updatedCase.status,
        actionTaken: updatedCase.actionTaken,
        actionReason: updatedCase.actionReason,
        actionDuration: updatedCase.actionDuration,
        actionedAt: updatedCase.actionedAt,
        actionedBy: updatedCase.actionedBy,
      },
    );

    return {
      action: command.action,
      caseId: command.moderationCaseId,
      postsAffected,
      reason: command.actionReason,
      targetId: command.targetId,
      targetType: command.targetType,
    };
  }

  return {
    createCreatorProfile,
    fileReport,
    findPublicProfile,
    getPrivateProfile,
    listProfiles,
    suspendCreator,
    takeModerationAction,
    unhideCreator,
    updateCreatorProfile,
  };
}

// ── mappers ─────────────────────────────────────────────────────────────

function toReportDto(r: ReportRecord): ReportDto {
  return {
    id: r.id,
    reporterUserId: r.reporterUserId,
    targetId: r.targetId,
    targetType: r.targetType,
    reason: r.reason,
    description: r.description,
    status: r.status,
    moderationCaseId: r.moderationCaseId,
  };
}
