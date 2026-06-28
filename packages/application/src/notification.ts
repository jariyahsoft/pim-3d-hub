import type {
  NotificationCategory,
  NotificationChannel,
  NotificationEndpointRecord,
  NotificationEndpointRepository,
  NotificationPreferenceRecord,
  NotificationPreferenceRepository,
  NotificationRecord,
  NotificationRepository,
  RateLimitRepository,
  UtcTimestamp,
  Uuidv7,
} from '@pim/domain'
import { InvalidRequestError, AuthorizationDeniedError } from './errors.js'

export type NotificationService = ReturnType<typeof createNotificationService>

export type NotificationPort = Readonly<{
  send(input: {
    channel: NotificationChannel
    endpoint: string
    metadata: Record<string, unknown>
    templateData: Record<string, unknown>
    templateKey: string
  }): Promise<{ success: boolean; reason?: string }>
}>

export type NotificationDto = Readonly<{
  category: NotificationCategory
  channel: NotificationChannel
  createdAt: UtcTimestamp
  eventId: string
  id: Uuidv7
  priority: string
  recipientUserId: Uuidv7
  sentAt: UtcTimestamp | null
  status: string
  templateKey: string
}>

const MANDATORY_CATEGORIES: readonly NotificationCategory[] = ['SECURITY', 'TRANSACTION']

const RATE_LIMITS: Record<string, { count: number; windowMinutes: number }> = {
  'chat:send': { count: 100, windowMinutes: 60 },
  'comment:create': { count: 50, windowMinutes: 60 },
  'proposal:submit': { count: 20, windowMinutes: 60 },
  'notification:trigger': { count: 200, windowMinutes: 60 },
}

