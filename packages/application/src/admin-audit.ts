import type {
  AuditActionType,
  AuditLogRecord,
  AuditLogRepository,
  AuditOutcome,
  StaffPermissions,
  StaffRole,
  UtcTimestamp,
  Uuidv7,
} from '@pim/domain';
import { AuthorizationDeniedError, InvalidRequestError } from './errors.js';

export type AuditLogDto = Readonly<{
  action: AuditActionType;
  actorType: 'USER' | 'SYSTEM' | 'ADMIN';
  actorUserId: Uuidv7 | null;
  changeDiff: Record<string, unknown> | null;
  createdAt: UtcTimestamp;
  id: Uuidv7;
  ipAddress: string | null;
  metadata: Record<string, unknown>;
  outcome: AuditOutcome;
  reason: string | null;
  requestId: string | null;
  resourceId: Uuidv7;
  resourceType: string;
  traceId: string | null;
  userAgent: string | null;
}>;

export function createAdminAuditService(deps: {
  auditLogRepository: AuditLogRepository;
  now: () => Date;
}) {
  const { auditLogRepository } = deps;

  async function createAuditLog(
    actorUserId: Uuidv7 | null,
    input: Readonly<{
      action: AuditActionType;
      actorType?: 'USER' | 'SYSTEM' | 'ADMIN';
      changeDiff?: Record<string, unknown>;
      ipAddress?: string;
      metadata?: Record<string, unknown>;
      outcome?: AuditOutcome;
      reason?: string;
      requestId?: string;
      resourceId: Uuidv7;
      resourceType: string;
      traceId?: string;
      userAgent?: string;
    }>,
  ): Promise<AuditLogDto> {
    // Create audit log (append-only, immutable)
    const auditLog = await auditLogRepository.create({
      action: input.action,
      actorType: input.actorType ?? 'USER',
      actorUserId,
      changeDiff: input.changeDiff ?? null,
      createdBy: actorUserId,
      ipAddress: input.ipAddress ?? null,
      metadata: input.metadata ?? {},
      outcome: input.outcome ?? 'SUCCESS',
      reason: input.reason ?? null,
      requestId: input.requestId ?? null,
      resourceId: input.resourceId,
      resourceType: input.resourceType,
      traceId: input.traceId ?? null,
      userAgent: input.userAgent ?? null,
    });

    return toAuditLogDto(auditLog);
  }

  async function listAuditLogs(
    actorUserId: Uuidv7,
    staffRole: StaffRole,
    filter?: Readonly<{
      action?: AuditActionType;
      actorUserId?: Uuidv7;
      resourceId?: Uuidv7;
      resourceType?: string;
    }>,
  ): Promise<AuditLogDto[]> {
    // Check if actor has permission to access audit logs
    const permissions = getStaffPermissionsForRole(staffRole);
    if (!permissions.canAccessAuditLog) {
      throw new AuthorizationDeniedError(
        'Insufficient permissions to access audit logs',
      );
    }

    const result = await auditLogRepository.list({
      filter: filter ?? {},
      limit: 100,
      sort: { direction: 'desc', field: 'createdAt' },
    });

    return result.items.map(toAuditLogDto);
  }

  async function maskSensitiveData(
    data: Record<string, unknown>,
    staffRole: StaffRole,
    dataType: 'user' | 'order' | 'payment' | 'kyc',
  ): Promise<Record<string, unknown>> {
    const permissions = getStaffPermissionsForRole(staffRole);
    const masked: Record<string, unknown> = { ...data };

    // Mask based on staff role and data type
    if (dataType === 'kyc' && !permissions.canViewFullKyc) {
      // Support cannot see full KYC data
      if ('nationalId' in masked) masked['nationalId'] = '***MASKED***';
      if ('taxId' in masked) masked['taxId'] = '***MASKED***';
      if ('dateOfBirth' in masked) masked['dateOfBirth'] = '***MASKED***';
      if ('address' in masked) masked['address'] = '***MASKED***';
    }

    if (dataType === 'payment' && !permissions.canViewFinanceData) {
      // Non-finance staff cannot see payment details
      if ('bankAccount' in masked) masked['bankAccount'] = '***MASKED***';
      if ('paymentMethod' in masked) masked['paymentMethod'] = '***MASKED***';
      if ('amount' in masked) masked['amount'] = '***MASKED***';
    }

    if (dataType === 'user') {
      // Always mask sensitive user data for non-admins
      if (staffRole === 'SUPPORT' || staffRole === 'MODERATOR') {
        const email = masked['email'];
        if (typeof email === 'string') {
          const parts = email.split('@');
          if (parts.length === 2 && parts[0] && parts[1]) {
            const local = parts[0];
            const domain = parts[1];
            masked['email'] = `${local.substring(0, 2)}***@${domain}`;
          }
        }
        const phone = masked['phone'];
        if (typeof phone === 'string') {
          masked['phone'] = `***${phone.slice(-4)}`;
        }
      }
    }

    return masked;
  }

  async function executeHighRiskAction(
    actorUserId: Uuidv7,
    staffRole: StaffRole,
    action: Readonly<{
      actionType: AuditActionType;
      changeDiff?: Record<string, unknown>;
      reason: string;
      resourceId: Uuidv7;
      resourceType: string;
    }>,
  ): Promise<AuditLogDto> {
    // Validate reason is provided for high-risk actions
    if (!action.reason || action.reason.length < 10) {
      throw new InvalidRequestError(
        'High-risk actions require a detailed reason (minimum 10 characters)',
      );
    }

    if (action.reason.length > 1000) {
      throw new InvalidRequestError('Reason must not exceed 1000 characters');
    }

    // Check permissions based on action type
    const permissions = getStaffPermissionsForRole(staffRole);

    if (action.actionType === 'USER_SUSPENDED' && !permissions.canManageUsers) {
      throw new AuthorizationDeniedError(
        'Insufficient permissions to suspend users',
      );
    }

    if (
      action.actionType === 'ORDER_CANCELLED' &&
      !permissions.canManageOrders
    ) {
      throw new AuthorizationDeniedError(
        'Insufficient permissions to cancel orders',
      );
    }

    if (
      action.actionType === 'DISPUTE_RESOLVED' &&
      !permissions.canManageDisputes
    ) {
      throw new AuthorizationDeniedError(
        'Insufficient permissions to resolve disputes',
      );
    }

    if (
      action.actionType === 'PERMISSION_GRANTED' &&
      !permissions.canGrantPermissions
    ) {
      throw new AuthorizationDeniedError(
        'Insufficient permissions to grant permissions',
      );
    }

    // Create audit log for high-risk action
    const auditLog = await createAuditLog(actorUserId, {
      action: action.actionType,
      actorType: 'ADMIN',
      metadata: {
        staffRole,
        highRisk: true,
      },
      outcome: 'SUCCESS',
      reason: action.reason,
      resourceId: action.resourceId,
      resourceType: action.resourceType,
    });

    return auditLog;
  }

  return {
    createAuditLog,
    executeHighRiskAction,
    listAuditLogs,
    maskSensitiveData,
  };
}

