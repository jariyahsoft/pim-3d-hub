import type { FeedCard, PostDto, PostMediaReference } from '@pim/application';

// ── Feed Demo Data ────────────────────────────────────────────────────────

export const demoFeedCards: readonly FeedCard[] = Object.freeze([
  Object.freeze({
    postId: 'post-1' as any,
    authorId: 'author-1' as any,
    authorDisplayName: 'Bangkok Print Lab',
    authorBadgeVerified: true,
    captionPreview:
      'เสร็จเรียบร้อย! เราเพิ่งพิมพ์งาน bracket สำหรับลูกค้าโรงงาน ใช้ PLA สีดำ ความละเอียดมาตรฐาน ใช้เวลา 3 ชั่วโมง',
    publishedAt: new Date(Date.now() - 3600000).toISOString(),
    type: 'SHOWCASE',
    hasMedia: true,
    altTextSummary: 'Bracket สีดำมุมมองด้านหน้า',
    reactionsSummary: { LIKE: 24, WOW: 3 },
    commentsCount: 5,
    sponsored: false,
  }),
  Object.freeze({
    postId: 'post-2' as any,
    authorId: 'author-2' as any,
    authorDisplayName: 'Fast Print Studio',
    authorBadgeVerified: true,
    captionPreview:
      'SLA resin collection — โมเดล minifig สีชัดเจน งานละเอียด ส่งงานใน 24 ชั่วโมง',
    publishedAt: new Date(Date.now() - 7200000).toISOString(),
    type: 'SHOWCASE',
    hasMedia: true,
    altTextSummary: 'Minifig resin สีดำ มุมมองหลายด้าน',
    reactionsSummary: { LIKE: 42 },
    commentsCount: 12,
    sponsored: true,
  }),
  Object.freeze({
    postId: 'post-3' as any,
    authorId: 'author-3' as any,
    authorDisplayName: 'Maker Space Bangkok',
    authorBadgeVerified: false,
    captionPreview:
      'สอนการตั้งค่า Cura profile เบื้องต้นสำหรับผู้เริ่มต้น — ใครอยากเรียนรู้เพิ่มเติมคอมเมนต์ไว้ได้เลย',
    publishedAt: new Date(Date.now() - 86400000).toISOString(),
    type: 'TEXT',
    hasMedia: false,
    altTextSummary: '',
    reactionsSummary: { HELPFUL: 18 },
    commentsCount: 7,
    sponsored: false,
  }),
]);

export const emptyFeedCards: readonly FeedCard[] = Object.freeze([]);

// ── Post Demo Data ────────────────────────────────────────────────────────

export const demoPostMedias: readonly PostMediaReference[] = Object.freeze([
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
]);

export const demoPost: PostDto = Object.freeze({
  id: 'post-1' as any,
  authorId: 'author-1' as any,
  caption:
    'เสร็จเรียบร้อย! เราเพิ่งพิมพ์งาน bracket สำหรับลูกค้าโรงงาน ใช้ PLA สีดำ ความละเอียดมาตรฐาน ใช้เวลา 3 ชั่วโมง',
  createdAt: new Date(Date.now() - 86400000).toISOString(),
  linkedReferences: {
    providerId: 'prov-1' as any,
    orderId: 'order-1' as any,
    productId: null,
    serviceId: 'svc-1' as any,
    showcaseConsentId: 'consent-1' as any,
  },
  media: demoPostMedias,
  publishedAt: new Date(Date.now() - 3600000).toISOString(),
  sourceFileAssetId: null,
  status: 'PUBLISHED',
  type: 'SHOWCASE',
  version: 3,
  visibility: 'PUBLIC',
});

export function formatPublishedRelative(publishedAt: string): string {
  const ms = Date.now() - new Date(publishedAt).getTime();
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
  const days = Math.floor(hours / 24);
  return `${days} วันที่แล้ว`;
}