export function createNotificationService(deps: {
  notificationEndpointRepository: NotificationEndpointRepository
  notificationPreferenceRepository: NotificationPreferenceRepository
  notificationRepository: NotificationRepository
  now: () => Date
  rateLimitRepository: RateLimitRepository
}) {
  const {
    notificationEndpointRepository,
    notificationPreferenceRepository,
    notificationRepository,
    now,
    rateLimitRepository,
  } = deps

  async function checkRateLimit(userId: Uuidv7, action: string): Promise<boolean> {
    const limit = RATE_LIMITS[action]
    if (!limit) {
      return true // No limit defined for this action
    }

    const windowStart = new Date(now())
    windowStart.setMinutes(windowStart.getMinutes() - limit.windowMinutes)
    const windowStartUtc = windowStart.toISOString() as UtcTimestamp

    const existing = await rateLimitRepository.findByUserAndAction(userId, action)

    if (!existing) {
      // Create new rate limit record
      const expiresAt = new Date(now())
      expiresAt.setMinutes(expiresAt.getMinutes() + limit.windowMinutes)

      await rateLimitRepository.create({
        action,
        count: 1,
        expiresAt: expiresAt.toISOString() as UtcTimestamp,
        userId,
        windowStartAt: now().toISOString() as UtcTimestamp,
      })
      return true
    }

    // Check if window has expired
    if (new Date(existing.windowStartAt) < new Date(windowStartUtc)) {
      // Reset window
      const expiresAt = new Date(now())
      expiresAt.setMinutes(expiresAt.getMinutes() + limit.windowMinutes)

      await rateLimitRepository.create({
        action,
        count: 1,
        expiresAt: expiresAt.toISOString() as UtcTimestamp,
        userId,
        windowStartAt: now().toISOString() as UtcTimestamp,
      })
      return true
    }

    // Check if over limit
    if (existing.count >= limit.count) {
      return false
    }

    // Increment count
    await rateLimitRepository.increment(existing.id, existing.version)
    return true
  }

  async function sendNotification(
    eventId: string,
    input: Readonly<{
      category: NotificationCategory
      recipientUserId: Uuidv7
      templateData: Record<string, unknown>
      templateKey: string
    }>,
    notificationPort: NotificationPort,
  ): Promise<{ sent: readonly NotificationDto[]; skipped: readonly NotificationChannel[] }> {
    // Check for duplicate event (idempotency)
    const channels: NotificationChannel[] = ['IN_APP', 'EMAIL', 'PUSH']
    const sent: NotificationDto[] = []
    const skipped: NotificationChannel[] = []

    // Determine if this is a mandatory notification
    const isMandatory = MANDATORY_CATEGORIES.includes(input.category)

    // Get user preferences
    const preference = await notificationPreferenceRepository.findByUserAndCategory(
      input.recipientUserId,
      input.category,
    )

    // Sanitize template data to remove sensitive fields
    const sanitizedData = sanitizeTemplateData(input.templateData)

    for (const channel of channels) {
      // Check for duplicate
      const existing = await notificationRepository.findByEventIdAndChannel(eventId, channel)
      if (existing) {
        skipped.push(channel)
        continue
      }

      // Check user preference (skip if optional and disabled)
      if (!isMandatory && preference) {
        const channelEnabled = getChannelPreference(preference, channel)
        if (!channelEnabled) {
          // Create SKIPPED record
          await notificationRepository.create({
            category: input.category,
            channel,
            eventId,
            recipientUserId: input.recipientUserId,
            status: 'SKIPPED',
            templateData: sanitizedData,
            templateKey: input.templateKey,
          })
          skipped.push(channel)
          continue
        }
      }

      // Get endpoint for channel
      const endpoint = await notificationEndpointRepository.findByUserAndChannel(
        input.recipientUserId,
        channel,
      )

      if (!endpoint || endpoint.status !== 'ACTIVE') {
        // Skip if no active endpoint
        await notificationRepository.create({
          category: input.category,
          channel,
          eventId,
          recipientUserId: input.recipientUserId,
          status: 'SKIPPED',
          templateData: sanitizedData,
          templateKey: input.templateKey,
        })
        skipped.push(channel)
        continue
      }

      // Check expiry
      if (endpoint.expiresAt && new Date(endpoint.expiresAt) <= now()) {
        // Mark endpoint as expired
        await notificationEndpointRepository.update(endpoint.id, endpoint.version, {
          status: 'EXPIRED',
        })
        await notificationRepository.create({
          category: input.category,
          channel,
          eventId,
          recipientUserId: input.recipientUserId,
          status: 'SKIPPED',
          templateData: sanitizedData,
          templateKey: input.templateKey,
        })
        skipped.push(channel)
        continue
      }

      // Create PENDING notification
      const notification = await notificationRepository.create({
        category: input.category,
        channel,
        eventId,
        priority: 'NORMAL',
        recipientUserId: input.recipientUserId,
        status: 'PENDING',
        templateData: sanitizedData,
        templateKey: input.templateKey,
      })

      // Attempt to send
      try {
        const result = await notificationPort.send({
          channel,
          endpoint: endpoint.endpoint,
          metadata: endpoint.metadata,
          templateData: sanitizedData,
          templateKey: input.templateKey,
        })

        if (result.success) {
          const updated = await notificationRepository.update(notification.id, notification.version, {
            sentAt: now().toISOString() as UtcTimestamp,
            status: 'SENT',
          })
          sent.push(toNotificationDto(updated))
        } else {
          await notificationRepository.update(notification.id, notification.version, {
            failureReason: result.reason ?? 'Unknown error',
            status: 'FAILED',
          })
          skipped.push(channel)
        }
      } catch (error) {
        await notificationRepository.update(notification.id, notification.version, {
          failureReason: error instanceof Error ? error.message : 'Unknown error',
          status: 'FAILED',
        })
        skipped.push(channel)
      }
    }

    return { sent, skipped }
  }

  async function registerEndpoint(
    userId: Uuidv7,
    input: Readonly<{
      channel: NotificationChannel
      endpoint: string
      expiresAt?: UtcTimestamp
      metadata?: Record<string, unknown>
    }>,
  ): Promise<void> {
    const existing = await notificationEndpointRepository.findByUserAndChannel(userId, input.channel)

    if (existing) {
      // Update existing endpoint
      await notificationEndpointRepository.update(existing.id, existing.version, {
        endpoint: input.endpoint,
        expiresAt: input.expiresAt ?? null,
        metadata: input.metadata ?? {},
        status: 'ACTIVE',
      })
    } else {
      // Create new endpoint
      await notificationEndpointRepository.create({
        channel: input.channel,
        endpoint: input.endpoint,
        expiresAt: input.expiresAt,
        metadata: input.metadata ?? {},
        status: 'ACTIVE',
        userId,
      })
    }
  }

  async function revokeEndpoint(userId: Uuidv7, channel: NotificationChannel): Promise<void> {
    const endpoint = await notificationEndpointRepository.findByUserAndChannel(userId, channel)

    if (!endpoint) {
      throw new InvalidRequestError('Endpoint not found')
    }

    await notificationEndpointRepository.update(endpoint.id, endpoint.version, {
      status: 'REVOKED',
    })
  }

  async function updatePreferences(
    userId: Uuidv7,
    category: NotificationCategory,
    preferences: Readonly<{
      email?: boolean
      inApp?: boolean
      line?: boolean
      push?: boolean
    }>,
  ): Promise<void> {
    // Cannot disable mandatory categories
    if (MANDATORY_CATEGORIES.includes(category)) {
      throw new InvalidRequestError('Cannot disable mandatory notification categories')
    }

    const existing = await notificationPreferenceRepository.findByUserAndCategory(userId, category)

    if (existing) {
      await notificationPreferenceRepository.update(existing.id, existing.version, {
        channelEmail: preferences.email ?? existing.channelEmail,
        channelInApp: preferences.inApp ?? existing.channelInApp,
        channelLine: preferences.line ?? existing.channelLine,
        channelPush: preferences.push ?? existing.channelPush,
      })
    } else {
      await notificationPreferenceRepository.create({
        category,
        channelEmail: preferences.email ?? true,
        channelInApp: preferences.inApp ?? true,
        channelLine: preferences.line ?? false,
        channelPush: preferences.push ?? true,
        userId,
      })
    }
  }

  return {
    checkRateLimit,
    registerEndpoint,
    revokeEndpoint,
    sendNotification,
    updatePreferences,
  }
}

