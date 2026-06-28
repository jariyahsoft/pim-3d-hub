import type {
  CanonicalRecord,
  RepositoryListPage,
  RepositoryListRequest,
} from './repository.js'
import type { UtcTimestamp, Uuidv7 } from './index.js'

// Audit log types
export const auditActionTypes = [
  'USER_CREATED',
  'USER_UPDATED',
  'USER_SUSPENDED',
  'ORDER_CREATED',
  'ORDER_TRANSITIONED',
  'ORDER_CANCELLED',
  'PAYMENT_INTENT_CREATED',
  'PAYMENT_SUCCEEDED',
  'REFUND_CREATED',
  'DISPUTE_CREATED',
  'DISPUTE_RESOLVED',
  'MODERATION_ACTION_TAKEN',
  'REPORT_CREATED',
  'ADMIN_ACCESS',
  'PERMISSION_GRANTED',
  'PERMISSION_REVOKED',
  'KYC_REVIEWED',
  'VERIFICATION_CASE_REVIEWED',
] as const

export const auditOutcomes = ['SUCCESS', 'FAILURE', 'PARTIAL'] as const

export type AuditActionType = (typeof auditActionTypes)[number]
export type AuditOutcome = (typeof auditOutcomes)[number]
export type AuditSortField = 'createdAt'

// Audit Log Record (append-only)
export type AuditLogRecord = Readonly<
  CanonicalRecord & {
    actorUserId: Uuidv7 | null
    actorType: 'USER' | 'SYSTEM' | 'ADMIN'
    action: AuditActionType
    resourceType: string
    resourceId: Uuidv7
    outcome: AuditOutcome
    reason: string | null
    requestId: string | null
    traceId: string | null
    ipAddress: string | null
    userAgent: string | null
    changeDiff: Record<string, unknown> | null
    metadata: Record<string, unknown>
  }
>

export type CreateAuditLogInput = Readonly<{
  action: AuditActionType
  actorType?: 'USER' | 'SYSTEM' | 'ADMIN'
  actorUserId?: Uuidv7 | null
  changeDiff?: Record<string, unknown> | null
  createdBy?: Uuidv7 | null
  id?: Uuidv7
  ipAddress?: string | null
  metadata?: Record<string, unknown>
  outcome?: AuditOutcome
  reason?: string | null
  requestId?: string | null
  resourceId: Uuidv7
  resourceType: string
  traceId?: string | null
  userAgent?: string | null
}>

export type AuditLogFilter = Readonly<{
  action?: AuditActionType
  actorUserId?: Uuidv7
  outcome?: AuditOutcome
  resourceId?: Uuidv7
  resourceType?: string
}>

export interface AuditLogRepository {
  create(input: CreateAuditLogInput): Promise<AuditLogRecord>
  findById(id: Uuidv7): Promise<AuditLogRecord | null>
  list(
    request: RepositoryListRequest<AuditLogFilter, AuditSortField>,
  ): Promise<RepositoryListPage<AuditLogRecord>>
  // No update or delete - audit logs are append-only
}

// Staff permission types for data masking
export const staffRoles = ['SUPPORT', 'MODERATOR', 'FINANCE', 'ADMIN', 'SUPERADMIN'] as const
export type StaffRole = (typeof staffRoles)[number]

export type StaffPermissions = Readonly<{
  canViewFullKyc: boolean
  canViewFinanceData: boolean
  canModerateContent: boolean
  canManageUsers: boolean
  canManageOrders: boolean
  canManageDisputes: boolean
  canAccessAuditLog: boolean
  canGrantPermissions: boolean
}>

export const staffPermissionsByRole: Record<StaffRole, StaffPermissions> = {
  SUPPORT: {
    canViewFullKyc: false,
    canViewFinanceData: false,
    canModerateContent: false,
    canManageUsers: false,
    canManageOrders: true,
    canManageDisputes: false,
    canAccessAuditLog: false,
    canGrantPermissions: false,
  },
  MODERATOR: {
    canViewFullKyc: false,
    canViewFinanceData: false,
    canModerateContent: true,
    canManageUsers: false,
    canManageOrders: false,
    canManageDisputes: false,
    canAccessAuditLog: false,
    canGrantPermissions: false,
  },
  FINANCE: {
    canViewFullKyc: true,
    canViewFinanceData: true,
    canModerateContent: false,
    canManageUsers: false,
    canManageOrders: false,
    canManageDisputes: true,
    canAccessAuditLog: false,
    canGrantPermissions: false,
  },
  ADMIN: {
    canViewFullKyc: true,
    canViewFinanceData: true,
    canModerateContent: true,
    canManageUsers: true,
    canManageOrders: true,
    canManageDisputes: true,
    canAccessAuditLog: true,
    canGrantPermissions: false,
  },
  SUPERADMIN: {
    canViewFullKyc: true,
    canViewFinanceData: true,
    canModerateContent: true,
    canManageUsers: true,
    canManageOrders: true,
    canManageDisputes: true,
    canAccessAuditLog: true,
    canGrantPermissions: true,
  },
}

export function getStaffPermissions(role: StaffRole): StaffPermissions {
  return staffPermissionsByRole[role]
}