function getStaffPermissionsForRole(role: StaffRole): StaffPermissions {
  const permissionsByRole: Record<StaffRole, StaffPermissions> = {
    SUPPORT: {
      canAccessAuditLog: false,
      canGrantPermissions: false,
      canManageDisputes: false,
      canManageOrders: true,
      canManageUsers: false,
      canModerateContent: false,
      canViewFinanceData: false,
      canViewFullKyc: false,
    },
    MODERATOR: {
      canAccessAuditLog: false,
      canGrantPermissions: false,
      canManageDisputes: false,
      canManageOrders: false,
      canManageUsers: false,
      canModerateContent: true,
      canViewFinanceData: false,
      canViewFullKyc: false,
    },
    FINANCE: {
      canAccessAuditLog: false,
      canGrantPermissions: false,
      canManageDisputes: true,
      canManageOrders: false,
      canManageUsers: false,
      canModerateContent: false,
      canViewFinanceData: true,
      canViewFullKyc: true,
    },
    ADMIN: {
      canAccessAuditLog: true,
      canGrantPermissions: false,
      canManageDisputes: true,
      canManageOrders: true,
      canManageUsers: true,
      canModerateContent: true,
      canViewFinanceData: true,
      canViewFullKyc: true,
    },
    SUPERADMIN: {
      canAccessAuditLog: true,
      canGrantPermissions: true,
      canManageDisputes: true,
      canManageOrders: true,
      canManageUsers: true,
      canModerateContent: true,
      canViewFinanceData: true,
      canViewFullKyc: true,
    },
  };

  return permissionsByRole[role];
}

function toAuditLogDto(record: AuditLogRecord): AuditLogDto {
  return {
    action: record.action,
    actorType: record.actorType,
    actorUserId: record.actorUserId,
    changeDiff: record.changeDiff,
    createdAt: record.createdAt,
    id: record.id,
    ipAddress: record.ipAddress,
    metadata: record.metadata,
    outcome: record.outcome,
    reason: record.reason,
    requestId: record.requestId,
    resourceId: record.resourceId,
    resourceType: record.resourceType,
    traceId: record.traceId,
    userAgent: record.userAgent,
  };
}

export type AdminAuditService = ReturnType<typeof createAdminAuditService>;
