import type {
  CanonicalRecord,
  RepositoryListPage,
  RepositoryListRequest,
} from './repository.js'
import type { UtcTimestamp, Uuidv7 } from './index.js'

export const notificationChannels = ['IN_APP', 'EMAIL', 'PUSH', 'LINE'] as const
export const notificationStatuses = ['PENDING', 'SENT', 'FAILED', 'SKIPPED'] as const
export const notificationPriorities = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const
export const notificationCategories = [
  'SECURITY',
  'TRANSACTION',
  'ORDER_UPDATE',
  'MESSAGE',
  'REVIEW',
  'MARKETING',
  'SYSTEM',
] as const
export const endpointStatuses = ['ACTIVE', 'EXPIRED', 'REVOKED'] as const

export type NotificationChannel = (typeof notificationChannels)[number]
export type NotificationStatus = (typeof notificationStatuses)[number]
export type NotificationPriority = (typeof notificationPriorities)[number]
export type NotificationCategory = (typeof notificationCategories)[number]
export type EndpointStatus = (typeof endpointStatuses)[number]
export type NotificationSortField = 'createdAt' | 'updatedAt'

export type NotificationRecord = Readonly<
  CanonicalRecord & {
    category: NotificationCategory
    channel: NotificationChannel
    eventId: string
    failureReason: string | null
    priority: NotificationPriority
    recipientUserId: Uuidv7
    sentAt: UtcTimestamp | null
    status: NotificationStatus
    templateData: Record<string, unknown>
    templateKey: string
  }
>

export type NotificationEndpointRecord = Readonly<
  CanonicalRecord & {
    channel: NotificationChannel
    endpoint: string
    expiresAt: UtcTimestamp | null
    metadata: Record<string, unknown>
    status: EndpointStatus
    userId: Uuidv7
  }
>

export type NotificationPreferenceRecord = Readonly<
  CanonicalRecord & {
    category: NotificationCategory
    channelEmail: boolean
    channelInApp: boolean
    channelLine: boolean
    channelPush: boolean
    userId: Uuidv7
  }
>

export type RateLimitRecord = Readonly<
  CanonicalRecord & {
    action: string
    count: number
    expiresAt: UtcTimestamp
    userId: Uuidv7
    windowStartAt: UtcTimestamp
  }
>

export type CreateNotificationInput = Readonly<{
  category: NotificationCategory
  channel: NotificationChannel
  createdBy?: Uuidv7 | null
  eventId: string
  id?: Uuidv7
  priority?: NotificationPriority
  recipientUserId: Uuidv7
  status?: NotificationStatus
  templateData: Record<string, unknown>
  templateKey: string
  updatedBy?: Uuidv7 | null
}>

export type CreateNotificationEndpointInput = Readonly<{
  channel: NotificationChannel
  createdBy?: Uuidv7 | null
  endpoint: string
  expiresAt?: UtcTimestamp | null
  id?: Uuidv7
  metadata?: Record<string, unknown>
  status?: EndpointStatus
  updatedBy?: Uuidv7 | null
  userId: Uuidv7
}>

export type CreateNotificationPreferenceInput = Readonly<{
  category: NotificationCategory
  channelEmail?: boolean
  channelInApp?: boolean
  channelLine?: boolean
  channelPush?: boolean
  createdBy?: Uuidv7 | null
  id?: Uuidv7
  updatedBy?: Uuidv7 | null
  userId: Uuidv7
}>

export type CreateRateLimitInput = Readonly<{
  action: string
  count?: number
  createdBy?: Uuidv7 | null
  expiresAt: UtcTimestamp
  id?: Uuidv7
  updatedBy?: Uuidv7 | null
  userId: Uuidv7
  windowStartAt?: UtcTimestamp
}>

export type NotificationFilter = Readonly<{
  category?: NotificationCategory
  channel?: NotificationChannel
  eventId?: string
  recipientUserId?: Uuidv7
  status?: NotificationStatus
}>

export type NotificationEndpointFilter = Readonly<{
  channel?: NotificationChannel
  status?: EndpointStatus
  userId?: Uuidv7
}>

export type NotificationPreferenceFilter = Readonly<{
  category?: NotificationCategory
  userId?: Uuidv7
}>

export type RateLimitFilter = Readonly<{
  action?: string
  userId?: Uuidv7
}>

export interface NotificationRepository {
  create(input: CreateNotificationInput): Promise<NotificationRecord>
  findById(id: Uuidv7): Promise<NotificationRecord | null>
  findByEventIdAndChannel(eventId: string, channel: NotificationChannel): Promise<NotificationRecord | null>
  list(
    request: RepositoryListRequest<NotificationFilter, NotificationSortField>,
  ): Promise<RepositoryListPage<NotificationRecord>>
  update(
    id: Uuidv7,
    expectedVersion: number,
    input: Partial<Pick<NotificationRecord, 'failureReason' | 'sentAt' | 'status'>>,
  ): Promise<NotificationRecord>
}

export interface NotificationEndpointRepository {
  create(input: CreateNotificationEndpointInput): Promise<NotificationEndpointRecord>
  findById(id: Uuidv7): Promise<NotificationEndpointRecord | null>
  findByUserAndChannel(userId: Uuidv7, channel: NotificationChannel): Promise<NotificationEndpointRecord | null>
  list(
    request: RepositoryListRequest<NotificationEndpointFilter, 'createdAt'>,
  ): Promise<RepositoryListPage<NotificationEndpointRecord>>
  update(
    id: Uuidv7,
    expectedVersion: number,
    input: Partial<Pick<NotificationEndpointRecord, 'endpoint' | 'expiresAt' | 'metadata' | 'status'>>,
  ): Promise<NotificationEndpointRecord>
}

export interface NotificationPreferenceRepository {
  create(input: CreateNotificationPreferenceInput): Promise<NotificationPreferenceRecord>
  findById(id: Uuidv7): Promise<NotificationPreferenceRecord | null>
  findByUserAndCategory(userId: Uuidv7, category: NotificationCategory): Promise<NotificationPreferenceRecord | null>
  list(
    request: RepositoryListRequest<NotificationPreferenceFilter, 'createdAt'>,
  ): Promise<RepositoryListPage<NotificationPreferenceRecord>>
  update(
    id: Uuidv7,
    expectedVersion: number,
    input: Partial<
      Pick<
        NotificationPreferenceRecord,
        'channelEmail' | 'channelInApp' | 'channelLine' | 'channelPush'
      >
    >,
  ): Promise<NotificationPreferenceRecord>
}

export interface RateLimitRepository {
  create(input: CreateRateLimitInput): Promise<RateLimitRecord>
  findByUserAndAction(userId: Uuidv7, action: string): Promise<RateLimitRecord | null>
  increment(
    id: Uuidv7,
    expectedVersion: number,
  ): Promise<RateLimitRecord>
  deleteExpired(before: UtcTimestamp): Promise<number>
}
