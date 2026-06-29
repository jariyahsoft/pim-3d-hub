// ── Demo data ─────────────────────────────────────────────────────────────

export type DemoReaction = Readonly<{
  kind: 'LIKE' | 'WOW' | 'HELPFUL';
  reacted: boolean;
  total: number;
}>;

export type DemoVerification = Readonly<{
  buyerId: string;
  eligible: boolean;
  orderId: string;
  reason: string;
}>;

export type DemoShowcaseConsent = Readonly<{
  consentId: string;
  customerId: string;
  orderId: string;
  providerId: string;
  scopes: readonly string[];
  status: 'GRANTED' | 'WITHDRAWN';
  withdrawalAction:
    | 'HIDE_CONTENT'
    | 'REMOVE_CONTENT'
    | 'KEEP_VISIBLE_UNTIL_REMOVAL';
}>;

// DEMO: reactions on a post
export const demoReactions: readonly DemoReaction[] = Object.freeze([
  Object.freeze({ kind: 'LIKE', reacted: true, total: 12 }),
  Object.freeze({ kind: 'WOW', reacted: false, total: 4 }),
  Object.freeze({ kind: 'HELPFUL', reacted: true, total: 8 }),
]);

// DEMO: verified purchase status
export const demoVerifiedPurchase: DemoVerification = Object.freeze({
  buyerId: '00000000-0000-7000-0000-000000000001',
  eligible: true,
  orderId: '00000000-0000-7000-0000-000000000020',
  reason: 'Order completed and customer participated',
});

// DEMO: showcase consent
export const demoShowcaseConsent: DemoShowcaseConsent = Object.freeze({
  consentId: '00000000-0000-7000-0000-000000000030',
  customerId: '00000000-0000-7000-0000-000000000031',
  orderId: '00000000-0000-7000-0000-000000000020',
  providerId: '00000000-0000-7000-0000-000000000032',
  scopes: ['PUBLIC_FEED', 'PROVIDER_PROFILE'],
  status: 'GRANTED',
  withdrawalAction: 'HIDE_CONTENT',
});

export const reactionLabels: Record<string, string> = {
  LIKE: 'ถูกใจ',
  WOW: 'ว้าว',
  HELPFUL: 'มีประโยชน์',
};

export const withdrawalActionLabels: Record<string, string> = {
  HIDE_CONTENT: 'ซ่อนเนื้อหา',
  REMOVE_CONTENT: 'ลบเนื้อหา',
  KEEP_VISIBLE_UNTIL_REMOVAL: 'คงไว้จนกว่าจะลบ',
};
