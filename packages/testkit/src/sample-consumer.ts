import { createMoneyMinor, parseDimensionsMm, parseUtcTimestamp, parseUuidv7 } from '@pim/domain'
import {
  createApiSuccessEnvelopeSchema,
  parseUnknownEnumValue,
} from '@pim/contracts'
import { z } from 'zod'

export const sampleConsumerCanonicalValues = {
  dimensions: parseDimensionsMm({ widthMm: 10, heightMm: 20, depthMm: 30 }),
  money: createMoneyMinor(1250, 'THB'),
  status: parseUnknownEnumValue(['DRAFT', 'PUBLISHED'] as const, 'ARCHIVED'),
  timestamp: parseUtcTimestamp('2026-06-27T12:34:56.000Z'),
  uuid: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8f6d13'),
}

export const sampleConsumerEnvelope = createApiSuccessEnvelopeSchema(
  z.object({
    currency: z.string(),
    id: z.string(),
    minorUnits: z.number(),
  }),
).parse({
  data: {
    currency: sampleConsumerCanonicalValues.money.currency,
    id: sampleConsumerCanonicalValues.uuid,
    minorUnits: sampleConsumerCanonicalValues.money.minorUnits,
  },
  meta: {
    nextCursor: null,
    requestId: 'req_sample_consumer',
  },
})
