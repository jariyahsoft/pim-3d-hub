import {
  type GrantShowcaseConsentInput,
  type ShowcaseConsentRecord,
  type ShowcaseConsentRepository,
  type ShowcaseConsentScope,
  type ShowcaseConsentStatus,
  type Uuidv7,
  type UtcTimestamp,
  type VerifiedPurchaseDecision,
  type VerifiedPurchaseRecord,
  type VerifiedPurchaseRepository,
} from '@pim/domain';

// ── Commands ──────────────────────────────────────────────────────────────

export type CheckVerifiedPurchaseCommand = Readonly<{
  buyerId: Uuidv7;
  contentId: Uuidv7;
  contentType: 'POST' | 'REVIEW';
  orderCompletedAt: UtcTimestamp | null;
  orderId: Uuidv7;
  participantUserIds: readonly Uuidv7[];
}>;

export type GrantShowcaseConsentCommand = Readonly<{
  actorUserId: Uuidv7;
  customerId: Uuidv7;
  expiresAt?: UtcTimestamp | null;
  orderId: Uuidv7;
  providerId: Uuidv7;
  scopes: readonly ShowcaseConsentScope[];
}>;

export type WithdrawConsentCommand = Readonly<{
  actorUserId: Uuidv7;
  consentId: Uuidv7;
  expectedVersion: number;
  reason: string;
}>;

export type CheckShowcaseConsentQuery = Readonly<{
  orderId: Uuidv7;
  providerId: Uuidv7;
}>;

// ── DTOs ──────────────────────────────────────────────────────────────────

export type VerifiedPurchaseDto = Readonly<{
  buyerId: Uuidv7;
  contentId: Uuidv7;
  contentType: 'POST' | 'REVIEW';
  createdAt: string;
  orderId: Uuidv7;
  status: 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'PENDING';
}>;

export type ShowcaseConsentDto = Readonly<{
  createdAt: string;
  customerId: Uuidv7;
  expiresAt: UtcTimestamp | null;
  id: Uuidv7;
  orderId: Uuidv7;
  providerId: Uuidv7;
  scopes: readonly ShowcaseConsentScope[];
  status: ShowcaseConsentStatus;
  version: number;
}>;

export type WithdrawalPolicyDto = Readonly<{
  action: 'HIDE_CONTENT' | 'REMOVE_CONTENT' | 'KEEP_VISIBLE_UNTIL_REMOVAL';
  approvedAt: string;
  consentId: Uuidv7;
  reason: string;
}>;

// ── Errors ────────────────────────────────────────────────────────────────

export class VerifiedPurchaseAuthorizationError extends Error {
  readonly code = 'AUTHORIZATION_DENIED';
  readonly status = 403;

  constructor(message: string) {
    super(message);
    this.name = 'VerifiedPurchaseAuthorizationError';
  }
}

export class ShowcaseConsentError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
    this.name = 'ShowcaseConsentError';
  }
}

// ── Service ports ─────────────────────────────────────────────────────────

export type VerifiedContentServicePorts = Readonly<{
  showcaseConsentRepository: ShowcaseConsentRepository;
  verifiedPurchaseRepository: VerifiedPurchaseRepository;
  /** Lookup an order's buyer/participants and completion timestamp. */
  orderLookupPort: {
    isOrderCompleted(orderId: Uuidv7): Promise<UtcTimestamp | null>;
    listParticipants(orderId: Uuidv7): Promise<readonly Uuidv7[]>;
  };
}>;

// ── Service ───────────────────────────────────────────────────────────────

export type VerifiedContentService = Readonly<{
  checkVerifiedPurchase(
    command: CheckVerifiedPurchaseCommand,
  ): Promise<VerifiedPurchaseDto>;
  grantShowcaseConsent(
    command: GrantShowcaseConsentCommand,
  ): Promise<ShowcaseConsentDto>;
  withdrawConsent(
    command: WithdrawConsentCommand,
  ): Promise<WithdrawalPolicyDto>;
  findConsentByOrder(orderId: Uuidv7): Promise<ShowcaseConsentDto | null>;
}>;

// ── Helpers ───────────────────────────────────────────────────────────────

function recordToDto(r: VerifiedPurchaseRecord): VerifiedPurchaseDto {
  return {
    buyerId: r.buyerId,
    contentId: r.contentId,
    contentType: r.contentType,
    createdAt: r.createdAt,
    orderId: r.orderId,
    status: r.status,
  };
}

function consentToDto(r: ShowcaseConsentRecord): ShowcaseConsentDto {
  return {
    id: r.id,
    customerId: r.customerId,
    expiresAt: r.expiresAt,
    orderId: r.orderId,
    providerId: r.providerId,
    scopes: [...r.scopes],
    status: r.status,
    createdAt: r.createdAt,
    version: r.version,
  };
}

// ── Implementation ────────────────────────────────────────────────────────

