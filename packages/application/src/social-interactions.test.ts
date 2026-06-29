import { describe, it, expect } from 'vitest';
// eslint-disable-next-line no-restricted-imports
import {
  createInMemoryCommentRepository,
  createInMemoryFollowRepository,
  createInMemoryReactionRepository,
  createInMemorySaveRepository,
} from '@pim/infrastructure';
import {
  createSocialInteractionsService,
  SocialInteractionError,
} from './social-interactions.js';
import type { Uuidv7 } from '@pim/domain';

const USER_A = '00000000-0000-7000-0000-000000000001' as Uuidv7;
const USER_B = '00000000-0000-7000-0000-000000000002' as Uuidv7;
const POST = '00000000-0000-7000-0000-000000000003' as Uuidv7;
const PRODUCT = '00000000-0000-7000-0000-000000000004' as Uuidv7;

function makeSvc() {
  const reactionRepo = createInMemoryReactionRepository();
  const commentRepo = createInMemoryCommentRepository();
  const followRepo = createInMemoryFollowRepository();
  const saveRepo = createInMemorySaveRepository();
  return {
    svc: createSocialInteractionsService({
      commentRepository: commentRepo,
      followRepository: followRepo,
      reactionRepository: reactionRepo,
      saveRepository: saveRepo,
    }),
    commentRepo,
    followRepo,
    reactionRepo,
    saveRepo,
  };
}

describe('SocialInteractionsService', () => {
  // ── Reactions ───────────────────────────────────────────────────────────
  it('toggles a reaction', async () => {
    const { svc } = makeSvc();
    const r = await svc.toggleReaction({
      actorUserId: USER_A,
      idempotencyKey: 'react-1',
      postId: POST,
      reaction: 'LIKE',
      userId: USER_A,
    });
    expect(r.created).toBe(true);
    expect(r.reaction.reaction).toBe('LIKE');
  });

  it('is idempotent on duplicate reaction', async () => {
    const { svc } = makeSvc();
    const cmd = {
      actorUserId: USER_A,
      idempotencyKey: 'react-2',
      postId: POST,
      reaction: 'LIKE' as const,
      userId: USER_A,
    };
    const r1 = await svc.toggleReaction(cmd);
    const r2 = await svc.toggleReaction(cmd);
    expect(r1.created).toBe(true);
    expect(r2.created).toBe(false);
    expect(r1.reaction.id).toBe(r2.reaction.id);
  });

  it('prevents cross-user reaction', async () => {
    const { svc } = makeSvc();
    await expect(
      svc.toggleReaction({
        actorUserId: USER_A,
        idempotencyKey: 'cross',
        postId: POST,
        reaction: 'LIKE',
        userId: USER_B,
      }),
    ).rejects.toThrow(SocialInteractionError);
  });

  // ── Comments ────────────────────────────────────────────────────────────
  it('posts a comment', async () => {
    const { svc } = makeSvc();
    const comment = await svc.postComment({
      actorUserId: USER_A,
      body: 'Nice work',
      postId: POST,
      userId: USER_A,
    });
    expect(comment.body).toBe('Nice work');
    expect(comment.status).toBe('PUBLISHED');
  });

  it('rejects empty comment body', async () => {
    const { svc } = makeSvc();
    await expect(
      svc.postComment({
        actorUserId: USER_A,
        body: '',
        postId: POST,
        userId: USER_A,
      }),
    ).rejects.toThrow(SocialInteractionError);
  });

  it('rejects comment body over 1000 characters', async () => {
    const { svc } = makeSvc();
    await expect(
      svc.postComment({
        actorUserId: USER_A,
        body: 'a'.repeat(1001),
        postId: POST,
        userId: USER_A,
      }),
    ).rejects.toThrow(SocialInteractionError);
  });

  it('prevents cross-user commenting', async () => {
    const { svc } = makeSvc();
    await expect(
      svc.postComment({
        actorUserId: USER_A,
        body: 'spoof',
        postId: POST,
        userId: USER_B,
      }),
    ).rejects.toThrow(SocialInteractionError);
  });

  it('hides a comment', async () => {
    const { svc, commentRepo } = makeSvc();
    const comment = await svc.postComment({
      actorUserId: USER_A,
      body: 'Hide me',
      postId: POST,
      userId: USER_A,
    });

    const hidden = await commentRepo.hide(comment.id, comment.version, 'spam');
    expect(hidden.status).toBe('HIDDEN');
  });

  // ── Follows ─────────────────────────────────────────────────────────────
  it('creates a follow', async () => {
    const { svc } = makeSvc();
    const f = await svc.follow({
      actorUserId: USER_A,
      followeeId: USER_B,
      followerId: USER_A,
      idempotencyKey: 'follow-1',
    });
    expect(f.status).toBe('ACTIVE');
    expect(f.followerId).toBe(USER_A);
  });

  it('rejects self-follow', async () => {
    const { svc } = makeSvc();
    await expect(
      svc.follow({
        actorUserId: USER_A,
        followeeId: USER_A,
        followerId: USER_A,
        idempotencyKey: 'self',
      }),
    ).rejects.toThrow(SocialInteractionError);
  });

  it('is idempotent on duplicate follow', async () => {
    const { svc } = makeSvc();
    const cmd = {
      actorUserId: USER_A,
      followeeId: USER_B,
      followerId: USER_A,
      idempotencyKey: 'follow-2',
    };
    const f1 = await svc.follow(cmd);
    const f2 = await svc.follow(cmd);
    expect(f1.id).toBe(f2.id);
  });

  it('unfollows', async () => {
    const { svc } = makeSvc();
    const f = await svc.follow({
      actorUserId: USER_A,
      followeeId: USER_B,
      followerId: USER_A,
      idempotencyKey: 'follow-3',
    });
    await svc.unfollow({ expectedVersion: f.version, followId: f.id });
  });

  // ── Saves ───────────────────────────────────────────────────────────────
  it('saves an item', async () => {
    const { svc } = makeSvc();
    const saved = await svc.save({
      actorUserId: USER_A,
      collectionId: null,
      contentType: 'POST',
      contentId: POST,
      idempotencyKey: 'save-1',
      userId: USER_A,
    });
    expect(saved.contentType).toBe('POST');
  });

  it('is idempotent on duplicate save', async () => {
    const { svc } = makeSvc();
    const cmd = {
      actorUserId: USER_A,
      collectionId: null,
      contentType: 'PRODUCT' as const,
      contentId: PRODUCT,
      idempotencyKey: 'save-2',
      userId: USER_A,
    };
    const s1 = await svc.save(cmd);
    const s2 = await svc.save(cmd);
    expect(s1.id).toBe(s2.id);
  });
});
