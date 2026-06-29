import type { Uuidv7 } from '@pim/domain';

export type DemoCreatorProfile = {
  bio: string;
  coverAssetId: Uuidv7 | null;
  creatorUserId: Uuidv7;
  displayName: string;
  isFollowedByViewer: boolean;
  postsCount: number;
  productsCount: number;
  province: string | null;
  ratingAverage: number | null;
  ratingCount: number;
  socialLinks: readonly {
    platform:
      | 'WEBSITE'
      | 'TWITTER'
      | 'INSTAGRAM'
      | 'FACEBOOK'
      | 'LINE'
      | 'TIKTOK'
      | 'YOUTUBE';
    url: string;
  }[];
  suspendedReason: string | null;
  suspendedUntil: string | null;
  visibility: 'PUBLIC_ACTIVE' | 'PUBLIC_HIDDEN' | 'SUSPENDED' | 'REMOVED';
};

export const demoCreatorProfile: DemoCreatorProfile = Object.freeze({
  creatorUserId: '00000000-0000-7000-0000-000000000001' as Uuidv7,
  displayName: 'Bangkok Print Lab',
  bio: 'โรงงานพิมพ์ 3D ขนาดเล็กในกรุงเทพฯ รับงาน PLA/PETG/ABS',
  province: 'กรุงเทพมหานคร',
  avatarAssetId: null,
  coverAssetId: null,
  isFollowedByViewer: false,
  postsCount: 24,
  productsCount: 8,
  ratingAverage: 4.8,
  ratingCount: 124,
  socialLinks: [
    Object.freeze({ platform: 'WEBSITE', url: 'https://example.com' }),
    Object.freeze({ platform: 'INSTAGRAM', url: 'https://instagram.com/x' }),
  ] as const,
  suspendedReason: null,
  suspendedUntil: null,
  visibility: 'PUBLIC_ACTIVE',
});

export const demoSuspendedCreator: DemoCreatorProfile = Object.freeze({
  ...demoCreatorProfile,
  visibility: 'SUSPENDED',
  suspendedReason: 'ละเมิดข้อกำหนดการใช้งาน',
  suspendedUntil: '2026-12-31T23:59:59Z',
});

export const platformLabels: Record<string, string> = {
  WEBSITE: 'เว็บไซต์',
  TWITTER: 'Twitter',
  INSTAGRAM: 'Instagram',
  FACEBOOK: 'Facebook',
  LINE: 'LINE',
  TIKTOK: 'TikTok',
  YOUTUBE: 'YouTube',
};