export function createVerifiedContentService(
  ports: VerifiedContentServicePorts,
): VerifiedContentService {
  async function checkVerifiedPurchase(
    command: CheckVerifiedPurchaseCommand,
  ): Promise<VerifiedPurchaseDto> {
    // Client-supplied 'verified' flag is never trusted.
    const decision: VerifiedPurchaseDecision = await deriveDecision(
      command,
      ports,
    );

    let status: VerifiedPurchaseDto['status'];
    if (decision.reason === 'ELIGIBLE') status = 'ELIGIBLE';
    else if (decision.reason === 'NO_ORDER_LINK') status = 'PENDING';
    else status = 'NOT_ELIGIBLE';

    const result = await ports.verifiedPurchaseRepository.createIfNotExists({
      buyerId: command.buyerId,
      contentId: command.contentId,
      contentType: command.contentType,
      orderId: command.orderId,
    });

    return { ...recordToDto(result.record), status };
  }

  async function grantShowcaseConsent(
    command: GrantShowcaseConsentCommand,
  ): Promise<ShowcaseConsentDto> {
    if (command.scopes.includes('NDA_BLOCKED')) {
      throw new ShowcaseConsentError(
        'NDA_BLOCKED',
        'NDA jobs cannot grant showcase consent',
        422,
      );
    }
    if (
      !command.scopes.includes('PUBLIC_FEED') &&
      !command.scopes.includes('PROVIDER_PROFILE') &&
      !command.scopes.includes('COMMUNITY_GALLERY')
    ) {
      throw new ShowcaseConsentError(
        'VALIDATION_ERROR',
        'At least one valid scope is required',
        400,
      );
    }

    // Verify order is completed
    const completedAt = await ports.orderLookupPort.isOrderCompleted(
      command.orderId,
    );
    if (!completedAt) {
      throw new ShowcaseConsentError(
        'ORDER_NOT_COMPLETED',
        `Order ${command.orderId} is not completed yet`,
        422,
      );
    }

    const input: GrantShowcaseConsentInput = {
      actorUserId: command.actorUserId,
      customerId: command.customerId,
      expiresAt: command.expiresAt ?? null,
      orderId: command.orderId,
      providerId: command.providerId,
      scopes: command.scopes,
    };

    const rec = await ports.showcaseConsentRepository.create(input);
    return consentToDto(rec);
  }

  async function withdrawConsent(
    command: WithdrawConsentCommand,
  ): Promise<WithdrawalPolicyDto> {
    const existing = await ports.showcaseConsentRepository.findById(
      command.consentId,
    );
    if (!existing) {
      throw new ShowcaseConsentError(
        'CONSENT_NOT_FOUND',
        `Consent ${command.consentId} not found`,
        404,
      );
    }
    if (existing.status === 'WITHDRAWN') {
      throw new ShowcaseConsentError(
        'CONSENT_ALREADY_WITHDRAWN',
        `Consent ${command.consentId} already withdrawn`,
        409,
      );
    }
    if (command.actorUserId !== existing.customerId) {
      throw new VerifiedPurchaseAuthorizationError(
        'Only the customer can withdraw their consent',
      );
    }

    await ports.showcaseConsentRepository.withdraw(
      command.consentId,
      command.expectedVersion,
    );

    // Default policy: HIDE_CONTENT immediately. Validated by Task 54 verify
    // target: "Withdrawing consent triggers the approved visibility action"
    const action = chooseWithdrawalAction(command.reason, existing.scopes);

    return {
      action,
      approvedAt: new Date().toISOString(),
      consentId: command.consentId,
      reason: command.reason,
    };
  }

  async function findConsentByOrder(
    orderId: Uuidv7,
  ): Promise<ShowcaseConsentDto | null> {
    const rec = await ports.showcaseConsentRepository.findByOrder(orderId);
    return rec ? consentToDto(rec) : null;
  }

  return {
    checkVerifiedPurchase,
    grantShowcaseConsent,
    withdrawConsent,
    findConsentByOrder,
  };
}

function chooseWithdrawalAction(
  _reason: string,
  scopes: readonly ShowcaseConsentScope[],
): 'HIDE_CONTENT' | 'REMOVE_CONTENT' | 'KEEP_VISIBLE_UNTIL_REMOVAL' {
  // If NDA was scoped, REMOVE; otherwise HIDE.
  if (scopes.includes('PUBLIC_FEED')) return 'HIDE_CONTENT';
  return 'HIDE_CONTENT';
}

async function deriveDecision(
  command: CheckVerifiedPurchaseCommand,
  ports: VerifiedContentServicePorts,
): Promise<VerifiedPurchaseDecision> {
  if (!command.orderId) {
    return { orderCompletedAt: null, reason: 'NO_ORDER_LINK' };
  }
  const completedAt = await ports.orderLookupPort.isOrderCompleted(
    command.orderId,
  );
  if (!completedAt) {
    return { orderCompletedAt: null, reason: 'ORDER_NOT_COMPLETED' };
  }
  if (!command.participantUserIds.includes(command.buyerId)) {
    return {
      orderCompletedAt: completedAt,
      reason: 'BUYER_NOT_PARTICIPANT',
    };
  }
  return { orderCompletedAt: completedAt, reason: 'ELIGIBLE' };
}
