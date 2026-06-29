import { describe, it, expect } from 'vitest';
// eslint-disable-next-line no-restricted-imports
import {
  createInMemoryContentPostRepository,
  createInMemoryCreatorProfileRepository,
} from '@pim/infrastructure';
import { createCreatorModerationService } from './creator-moderation.js';
import type { Uuidv7 } from '@pim/domain';

const AUTHOR = '00000000-0000-7000-0000-000000000001' as Uuidv7;
const OTHER = '00000000-0000-7000-0000-000000000002' as Uuidv7;

const POST_ID = '00000000-0000-7000-0000-000000000004' as Uuidv7;
const CASE_ID = '00000000-0000-7000-0000-000000000005' as Uuidv7;

// ── Mock report + moderation case repositories (in-memory stubs) ──────────

interface InMemoryStub {
  cases: Map<string, any>;
  caseRepo: any;
}

function makeStubs(): InMemoryStub {
  const cases = new Map<string, any>();
  cases.set(CASE_ID, {
    id: CASE_ID,
    schemaVersion: 1,
    version: 1,
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
    deletedAt: null,
    createdBy: null,
    updatedBy: null,
    targetType: 'POST',
    targetId: POST_ID,
    status: 'OPEN',
    assignedModeratorId: null,
    priority: 1,
    actionTaken: null,
    actionDuration: null,
    actionReason: null,
    actionedAt: null,
    actionedBy: null,
    reportIds: [],
    evidenceSnapshot: {},
  });

  return {
    cases,
    caseRepo: {
      async create(input: any) {
        const id = crypto.randomUUID();
        cases.set(id, {
          id,
          schemaVersion: 1,
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
          createdBy: input.createdBy ?? null,
          updatedBy: input.updatedBy ?? input.createdBy ?? null,
          ...input,
          reportIds: input.reportIds ?? [],
          evidenceSnapshot: input.evidenceSnapshot ?? {},
        });
        return cases.get(id);
      },
      async findById(id: Uuidv7) {
        return cases.get(id) ?? null;
      },
      async list() {
        return { items: Array.from(cases.values()), nextCursor: null };
      },
      async update(id: Uuidv7, expectedVersion: number, input: any) {
        const existing = cases.get(id);
        if (!existing) throw new Error('not found');
        if (existing.version !== expectedVersion) {
          throw new Error('version conflict');
        }
        const updated = {
          ...existing,
          ...input,
          version: existing.version + 1,
          updatedAt: new Date().toISOString(),
        };
        cases.set(id, updated);
        return updated;
      },
    },
  };
}

function makeSvc(opts?: { withNotification?: boolean }) {
  const creatorRepo = createInMemoryCreatorProfileRepository();
  const postRepo = createInMemoryContentPostRepository();
  const stubs = makeStubs();
  return {
    svc: createCreatorModerationService({
      contentPostRepository: postRepo,
      creatorProfileRepository: creatorRepo,
      moderationCaseRepository: stubs.caseRepo,
      reportRepository: {
        async create(input: any) {
          return {
            id: crypto.randomUUID(),
            schemaVersion: 1,
            version: 1,
            createdAt: '2026-07-01T00:00:00Z',
            updatedAt: '2026-07-01T00:00:00Z',
            deletedAt: null,
            createdBy: null,
            updatedBy: null,
            ...input,
            status: 'PENDING',
            assignedModeratorId: null,
            moderationCaseId: null,
            resolvedAt: null,
            resolvedBy: null,
            resolutionNotes: null,
          };
        },
        async findById() {
          return null;
        },
        async list() {
          return { items: [], nextCursor: null };
        },
        async update() {
          throw new Error('not supported');
        },
      } as any,
      notificationPort: opts?.withNotification
        ? {
            async notifyUser() {
              /* noop */
            },
          }
        : undefined,
    }),
    creatorRepo,
    postRepo,
    stubs,
  };
}