function sanitizeTemplateData(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(data)) {
    // Remove sensitive keys
    if (
      key.toLowerCase().includes('password') ||
      key.toLowerCase().includes('token') ||
      key.toLowerCase().includes('secret') ||
      key.toLowerCase().includes('apikey') ||
      key.toLowerCase().includes('credential')
    ) {
      sanitized[key] = '[REDACTED]'
      continue
    }

    // Remove PII if marked
    if (key.toLowerCase().includes('ssn') || key.toLowerCase().includes('taxid')) {
      sanitized[key] = '[REDACTED]'
      continue
    }

    sanitized[key] = value
  }

  return sanitized
}

function getChannelPreference(
  preference: NotificationPreferenceRecord,
  channel: NotificationChannel,
): boolean {
  switch (channel) {
    case 'EMAIL':
      return preference.channelEmail
    case 'IN_APP':
      return preference.channelInApp
    case 'PUSH':
      return preference.channelPush
    case 'LINE':
      return preference.channelLine
    default:
      return false
  }
}

function toNotificationDto(record: NotificationRecord): NotificationDto {
  return {
    category: record.category,
    channel: record.channel,
    createdAt: record.createdAt,
    eventId: record.eventId,
    id: record.id,
    priority: record.priority,
    recipientUserId: record.recipientUserId,
    sentAt: record.sentAt,
    status: record.status,
    templateKey: record.templateKey,
  }
}
