import type { NotificationPort } from '@pim/application'
import type { NotificationChannel } from '@pim/domain'

export type SandboxNotificationAdapter = NotificationPort & {
  readonly sentNotifications: ReadonlyArray<{
    channel: NotificationChannel
    endpoint: string
    metadata: Record<string, unknown>
    templateData: Record<string, unknown>
    templateKey: string
    timestamp: Date
  }>
  clearHistory(): void
}

export function createSandboxNotificationAdapter(deps: {
  now: () => Date
  simulateFailureForTemplateKey?: string
}): SandboxNotificationAdapter {
  const { now, simulateFailureForTemplateKey } = deps
  const sent: Array<{
    channel: NotificationChannel
    endpoint: string
    metadata: Record<string, unknown>
    templateData: Record<string, unknown>
    templateKey: string
    timestamp: Date
  }> = []

  return {
    async send(input) {
      // Simulate failure for testing
      if (simulateFailureForTemplateKey && input.templateKey === simulateFailureForTemplateKey) {
        return { success: false, reason: 'Simulated failure' }
      }

      // Record notification
      sent.push({
        channel: input.channel,
        endpoint: input.endpoint,
        metadata: input.metadata,
        templateData: input.templateData,
        templateKey: input.templateKey,
        timestamp: now(),
      })

      return { success: true }
    },

    get sentNotifications() {
      return sent
    },

    clearHistory() {
      sent.length = 0
    },
  }
}
