import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  createApiErrorEnvelopeSchema,
  createApiPageMetaSchema,
  createApiSuccessEnvelopeSchema,
  parseUnknownEnumValue,
  rfc3339UtcSchema,
  serializeRfc3339Utc,
} from '@pim/contracts'

describe('API envelope contracts', () => {
  it('parses success envelopes with request metadata', () => {
    const schema = createApiSuccessEnvelopeSchema(
      z.object({
        id: z.string(),
      }),
    )

    const parsed = schema.parse({
      data: { id: 'order_1' },
      meta: {
        requestId: 'req_123',
        nextCursor: null,
      },
    })

    expect(parsed.meta.requestId).toBe('req_123')
    expect(JSON.stringify(parsed)).toContain('"requestId":"req_123"')
  })

  it('parses error envelopes with stable codes and safe details', () => {
    const parsed = createApiErrorEnvelopeSchema().parse({
      error: {
        code: 'ORDER_VERSION_CONFLICT',
        details: {
          expectedVersion: 2,
          actualVersion: 3,
        },
        fields: ['expectedVersion'],
        message: 'ข้อมูลคำสั่งซื้อมีการเปลี่ยนแปลง',
        requestId: 'req_123',
      },
    })

    expect(parsed.error.code).toBe('ORDER_VERSION_CONFLICT')
    expect(parsed.error.fields).toEqual(['expectedVersion'])
  })

  it('parses page metadata and preserves optional cursors', () => {
    const parsed = createApiPageMetaSchema().parse({
      limit: 20,
      nextCursor: 'opaque-cursor',
      requestId: 'req_123',
      total: 48,
    })

    expect(parsed.nextCursor).toBe('opaque-cursor')
    expect(parsed.total).toBe(48)
  })

  it('serializes UTC timestamps in RFC3339 form', () => {
    expect(serializeRfc3339Utc(new Date('2026-06-27T12:34:56Z'))).toBe(
      '2026-06-27T12:34:56.000Z',
    )
    expect(rfc3339UtcSchema.parse('2026-06-27T12:34:56.000Z')).toBe(
      '2026-06-27T12:34:56.000Z',
    )
  })

  it('handles unknown enum values explicitly', () => {
    expect(parseUnknownEnumValue(['DRAFT', 'PUBLISHED'] as const, 'PUBLISHED')).toBe(
      'PUBLISHED',
    )
    expect(parseUnknownEnumValue(['DRAFT', 'PUBLISHED'] as const, 'ARCHIVED')).toEqual({
      unknown: true,
      value: 'ARCHIVED',
    })
  })

  it('serializes without BigInt or runtime-only values', () => {
    const envelope = createApiSuccessEnvelopeSchema(
      z.object({
        amount: z.number(),
      }),
    ).parse({
      data: {
        amount: 2500,
      },
      meta: {
        requestId: 'req_123',
        nextCursor: null,
      },
    })

    expect(JSON.stringify(envelope)).toContain('"amount":2500')
  })
})
