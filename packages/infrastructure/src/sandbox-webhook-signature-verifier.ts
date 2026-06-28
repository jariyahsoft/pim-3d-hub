import crypto from 'node:crypto'
import type {
  WebhookSignatureVerifier,
  WebhookSignatureVerificationRequest,
} from './payment-port.js'

export function createSandboxWebhookSignatureVerifier(): WebhookSignatureVerifier {
  return {
    verify(request: WebhookSignatureVerificationRequest): boolean {
      // Sandbox implementation: HMAC SHA-256
      const hmac = crypto.createHmac('sha256', request.secret)
      hmac.update(request.rawBody)
      const expectedSignature = hmac.digest('hex')

      // Constant-time comparison to prevent timing attacks
      return crypto.timingSafeEqual(
        Buffer.from(request.signature),
        Buffer.from(expectedSignature),
      )
    },
  }
}

// Helper to generate test webhook signatures
export function generateSandboxWebhookSignature(
  rawBody: string,
  secret: string,
): string {
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(rawBody)
  return hmac.digest('hex')
}
