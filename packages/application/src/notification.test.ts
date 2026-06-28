import { describe, it, expect, beforeEach } from 'vitest'
import { createNotificationService } from './notification.js'
import type { NotificationPort } from './notification.js'
import type {
  NotificationRepository,
  NotificationEndpointRepository,
  NotificationPreferenceRepository,
  RateLimitRepository,
  Uuidv7,
  UtcTimestamp,
  NotificationChannel,
  NotificationCategory,
} from '@pim/domain'
import {
  createInMemoryNotificationRepository,
  createInMemoryNotificationEndpointRepository,
  createInMemoryNotificationPreferenceRepository,
  createInMemoryRateLimitRepository,
  createSandboxNotificationAdapter,
} from '../../infrastructure/src/in-memory-notification-repositories.js'
import { createSandboxNotificationAdapter as createAdapter } from '../../infrastructure/src/sandbox-notification-adapter.js'

describe('NotificationService', () => {
  let notificationRepository: NotificationRepository
  let endpointRepository: NotificationEndpointRepository
  let preferenceRepository: NotificationPreferenceRepository
  let rateLimitRepository: RateLimitRepository
  let notificationPort: NotificationPort
  let currentTime: Date
  let idCounter: number

  const generateId = (): Uuidv7 => {
    idCounter++
    return `0193e7a0-0000-7000-8000-${idCounter.toString().padStart(12, '0')}` as Uuidv7
  }

  const now = () => currentTime

  beforeEach(() => {
    currentTime = new Date('2026-06-28T10:00:00.000Z')
    idCounter = 0

    notificationRepository = createInMemoryNotificationRepository({ generateId, now })
    endpointRepository = createInMemoryNotificationEndpointRepository({ generateId, now })
    preferenceRepository = createInMemoryNotificationPreferenceRepository({ generateId, now })
    rateLimitRepository = createInMemoryRateLimitRepository({ generateId, now })
    notificationPort = createAdapter({ now })
  })

  describe('sendNotification', () => {
    it('sends notification to all active channels when no preferences exist', async () => {
      const service = createNotificationService({
        notificationRepository,
        notificationEndpointRepository: endpointRepository,
        notificationPreferenceRepository: preferenceRepository,
        rateLimitRepository,
        now,
      })

      const userId = generateId()

      // Register endpoints
      await service.registerEndpoint(userId, {
        channel: 'IN_APP',
        endpoint: 'user-inbox',
      })
      await service.registerEndpoint(userId, {
        channel: 'EMAIL',
        endpoint: 'user@example.com',
      })
      await service.registerEndpoint(userId, {
        channel: 'PUSH',
        endpoint: 'push-token-123',
      })

      const result = await service.sendNotification(
        'event-001',
        {
          category: 'ORDER_UPDATE',
          recipientUserId: userId,
          templateKey: 'order.status_changed',
          templateData: { orderId: 'ord-123', status: 'SHIPPED' },
        },
        notificationPort,
      )

      expect(result.sent).toHaveLength(3)
      expect(result.skipped).toHaveLength(0)
    })

    it('enforces idempotency - same eventId and channel returns existing', async () => {
      const service = createNotificationService({
        notificationRepository,
        notificationEndpointRepository: endpointRepository,
        notificationPreferenceRepository: preferenceRepository,
        rateLimitRepository,
        now,
      })

      const userId = generateId()

      await service.registerEndpoint(userId, {
        channel: 'EMAIL',
        endpoint: 'user@example.com',
      })

      // First send
      const result1 = await service.sendNotification(
        'event-001',
        {
          category: 'SECURITY',
          recipientUserId: userId,
          templateKey: 'security.password_changed',
          templateData: {},
        },
        notificationPort,
      )

      // Second send with same eventId
      const result2 = await service.sendNotification(
        'event-001',
        {
          category: 'SECURITY',
          recipientUserId: userId,
          templateKey: 'security.password_changed',
          templateData: {},
        },
        notificationPort,
      )

      expect(result1.sent).toHaveLength(1)
      expect(result2.sent).toHaveLength(0)
      // All channels are checked, EMAIL already exists so skipped, IN_APP and PUSH have no endpoint so skipped
      expect(result2.skipped).toHaveLength(3)
    })

    it('respects user preferences for optional categories', async () => {
      const service = createNotificationService({
        notificationRepository,
        notificationEndpointRepository: endpointRepository,
        notificationPreferenceRepository: preferenceRepository,
        rateLimitRepository,
        now,
      })

      const userId = generateId()

      await service.registerEndpoint(userId, {
        channel: 'EMAIL',
        endpoint: 'user@example.com',
      })
      await service.registerEndpoint(userId, {
        channel: 'PUSH',
        endpoint: 'push-token-123',
      })

      // Disable email for MARKETING
      await service.updatePreferences(userId, 'MARKETING', {
        email: false,
        push: true,
      })

      const result = await service.sendNotification(
        'event-002',
        {
          category: 'MARKETING',
          recipientUserId: userId,
          templateKey: 'marketing.promotion',
          templateData: {},
        },
        notificationPort,
      )

      // Should skip EMAIL but send PUSH
      expect(result.sent.some((n) => n.channel === 'PUSH')).toBe(true)
      expect(result.sent.some((n) => n.channel === 'EMAIL')).toBe(false)
      expect(result.skipped).toContain('EMAIL')
    })

    it('always sends mandatory categories regardless of preferences', async () => {
      const service = createNotificationService({
        notificationRepository,
        notificationEndpointRepository: endpointRepository,
        notificationPreferenceRepository: preferenceRepository,
        rateLimitRepository,
        now,
      })

      const userId = generateId()

      await service.registerEndpoint(userId, {
        channel: 'EMAIL',
        endpoint: 'user@example.com',
      })

      // Try to disable SECURITY category (should fail)
      await expect(
        service.updatePreferences(userId, 'SECURITY', {
          email: false,
        }),
      ).rejects.toThrow('Cannot disable mandatory notification categories')

      const result = await service.sendNotification(
        'event-003',
        {
          category: 'SECURITY',
          recipientUserId: userId,
          templateKey: 'security.suspicious_login',
          templateData: {},
        },
        notificationPort,
      )

      expect(result.sent).toHaveLength(1)
      expect(result.sent[0].channel).toBe('EMAIL')
    })

    it('sanitizes sensitive data from template data', async () => {
      const service = createNotificationService({
        notificationRepository,
        notificationEndpointRepository: endpointRepository,
        notificationPreferenceRepository: preferenceRepository,
        rateLimitRepository,
        now,
      })

      const userId = generateId()

      await service.registerEndpoint(userId, {
        channel: 'EMAIL',
        endpoint: 'user@example.com',
      })

      const result = await service.sendNotification(
        'event-004',
        {
          category: 'TRANSACTION',
          recipientUserId: userId,
          templateKey: 'payment.completed',
          templateData: {
            orderId: 'ord-123',
            password: 'secret123',
            apiKey: 'key-xyz',
            token: 'token-abc',
            ssn: '123-45-6789',
            amount: 1000,
          },
        },
        notificationPort,
      )

      const notification = await notificationRepository.findById(result.sent[0].id)
      expect(notification?.templateData.orderId).toBe('ord-123')
      expect(notification?.templateData.amount).toBe(1000)
      expect(notification?.templateData.password).toBe('[REDACTED]')
      expect(notification?.templateData.apiKey).toBe('[REDACTED]')
      expect(notification?.templateData.token).toBe('[REDACTED]')
      expect(notification?.templateData.ssn).toBe('[REDACTED]')
    })

    it('skips notifications when endpoint is expired', async () => {
      const service = createNotificationService({
        notificationRepository,
        notificationEndpointRepository: endpointRepository,
        notificationPreferenceRepository: preferenceRepository,
        rateLimitRepository,
        now,
      })

      const userId = generateId()

      // Register endpoint with past expiry
      await service.registerEndpoint(userId, {
        channel: 'PUSH',
        endpoint: 'expired-token',
        expiresAt: '2026-06-27T10:00:00.000Z' as UtcTimestamp,
      })

      const result = await service.sendNotification(
        'event-005',
        {
          category: 'MESSAGE',
          recipientUserId: userId,
          templateKey: 'message.new',
          templateData: {},
        },
        notificationPort,
      )

      expect(result.sent).toHaveLength(0)
      expect(result.skipped).toContain('PUSH')

      // Check endpoint was marked as expired
      const endpoint = await endpointRepository.findByUserAndChannel(userId, 'PUSH')
      expect(endpoint?.status).toBe('EXPIRED')
    })

    it('handles notification send failure gracefully', async () => {
      const failingPort = createAdapter({
        now,
        simulateFailureForTemplateKey: 'test.fail',
      })

      const service = createNotificationService({
        notificationRepository,
        notificationEndpointRepository: endpointRepository,
        notificationPreferenceRepository: preferenceRepository,
        rateLimitRepository,
        now,
      })

      const userId = generateId()

      await service.registerEndpoint(userId, {
        channel: 'EMAIL',
        endpoint: 'user@example.com',
      })

      const result = await service.sendNotification(
        'event-006',
        {
          category: 'SYSTEM',
          recipientUserId: userId,
          templateKey: 'test.fail',
          templateData: {},
        },
        failingPort,
      )

      expect(result.sent).toHaveLength(0)
      expect(result.skipped).toContain('EMAIL')

      // Check notification was marked as failed - find the EMAIL one
      const notifications = await notificationRepository.list({
        filter: { eventId: 'event-006', channel: 'EMAIL' },
      })
      expect(notifications.items[0].status).toBe('FAILED')
      expect(notifications.items[0].failureReason).toBe('Simulated failure')
    })
  })

  describe('registerEndpoint', () => {
    it('creates new endpoint for user and channel', async () => {
      const service = createNotificationService({
        notificationRepository,
        notificationEndpointRepository: endpointRepository,
        notificationPreferenceRepository: preferenceRepository,
        rateLimitRepository,
        now,
      })

      const userId = generateId()

      await service.registerEndpoint(userId, {
        channel: 'PUSH',
        endpoint: 'push-token-abc',
        expiresAt: '2026-12-31T23:59:59.000Z' as UtcTimestamp,
        metadata: { deviceId: 'device-123' },
      })

      const endpoint = await endpointRepository.findByUserAndChannel(userId, 'PUSH')
      expect(endpoint).not.toBeNull()
      expect(endpoint?.endpoint).toBe('push-token-abc')
      expect(endpoint?.status).toBe('ACTIVE')
      expect(endpoint?.metadata).toEqual({ deviceId: 'device-123' })
    })

    it('updates existing endpoint when registering for same user and channel', async () => {
      const service = createNotificationService({
        notificationRepository,
        notificationEndpointRepository: endpointRepository,
        notificationPreferenceRepository: preferenceRepository,
        rateLimitRepository,
        now,
      })

      const userId = generateId()

      // First registration
      await service.registerEndpoint(userId, {
        channel: 'PUSH',
        endpoint: 'old-token',
      })

      const endpoint1 = await endpointRepository.findByUserAndChannel(userId, 'PUSH')
      expect(endpoint1?.endpoint).toBe('old-token')

      // Second registration (token refresh)
      await service.registerEndpoint(userId, {
        channel: 'PUSH',
        endpoint: 'new-token',
        expiresAt: '2027-01-01T00:00:00.000Z' as UtcTimestamp,
      })

      const endpoint2 = await endpointRepository.findByUserAndChannel(userId, 'PUSH')
      expect(endpoint2?.endpoint).toBe('new-token')
      expect(endpoint2?.expiresAt).toBe('2027-01-01T00:00:00.000Z')
      expect(endpoint2?.status).toBe('ACTIVE')
    })
  })

  describe('revokeEndpoint', () => {
    it('marks endpoint as revoked', async () => {
      const service = createNotificationService({
        notificationRepository,
        notificationEndpointRepository: endpointRepository,
        notificationPreferenceRepository: preferenceRepository,
        rateLimitRepository,
        now,
      })

      const userId = generateId()

      await service.registerEndpoint(userId, {
        channel: 'PUSH',
        endpoint: 'push-token-abc',
      })

      await service.revokeEndpoint(userId, 'PUSH')

      const endpoint = await endpointRepository.findByUserAndChannel(userId, 'PUSH')
      expect(endpoint?.status).toBe('REVOKED')
    })

    it('throws error when endpoint does not exist', async () => {
      const service = createNotificationService({
        notificationRepository,
        notificationEndpointRepository: endpointRepository,
        notificationPreferenceRepository: preferenceRepository,
        rateLimitRepository,
        now,
      })

      const userId = generateId()

      await expect(service.revokeEndpoint(userId, 'EMAIL')).rejects.toThrow('Endpoint not found')
    })
  })

  describe('updatePreferences', () => {
    it('creates new preferences when none exist', async () => {
      const service = createNotificationService({
        notificationRepository,
        notificationEndpointRepository: endpointRepository,
        notificationPreferenceRepository: preferenceRepository,
        rateLimitRepository,
        now,
      })

      const userId = generateId()

      await service.updatePreferences(userId, 'MARKETING', {
        email: false,
        push: true,
        inApp: true,
      })

      const pref = await preferenceRepository.findByUserAndCategory(userId, 'MARKETING')
      expect(pref?.channelEmail).toBe(false)
      expect(pref?.channelPush).toBe(true)
      expect(pref?.channelInApp).toBe(true)
    })

    it('updates existing preferences', async () => {
      const service = createNotificationService({
        notificationRepository,
        notificationEndpointRepository: endpointRepository,
        notificationPreferenceRepository: preferenceRepository,
        rateLimitRepository,
        now,
      })

      const userId = generateId()

      await service.updatePreferences(userId, 'ORDER_UPDATE', {
        email: true,
        push: true,
      })

      await service.updatePreferences(userId, 'ORDER_UPDATE', {
        email: false,
      })

      const pref = await preferenceRepository.findByUserAndCategory(userId, 'ORDER_UPDATE')
      expect(pref?.channelEmail).toBe(false)
      expect(pref?.channelPush).toBe(true)
    })

    it('prevents disabling mandatory categories', async () => {
      const service = createNotificationService({
        notificationRepository,
        notificationEndpointRepository: endpointRepository,
        notificationPreferenceRepository: preferenceRepository,
        rateLimitRepository,
        now,
      })

      const userId = generateId()

      await expect(
        service.updatePreferences(userId, 'SECURITY', {
          email: false,
        }),
      ).rejects.toThrow('Cannot disable mandatory notification categories')

      await expect(
        service.updatePreferences(userId, 'TRANSACTION', {
          push: false,
        }),
      ).rejects.toThrow('Cannot disable mandatory notification categories')
    })
  })

  describe('checkRateLimit', () => {
    it('allows action when under limit', async () => {
      const service = createNotificationService({
        notificationRepository,
        notificationEndpointRepository: endpointRepository,
        notificationPreferenceRepository: preferenceRepository,
        rateLimitRepository,
        now,
      })

      const userId = generateId()

      const result = await service.checkRateLimit(userId, 'chat:send')
      expect(result).toBe(true)
    })

    it('blocks action when over limit', async () => {
      const service = createNotificationService({
        notificationRepository,
        notificationEndpointRepository: endpointRepository,
        notificationPreferenceRepository: preferenceRepository,
        rateLimitRepository,
        now,
      })

      const userId = generateId()

      // Simulate hitting the limit (100 messages per hour for chat:send)
      for (let i = 0; i < 100; i++) {
        await service.checkRateLimit(userId, 'chat:send')
      }

      // 101st attempt should be blocked
      const result = await service.checkRateLimit(userId, 'chat:send')
      expect(result).toBe(false)
    })

    it('resets window after expiry', async () => {
      const service = createNotificationService({
        notificationRepository,
        notificationEndpointRepository: endpointRepository,
        notificationPreferenceRepository: preferenceRepository,
        rateLimitRepository,
        now,
      })

      const userId = generateId()

      // First check
      await service.checkRateLimit(userId, 'proposal:submit')

      // Advance time by 61 minutes (beyond 60-minute window)
      currentTime = new Date(currentTime.getTime() + 61 * 60 * 1000)

      // Should allow again (new window)
      const result = await service.checkRateLimit(userId, 'proposal:submit')
      expect(result).toBe(true)

      // Verify count was reset
      const rateLimit = await rateLimitRepository.findByUserAndAction(userId, 'proposal:submit')
      expect(rateLimit?.count).toBe(1)
    })

    it('allows action when no rate limit is defined', async () => {
      const service = createNotificationService({
        notificationRepository,
        notificationEndpointRepository: endpointRepository,
        notificationPreferenceRepository: preferenceRepository,
        rateLimitRepository,
        now,
      })

      const userId = generateId()

      const result = await service.checkRateLimit(userId, 'unknown:action')
      expect(result).toBe(true)
    })
  })
})
