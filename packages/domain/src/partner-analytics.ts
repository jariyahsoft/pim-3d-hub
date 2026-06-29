import type {
  CanonicalRecord,
  RepositoryListPage,
  RepositoryListRequest,
} from './repository.js';
import type { UtcTimestamp, Uuidv7 } from './index.js';

// ── Partner API ────────────────────────────────────────────────────────────

export const partnerScopes = [
  'ORDERS_READ',
  'ORDERS_WRITE',
  'CAPACITY_READ',
  'CAPACITY_WRITE',
  'PRODUCTS_READ',
  'PRODUCTS_WRITE',
  'SHIPMENTS_WRITE',
  'EARNINGS_READ',
] as const;
export type PartnerScope = (typeof partnerScopes)[number];

export const partnerAuthStatuses = ['ACTIVE', 'REVOKED', 'EXPIRED'] as const;
export type PartnerAuthStatus = (typeof partnerAuthStatuses)[number];

export type PartnerRecord = Readonly<
  CanonicalRecord & {
    apiVersion: string;
    credentialsExpiresAt: UtcTimestamp;
    description: string;
    name: string;
    organizationScopeId: Uuidv7;
    rateLimitPerMinute: number;
    sandboxMode: boolean;
    scopes: readonly PartnerScope[];
    status: PartnerAuthStatus;
    webhookUrl: string | null;
  }
>;

export type PartnerApiKeyRecord = Readonly<
  CanonicalRecord & {
    apiKeyPrefix: string;
    expiresAt: UtcTimestamp | null;
    hashedKey: string;
    partnerId: Uuidv7;
    revokedAt: UtcTimestamp | null;
  }
>;

export type PartnerRepository = Readonly<{
  create(input: {
    apiVersion: string;
    credentialsExpiresAt: UtcTimestamp;
    description: string;
    name: string;
    organizationScopeId: Uuidv7;
    rateLimitPerMinute?: number;
    sandboxMode?: boolean;
    scopes: readonly PartnerScope[];
    webhookUrl?: string | null;
  }): Promise<PartnerRecord>;
  findById(id: Uuidv7): Promise<PartnerRecord | null>;
  list(
    r: RepositoryListRequest<Record<string, never>, 'createdAt'>,
  ): Promise<RepositoryListPage<PartnerRecord>>;
  update(record: PartnerRecord, v: number): Promise<PartnerRecord>;
  revoke(id: Uuidv7, v: number): Promise<PartnerRecord>;
}>;

export type PartnerApiKeyRepository = Readonly<{
  create(
    partnerId: Uuidv7,
    hashedKey: string,
    apiKeyPrefix: string,
    expiresAt?: UtcTimestamp | null,
  ): Promise<PartnerApiKeyRecord>;
  findByKeyPrefix(prefix: string): Promise<PartnerApiKeyRecord | null>;
  revoke(id: Uuidv7): Promise<void>;
}>;

export class PartnerError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
    this.name = 'PartnerError';
  }
}

// ── Affiliate ──────────────────────────────────────────────────────────────

export type AffiliateReferralRecord = Readonly<
  CanonicalRecord & {
    attributedOrderId: Uuidv7;
    commissionMinor: number;
    commissionRateBps: number;
    currency: string;
    expiresAt: UtcTimestamp;
    policyVersion: number;
    referrerId: Uuidv7;
    referredUserId: Uuidv7;
    selfReferral: boolean;
    status: string;
  }
>;

export type AffiliateRepository = Readonly<{
  create(input: {
    referrerId: Uuidv7;
    referredUserId: Uuidv7;
    attributedOrderId: Uuidv7;
    commissionMinor: number;
    commissionRateBps: number;
    currency: string;
    expiresAt: UtcTimestamp;
    policyVersion: number;
  }): Promise<AffiliateReferralRecord>;
  findById(id: Uuidv7): Promise<AffiliateReferralRecord | null>;
  findByReferrer(
    referrerId: Uuidv7,
  ): Promise<readonly AffiliateReferralRecord[]>;
  findByReferred(
    referredUserId: Uuidv7,
  ): Promise<readonly AffiliateReferralRecord[]>;
  markCommissioned(id: Uuidv7): Promise<void>;
}>;

export class AffiliateSelfReferralError extends PartnerError {
  constructor() {
    super('SELF_REFERRAL', 'Self-referral detected and rejected', 422);
    this.name = 'AffiliateSelfReferralError';
  }
}

export class DuplicateReferralError extends PartnerError {
  constructor() {
    super('DUPLICATE_REFERRAL', 'Duplicate referral rejected', 409);
    this.name = 'DuplicateReferralError';
  }
}

// ── Official Store ──────────────────────────────────────────────────────────

export const officialStoreVerificationStatuses = [
  'REQUESTED',
  'APPROVED',
  'REJECTED',
  'REVOKED',
] as const;
export type OfficialStoreStatus =
  (typeof officialStoreVerificationStatuses)[number];

export type OfficialStoreRecord = Readonly<
  CanonicalRecord & {
    approvedByUserId: Uuidv7 | null;
    providerProfileId: Uuidv7;
    reviewedAt: UtcTimestamp | null;
    status: OfficialStoreStatus;
    verificationNotes: string;
  }
>;

export type OfficialStoreRepository = Readonly<{
  createIfNotExists(
    providerProfileId: Uuidv7,
  ): Promise<{ created: boolean; record: OfficialStoreRecord }>;
  findByProvider(
    providerProfileId: Uuidv7,
  ): Promise<OfficialStoreRecord | null>;
  approve(id: Uuidv7, approvedByUserId: Uuidv7): Promise<OfficialStoreRecord>;
  reject(id: Uuidv7, reason: string): Promise<OfficialStoreRecord>;
  revoke(id: Uuidv7, reason: string): Promise<OfficialStoreRecord>;
}>;

export class OfficialStoreNotApprovedError extends PartnerError {
  constructor(providerId: Uuidv7) {
    super(
      'OFFICIAL_STORE_NOT_APPROVED',
      `Provider ${providerId} is not an Official Store`,
      403,
    );
    this.name = 'OfficialStoreNotApprovedError';
  }
}

// ── Analytics ───────────────────────────────────────────────────────────────

export type AnalyticsReport = Readonly<{
  generatedAt: UtcTimestamp;
  metrics: readonly {
    dimension: string;
    metricLabel: string;
    periodEnd: string;
    periodStart: string;
    value: number;
  }[];
  reportType: 'SELLER' | 'PLATFORM' | 'AFFILIATE';
}>;

export type ExportableReportRequest = Readonly<{
  format: 'JSONL' | 'CSV';
  includePii: boolean;
  periodEnd: string;
  periodStart: string;
  reportType: 'SELLER' | 'PLATFORM' | 'AFFILIATE';
}>;

export function validateReportRequest(req: ExportableReportRequest): void {
  if (req.includePii) {
    throw new PartnerError(
      'PII_EXPORT_DENIED',
      'PII export is not allowed via self-service',
      403,
    );
  }
  if (new Date(req.periodEnd) <= new Date(req.periodStart)) {
    throw new PartnerError(
      'INVALID_DATE_RANGE',
      'periodEnd must be after periodStart',
      400,
    );
  }
}
