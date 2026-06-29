import type { PostDto } from '@pim/application';

export const demoPostDetail: PostDto = Object.freeze({
  id: 'post-detail-1' as any,
  authorId: 'author-1' as any,
  caption:
    'เสร็จเรียบร้อย! เราเพิ่งพิมพ์งาน bracket สำหรับลูกค้าโรงงาน ใช้ PLA สีดำ ความละเอียดมาตรฐาน ใช้เวลา 3 ชั่วโมง ส่งงานในวันพรุ่งนี้',
  createdAt: new Date(Date.now() - 86400000).toISOString(),
  linkedReferences: {
    providerId: 'prov-1' as any,
    orderId: 'order-1' as any,
    productId: null,
    serviceId: 'svc-1' as any,
    showcaseConsentId: 'consent-1' as any,
  },
  media: [
    Object.freeze({
      kind: 'DERIVED_IMAGE',
      assetId: 'asset-1' as any,
      altText: 'Bracket สีดำที่พิมพ์สำเร็จ มุมมองด้านหน้า',
      aspectRatio: '4:3',
      bytes: 102400,
      externalUrl: null,
      height: 600,
      width: 800,
    }),
    Object.freeze({
      kind: 'DERIVED_IMAGE',
      assetId: 'asset-2' as any,
      altText: 'Bracket สีดำด้านหลัง',
      aspectRatio: '4:3',
      bytes: 96000,
      externalUrl: null,
      height: 600,
      width: 800,
    }),
  ],
  publishedAt: new Date(Date.now() - 3600000).toISOString(),
  sourceFileAssetId: null,
  status: 'PUBLISHED',
  type: 'SHOWCASE',
  version: 3,
  visibility: 'PUBLIC',
});

export const demoComments: readonly {
  authorId: string;
  authorName: string;
  body: string;
  commentId: string;
  postedAt: string;
}[] = Object.freeze([
  Object.freeze({
    commentId: 'cmt-1',
    authorId: 'user-2',
    authorName: 'Nattapong P.',
    body: 'งานดีมากครับ พิมพ์ได้เรียบร้อยดี',
    postedAt: new Date(Date.now() - 600_000).toISOString(),
  }),
  Object.freeze({
    commentId: 'cmt-2',
    authorId: 'user-3',
    authorName: 'Waranya K.',
    body: 'ชอบสีดำ สวยค่ะ ส่งงานเร็วมาก',
    postedAt: new Date(Date.now() - 300_000).toISOString(),
  }),
]);

export const emptyComments: readonly never[] = Object.freeze([]);
