import { describe, expect, it } from 'vitest'
import {
  createApiRuntime,
  createOutboxMetadata,
  createRequestContext,
  createStructuredLogger,
  createWorkerRuntime,
  type StructuredLogEntry,
} from '@pim/application'

function createCapturingLogger() {
  const entries: StructuredLogEntry[] = []

  const logger = createStructuredLogger({
    clock: () => new Date('2026-06-27T00:00:00.000Z'),
    context: {
      action: 'bootstrap',
      module: 'test',
    },
    sink(line) {
      entries.push(JSON.parse(line) as StructuredLogEntry)
    },
  })

  return {
    entries,
    logger,
  }
}

describe('observability helpers', () => {
  it('preserves request and trace identifiers from API to worker logs through outbox metadata', () => {
    const apiCapture = createCapturingLogger()
    const apiRuntime = createApiRuntime({
      logger: apiCapture.logger,
    })

    const apiResult = apiRuntime.handleHealthCheck({
      context: {
        action: 'health.check',
        module: 'api',
        requestId: 'req_api_123',
        traceId: 'trace_api_123',
        userId: 'user_123',
      },
    })

    const workerCapture = createCapturingLogger()
    const workerRuntime = createWorkerRuntime({
      logger: workerCapture.logger,
    })
    const workerResult = workerRuntime.handleOutboxEvent({
      metadata: apiResult.outboxMetadata,
    })

    if ('error' in apiResult.response) {
      throw new Error('expected API success envelope')
    }

    expect(apiResult.response.meta.requestId).toBe('req_api_123')
    expect(apiResult.outboxMetadata.requestId).toBe('req_api_123')
    expect(apiResult.outboxMetadata.traceId).toBe('trace_api_123')
    expect(workerResult.context.requestId).toBe('req_api_123')
    expect(workerResult.context.traceId).toBe('trace_api_123')
    expect(apiCapture.entries.every((entry) => entry.requestId === 'req_api_123')).toBe(true)
    expect(apiCapture.entries.every((entry) => entry.traceId === 'trace_api_123')).toBe(true)
    expect(workerCapture.entries.every((entry) => entry.requestId === 'req_api_123')).toBe(true)
    expect(workerCapture.entries.every((entry) => entry.traceId === 'trace_api_123')).toBe(true)
  })

  it('redacts sensitive fields and tokens from structured logs', () => {
    const capture = createCapturingLogger()
    const context = createRequestContext({
      action: 'redaction.check',
      module: 'api',
      requestId: 'req_redact_123',
      traceId: 'trace_redact_123',
    })

    capture.logger.child(context).info('security.redaction', {
      accessToken: 'token-abc-123',
      payment: {
        cardNumber: '4111111111111111',
      },
      safeValue: 'visible',
      signedUrl: 'https://example.com/upload?token=token-abc-123',
      shippingAddress: {
        line1: '123 Hidden Street',
      },
    })

    const entry = capture.entries.at(-1)

    expect(JSON.stringify(entry)).not.toContain('token-abc-123')
    expect(JSON.stringify(entry)).not.toContain('4111111111111111')
    expect(JSON.stringify(entry)).not.toContain('123 Hidden Street')
    expect(entry?.details).toMatchObject({
      accessToken: '[REDACTED]',
      safeValue: 'visible',
      signedUrl: '[REDACTED]',
    })
  })

  it('maps unexpected errors to a safe envelope while retaining the internal correlation ID', () => {
    const capture = createCapturingLogger()
    const apiRuntime = createApiRuntime({
      logger: capture.logger,
    })

    const result = apiRuntime.handleHealthCheck({
      context: {
        action: 'health.check',
        module: 'api',
        requestId: 'req_error_123',
        traceId: 'trace_error_123',
      },
      failWith: new Error('database password=secret-value'),
    })

    expect(result.internalCorrelationId).toBe('trace_error_123')

    if (!('error' in result.response)) {
      throw new Error('expected API error envelope')
    }

    expect(result.response.error.requestId).toBe('req_error_123')
    expect(result.response.error.code).toBe('INTERNAL_SERVER_ERROR')
    expect(JSON.stringify(result.response)).not.toContain('secret-value')
    expect(JSON.stringify(capture.entries.at(-1))).not.toContain('secret-value')
    expect(JSON.stringify(capture.entries.at(-1))).toContain('trace_error_123')
  })

  it('creates outbox metadata from request context explicitly', () => {
    const context = createRequestContext({
      action: 'request.created',
      module: 'api',
      requestId: 'req_outbox_123',
      traceId: 'trace_outbox_123',
    })

    expect(
      createOutboxMetadata(context, {
        eventType: 'service-request.created',
        outboxEventId: 'outbox_123',
      }),
    ).toMatchObject({
      eventType: 'service-request.created',
      outboxEventId: 'outbox_123',
      requestId: 'req_outbox_123',
      traceId: 'trace_outbox_123',
    })
  })
})