describe('CreatorModerationService', () => {
  // ── Create / update profile ──────────────────────────────────────────
  it('creates a creator profile', async () => {
    const { svc } = makeSvc();
    const dto = await svc.createCreatorProfile({
      actorUserId: AUTHOR,
      bio: 'Maker in Bangkok',
      creatorUserId: AUTHOR,
      displayName: 'Author A',
    });

    expect(dto.displayName).toBe('Author A');
    expect(dto.bio).toBe('Maker in Bangkok');
    expect(dto.visibility).toBe('PUBLIC_ACTIVE');
  });

  it('rejects cross-author profile creation', async () => {
    const { svc } = makeSvc();
    await expect(
      svc.createCreatorProfile({
        actorUserId: OTHER,
        bio: 'spoof',
        creatorUserId: AUTHOR,
        displayName: 'Spoof',
      }),
    ).rejects.toThrow(/AUTHORIZATION_DENIED|Only the creator/);
  });

  // ── Suspend / unhide ─────────────────────────────────────────────────
  it('suspends a creator with reason and duration', async () => {
    const { svc } = makeSvc({ withNotification: true });
    const created = await svc.createCreatorProfile({
      actorUserId: AUTHOR,
      bio: '',
      creatorUserId: AUTHOR,
      displayName: 'A',
    });

    const suspended = await svc.suspendCreator({
      actorModeratorId: OTHER,
      expectedVersion: created.version,
      profileId: created.id,
      reason: 'spam',
      suspendedUntil: '2027-01-01T00:00:00Z',
    });

    expect(suspended.visibility).toBe('SUSPENDED');
    expect(suspended.suspendedReason).toBe('spam');
  });

  it('preserves evidence in notification payload on suspension', async () => {
    let received: any = null;
    const creatorRepo = createInMemoryCreatorProfileRepository();
    const postRepo = createInMemoryContentPostRepository();
    const stubs = makeStubs();
    const svc = createCreatorModerationService({
      contentPostRepository: postRepo,
      creatorProfileRepository: creatorRepo,
      moderationCaseRepository: stubs.caseRepo,
      reportRepository: {} as any,
      notificationPort: {
        async notifyUser(_userId: Uuidv7, payload: any) {
          received = payload;
        },
      },
    });

    const created = await svc.createCreatorProfile({
      actorUserId: AUTHOR,
      bio: '',
      creatorUserId: AUTHOR,
      displayName: 'A',
    });

    await svc.suspendCreator({
      actorModeratorId: OTHER,
      expectedVersion: created.version,
      profileId: created.id,
      reason: 'TOS violation',
    });

    expect(received).toBeTruthy();
    expect(received.subject).toBe('Account suspended');
    expect(received.reason).toBe('TOS violation');
  });

  it('unhides a suspended creator and clears suspension metadata', async () => {
    const { svc } = makeSvc();
    const created = await svc.createCreatorProfile({
      actorUserId: AUTHOR,
      bio: '',
      creatorUserId: AUTHOR,
      displayName: 'A',
    });

    const suspended = await svc.suspendCreator({
      actorModeratorId: OTHER,
      expectedVersion: created.version,
      profileId: created.id,
      reason: 'spam',
    });

    const unhide = await svc.unhideCreator(suspended.version, suspended.id);

    expect(unhide.visibility).toBe('PUBLIC_ACTIVE');
    expect(unhide.suspendedReason).toBeNull();
  });

  // ── Public/private boundary ───────────────────────────────────────────
  it('public profile omits contact/KYC fields', async () => {
    const { svc } = makeSvc();
    await svc.createCreatorProfile({
      actorUserId: AUTHOR,
      bio: 'Hi',
      creatorUserId: AUTHOR,
      displayName: 'A',
    });
    const pub = await svc.findPublicProfile(AUTHOR, null);
    expect(pub).toBeTruthy();
    expect(pub).not.toHaveProperty('email');
    expect(pub).not.toHaveProperty('phoneE164');
    expect(pub).not.toHaveProperty('kyc');
  });

  it('public profile returns null for suspended creator', async () => {
    const { svc } = makeSvc();
    const created = await svc.createCreatorProfile({
      actorUserId: AUTHOR,
      bio: '',
      creatorUserId: AUTHOR,
      displayName: 'A',
    });

    await svc.suspendCreator({
      actorModeratorId: OTHER,
      expectedVersion: created.version,
      profileId: created.id,
      reason: 'spam',
    });

    const pub = await svc.findPublicProfile(AUTHOR, null);
    expect(pub).toBeNull();
  });

  it('rejects non-owner from viewing private profile fields', async () => {
    const { svc } = makeSvc();
    await svc.createCreatorProfile({
      actorUserId: AUTHOR,
      bio: 'secret',
      creatorUserId: AUTHOR,
      displayName: 'A',
    });

    await expect(svc.getPrivateProfile(AUTHOR, OTHER)).rejects.toThrow(
      /AUTHORIZATION_DENIED|Only the creator/,
    );
  });

  // ── Reports ─────────────────────────────────────────────────────────
  it('files a report and returns a DTO', async () => {
    const { svc } = makeSvc();
    const r = await svc.fileReport({
      actorUserId: AUTHOR,
      description: 'spam',
      reason: 'SPAM',
      reporterUserId: AUTHOR,
      targetId: POST_ID,
      targetType: 'POST',
    });
    expect(r.reason).toBe('SPAM');
    expect(r.status).toBe('PENDING');
  });
});
