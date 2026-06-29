import { describe, it, expect } from 'vitest';
// eslint-disable-next-line no-restricted-imports
import { createInMemoryContentPostRepository } from '@pim/infrastructure';
import {
  createContentPostService,
  PostAuthorMismatchError,
  PostPrivateMediaBlockedError,
  PostStateTransitionError,
} from './content-post.js';
import type { Uuidv7 } from '@pim/domain';

const AUTHOR = '00000000-0000-7000-0000-000000000001' as Uuidv7;
const OTHER = '00000000-0000-7000-0000-000000000002' as Uuidv7;
const FILE_ASSET = '00000000-0000-7000-0000-000000000003' as Uuidv7;
const PROVIDER = '00000000-0000-7000-0000-000000000004' as Uuidv7;
const ORDER = '00000000-0000-7000-0000-000000000005' as Uuidv7;

describe('ContentPostService', () => {
  it('creates a draft post with status DRAFT', async () => {
    const repo = createInMemoryContentPostRepository();
    const svc = createContentPostService({ postRepository: repo });

    const dto = await svc.createDraft({
      actorUserId: AUTHOR,
      authorId: AUTHOR,
      caption: 'Hello world',
      type: 'TEXT',
    });

    expect(dto.status).toBe('DRAFT');
    expect(dto.authorId).toBe(AUTHOR);
    expect(dto.id).toBeTruthy();
  });

  it('rejects creating a post as a different actor', async () => {
    const repo = createInMemoryContentPostRepository();
    const svc = createContentPostService({ postRepository: repo });

    await expect(
      svc.createDraft({
        actorUserId: OTHER,
        authorId: AUTHOR,
        caption: 'Spoofed',
        type: 'TEXT',
      }),
    ).rejects.toThrow(PostAuthorMismatchError);
  });

  it('publishes a draft post', async () => {
    const repo = createInMemoryContentPostRepository();
    const svc = createContentPostService({ postRepository: repo });

    const draft = await svc.createDraft({
      actorUserId: AUTHOR,
      authorId: AUTHOR,
      caption: 'To publish',
      type: 'TEXT',
    });

    const published = await svc.publish({
      actorUserId: AUTHOR,
      expectedVersion: draft.version,
      postId: draft.id,
    });

    expect(published.status).toBe('PUBLISHED');
    expect(published.publishedAt).toBeTruthy();
  });

  it('rejects cross-author publish attempt', async () => {
    const repo = createInMemoryContentPostRepository();
    const svc = createContentPostService({ postRepository: repo });

    const draft = await svc.createDraft({
      actorUserId: AUTHOR,
      authorId: AUTHOR,
      caption: 'My post',
      type: 'TEXT',
    });

    await expect(
      svc.publish({
        actorUserId: OTHER,
        expectedVersion: draft.version,
        postId: draft.id,
      }),
    ).rejects.toThrow(PostAuthorMismatchError);
  });

  it('hides a published post with moderation reason', async () => {
    const repo = createInMemoryContentPostRepository();
    const svc = createContentPostService({ postRepository: repo });

    const draft = await svc.createDraft({
      actorUserId: AUTHOR,
      authorId: AUTHOR,
      caption: 'Sensitive',
      type: 'TEXT',
    });

    const published = await svc.publish({
      actorUserId: AUTHOR,
      expectedVersion: draft.version,
      postId: draft.id,
    });

    const hidden = await svc.hide({
      actorUserId: AUTHOR,
      expectedVersion: published.version,
      moderationReason: 'Reported by user',
      postId: published.id,
    });

    expect(hidden.status).toBe('HIDDEN');
  });

  it('removes a published post', async () => {
    const repo = createInMemoryContentPostRepository();
    const svc = createContentPostService({ postRepository: repo });

    const draft = await svc.createDraft({
      actorUserId: AUTHOR,
      authorId: AUTHOR,
      caption: 'Bad actor',
      type: 'TEXT',
    });

    const published = await svc.publish({
      actorUserId: AUTHOR,
      expectedVersion: draft.version,
      postId: draft.id,
    });

    const removed = await svc.remove({
      actorUserId: AUTHOR,
      expectedVersion: published.version,
      moderationReason: 'ToS violation',
      postId: published.id,
    });

    expect(removed.status).toBe('REMOVED');
  });

  it('republishes a hidden post', async () => {
    const repo = createInMemoryContentPostRepository();
    const svc = createContentPostService({ postRepository: repo });

    const draft = await svc.createDraft({
      actorUserId: AUTHOR,
      authorId: AUTHOR,
      caption: 'Reflip',
      type: 'TEXT',
    });

    const published = await svc.publish({
      actorUserId: AUTHOR,
      expectedVersion: draft.version,
      postId: draft.id,
    });

    const hidden = await svc.hide({
      actorUserId: AUTHOR,
      expectedVersion: published.version,
      moderationReason: 'temporary',
      postId: published.id,
    });

    const republished = await svc.publish({
      actorUserId: AUTHOR,
      expectedVersion: hidden.version,
      postId: hidden.id,
    });

    expect(republished.status).toBe('PUBLISHED');
  });

  it('rejects private model asset as direct media', async () => {
    const repo = createInMemoryContentPostRepository();
    const svc = createContentPostService({ postRepository: repo });

    await expect(
      svc.createDraft({
        actorUserId: AUTHOR,
        authorId: AUTHOR,
        caption: 'Show off',
        media: [
          {
            kind: 'NONE',
            assetId: FILE_ASSET,
            altText: '',
            aspectRatio: null,
            bytes: 1024,
            externalUrl: null,
            height: null,
            width: null,
          },
        ],
        type: 'IMAGE',
      }),
    ).rejects.toThrow(PostPrivateMediaBlockedError);
  });

  it('rejects source file asset with no derived media', async () => {
    const repo = createInMemoryContentPostRepository();
    const svc = createContentPostService({ postRepository: repo });

    await expect(
      svc.createDraft({
        actorUserId: AUTHOR,
        authorId: AUTHOR,
        caption: 'source file only',
        sourceFileAssetId: FILE_ASSET,
        type: 'IMAGE',
      }),
    ).rejects.toThrow(PostPrivateMediaBlockedError);
  });

  it('accepts derived image media', async () => {
    const repo = createInMemoryContentPostRepository();
    const svc = createContentPostService({ postRepository: repo });

    const dto = await svc.createDraft({
      actorUserId: AUTHOR,
      authorId: AUTHOR,
      caption: 'Derived',
      media: [
        {
          kind: 'DERIVED_IMAGE',
          assetId: FILE_ASSET,
          altText: 'A 3D printed bracket',
          aspectRatio: '4:3',
          bytes: 102400,
          externalUrl: null,
          height: 600,
          width: 800,
        },
      ],
      type: 'IMAGE',
    });

    expect(dto.id).toBeTruthy();
    expect(dto.media).toHaveLength(1);
  });

  it('rebuilds feed with published + public posts only', async () => {
    const repo = createInMemoryContentPostRepository();
    const svc = createContentPostService({ postRepository: repo });

    const publishedDraft = await svc.createDraft({
      actorUserId: AUTHOR,
      authorId: AUTHOR,
      caption: 'Pub',
      type: 'TEXT',
    });
    await svc.publish({
      actorUserId: AUTHOR,
      expectedVersion: publishedDraft.version,
      postId: publishedDraft.id,
    });

    const draftOnly = await svc.createDraft({
      actorUserId: AUTHOR,
      authorId: AUTHOR,
      caption: 'Draft only',
      type: 'TEXT',
    });
    expect(draftOnly.status).toBe('DRAFT');
    void draftOnly;

    const hiddenDraft = await svc.createDraft({
      actorUserId: AUTHOR,
      authorId: AUTHOR,
      caption: 'To hide',
      type: 'TEXT',
    });
    const hiddenPublished = await svc.publish({
      actorUserId: AUTHOR,
      expectedVersion: hiddenDraft.version,
      postId: hiddenDraft.id,
    });
    await svc.hide({
      actorUserId: AUTHOR,
      expectedVersion: hiddenPublished.version,
      moderationReason: 'maintenance',
      postId: hiddenPublished.id,
    });

    const feed = await svc.rebuildFeed({
      cursor: null,
      limit: 10,
      now: new Date(Date.now() + 1000).toISOString(),
    });

    expect(feed.cards).toHaveLength(1);
    expect(feed.cards[0].captionPreview).toContain('Pub');
    expect(feed.projectionVersion).toBeGreaterThanOrEqual(1);
  });

  it('feed pagination returns next cursor when more items exist', async () => {
    const repo = createInMemoryContentPostRepository();
    const svc = createContentPostService({ postRepository: repo });

    for (let i = 0; i < 5; i++) {
      const draft = await svc.createDraft({
        actorUserId: AUTHOR,
        authorId: AUTHOR,
        caption: `Post ${i}`,
        type: 'TEXT',
      });
      await svc.publish({
        actorUserId: AUTHOR,
        expectedVersion: draft.version,
        postId: draft.id,
      });
    }

    const page1 = await svc.rebuildFeed({
      cursor: null,
      limit: 3,
      now: new Date(Date.now() + 1000).toISOString(),
    });
    const page2 = await svc.rebuildFeed({
      cursor: page1.nextCursor,
      limit: 3,
      now: new Date(Date.now() + 1000).toISOString(),
    });

    expect(page1.cards).toHaveLength(3);
    expect(page2.cards).toHaveLength(2);
  });

  it('feed projection version matches feedProjectionVersion', async () => {
    const repo = createInMemoryContentPostRepository();
    const svc = createContentPostService({ postRepository: repo });

    const feed = await svc.rebuildFeed({
      cursor: null,
      limit: 10,
      now: new Date().toISOString(),
    });

    expect(feed.projectionVersion).toBe(feedProjectionVersion);
  });

  it('rejects publish on already-removed post', async () => {
    const repo = createInMemoryContentPostRepository();
    const svc = createContentPostService({ postRepository: repo });

    const draft = await svc.createDraft({
      actorUserId: AUTHOR,
      authorId: AUTHOR,
      caption: 'Setup',
      type: 'TEXT',
    });
    const published = await svc.publish({
      actorUserId: AUTHOR,
      expectedVersion: draft.version,
      postId: draft.id,
    });
    const removed = await svc.remove({
      actorUserId: AUTHOR,
      expectedVersion: published.version,
      moderationReason: 'spam',
      postId: published.id,
    });

    await expect(
      svc.publish({
        actorUserId: AUTHOR,
        expectedVersion: removed.version,
        postId: removed.id,
      }),
    ).rejects.toThrow(PostStateTransitionError);
  });

  it('linked references preserve provider / order links', async () => {
    const repo = createInMemoryContentPostRepository();
    const svc = createContentPostService({ postRepository: repo });

    const dto = await svc.createDraft({
      actorUserId: AUTHOR,
      authorId: AUTHOR,
      caption: 'My print',
      linkedReferences: {
        providerId: PROVIDER,
        orderId: ORDER,
      },
      type: 'SHOWCASE',
    });

    expect(dto.linkedReferences.providerId).toBe(PROVIDER);
    expect(dto.linkedReferences.orderId).toBe(ORDER);
  });
});

import { feedProjectionVersion } from '@pim/domain';
