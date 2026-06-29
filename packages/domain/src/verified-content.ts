import type {
  CanonicalRecord,
  RepositoryListPage,
  RepositoryListRequest,
} from './repository.js';
import type { UtcTimestamp, Uuidv7 } from './index.js';

// ── Verified Purchase eligibility ────────────────────────────────────────

/**
 * Verified Purchase flag and the originating order. The presence of
 * `verifiedPurchaseOrderId` on a post or review is the canonical guarantee.
 * A client-supplied 'verified' boolean is NEVER trusted.
 */
export const verifiedPurchaseStatuses = [
  'ELIGIBLE',
  'NOT_ELIGIBLE',
  'PENDING',
] as const;
export type VerifiedPurchaseStatus = (typeof verifiedPurchaseStatuses)[number];

export type VerifiedPurchaseRecord = Readonly<
  CanonicalRecord & {
    buyerId: Uuidv7;
    contentId: Uuidv7;
    contentType: 'POST' | 'REVIEW';
    orderId: Uuidv7;
    status: VerifiedPurchaseStatus;
  }
>;

export type CreateVerifiedPurchaseInput = Readonly<{
  actorUserId?: Uuidv7 | null;
  buyerId: Uuidv7;
  contentId: Uuidv7;
  contentType: 'POST' | 'REVIEW';
  orderId: Uuidv7;
}>;

export type VerifiedPurchaseRepository = Readonly<{
  createIfNotExists(
    input: CreateVerifiedPurchaseInput,
  ): Promise<Readonly<{ created: boolean; record: VerifiedPurchaseRecord }>>;
  findByContent(
    contentId: Uuidv7,
    contentType: 'POST' | 'REVIEW',
  ): Promise<VerifiedPurchaseRecord | null>;
  list(
    request: RepositoryListRequest<
      Record<string, never>,
      'createdAt' | 'updatedAt'
    >,
  ): Promise<RepositoryListPage<VerifiedPurchaseRecord>>;
}>;

export type VerifiedPurchaseDecision = Readonly<{
  orderCompletedAt: UtcTimestamp | null;
  reason:
    | 'ELIGIBLE'
    | 'ORDER_NOT_COMPLETED'
    | 'BUYER_NOT_PARTICIPANT'
    | 'NO_ORDER_LINK';
}>;

export class VerifiedPurchaseDeniedError extends Error {
  readonly code = 'VERIFIED_PURCHASE_DENIED';
  readonly status = 403;

  constructor(message: string) {
    super(message);
    this.name = 'VerifiedPurchaseDeniedError';
  }
}

// ── Showcase Consent ────────────────────────────────────────────────────

export const showcaseConsentScopes = [
  'PUBLIC_FEED',
  'PROVIDER_PROFILE',
  'COMMUNITY_GALLERY',
  'NDA_BLOCKED',
  'NONE',
] as const;
export type ShowcaseConsentScope = (typeof showcaseConsentScopes)[number];

export const showcaseConsentStatuses = [
  'GRANTED',
  'WITHDRAWN',
  'EXPIRED',
] as const;
export type ShowcaseConsentStatus = (typeof showcaseConsentStatuses)[number];

export type ShowcaseConsentRecord = Readonly<
  CanonicalRecord & {
    customerId: Uuidv7;
    expiresAt: UtcTimestamp | null;
    orderId: Uuidv7;
    providerId: Uuidv7;
    scopes: readonly ShowcaseConsentScope[];
    status: ShowcaseConsentStatus;
  }
>;

export type GrantShowcaseConsentInput = Readonly<{
  actorUserId: Uuidv7;
  customerId: Uuidv7;
  expiresAt?: UtcTimestamp | null;
  orderId: Uuidv7;
  providerId: Uuidv7;
  scopes: readonly ShowcaseConsentScope[];
}>;

export type WithdrawShowcaseConsentCommand = Readonly<{
  actorUserId: Uuidv7;
  consentId: Uuidv7;
  expectedVersion: number;
  reason: string;
}>;

export const showcaseWithdrawalActions = [
  'HIDE_CONTENT',
  'REMOVE_CONTENT',
  'KEEP_VISIBLE_UNTIL_REMOVAL',
] as const;
export type ShowcaseWithdrawalAction =
  (typeof showcaseWithdrawalActions)[number];

export type WithdrawShowcaseConsentPolicy = Readonly<{
  approvedAction: ShowcaseWithdrawalAction;
  reason: string;
}>;

export type ShowcaseConsentRepository = Readonly<{
  create(input: GrantShowcaseConsentInput): Promise<ShowcaseConsentRecord>;
  findById(
    id: Uuidv7,
    options?: Readonly<{ includeDeleted?: boolean }>,
  ): Promise<ShowcaseConsentRecord | null>;
  findByOrder(orderId: Uuidv7): Promise<ShowcaseConsentRecord | null>;
  list(
    request: RepositoryListRequest<
      Record<string, never>,
      'createdAt' | 'updatedAt'
    >,
  ): Promise<RepositoryListPage<ShowcaseConsentRecord>>;
  withdraw(
    consentId: Uuidv7,
    expectedVersion: number,
  ): Promise<ShowcaseConsentRecord>;
}>;

export class ShowcaseConsentNotFoundError extends Error {
  readonly code = 'RESOURCE_NOT_FOUND';
  readonly status = 404;

  constructor(consentId: Uuidv7) {
    super(`Showcase consent ${consentId} not found`);
    this.name = 'ShowcaseConsentNotFoundError';
  }
}

export class ShowcaseConsentAlreadyWithdrawnError extends Error {
  readonly code = 'CONSENT_ALREADY_WITHDRAWN';
  readonly status = 409;

  constructor(consentId: Uuidv7) {
    super(`Showcase consent ${consentId} already withdrawn`);
    this.name = 'ShowcaseConsentAlreadyWithdrawnError';
  }
}

// ── Errors ──────────────────────────────────────────────────────────────

export class SocialContentNotFoundError extends Error {
  readonly code = 'RESOURCE_NOT_FOUND';
  readonly status = 404;

  constructor(message: string) {
    super(message);
    this.name = 'SocialContentNotFoundError';
  }
}
