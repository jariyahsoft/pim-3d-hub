import { describe, expect, it } from 'vitest'
import {
  createMoneyMinor,
  parseDimensionsMm,
  parseMillimeter,
  parseUtcTimestamp,
  parseUuidv7,
  toRfc3339Utc,
} from '@pim/domain'

describe('canonical domain values', () => {
  it('accepts and normalizes UUIDv7 values', () => {
    const uuid = parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8f6d13')

    expect(uuid).toBe('018f18b2-4c4f-7c7a-9e12-4c0b8a8f6d13')
  })

  it('rejects non-UUIDv7 values', () => {
    expect(() => parseUuidv7('018f18b2-4c4f-6c7a-9e12-4c0b8a8f6d13')).toThrow(
      'Invalid UUIDv7 value',
    )
  })

  it('creates safe minor-unit money values', () => {
    const money = createMoneyMinor(1250, 'thb')

    expect(money).toEqual({
      minorUnits: 1250,
      currency: 'THB',
    })
    expect(JSON.parse(JSON.stringify(money))).toEqual({
      minorUnits: 1250,
      currency: 'THB',
    })
  })

  it('rejects negative and overflowing money values', () => {
    expect(() => createMoneyMinor(-1, 'THB')).toThrow('zero or greater')
    expect(() => createMoneyMinor(Number.MAX_SAFE_INTEGER + 1, 'THB')).toThrow(
      'safe integer range',
    )
  })

  it('parses UTC timestamps and serializes them predictably', () => {
    const timestamp = parseUtcTimestamp('2026-06-27T12:34:56.000Z')

    expect(timestamp).toBe('2026-06-27T12:34:56.000Z')
    expect(toRfc3339Utc(new Date('2026-06-27T12:34:56Z'))).toBe(
      '2026-06-27T12:34:56.000Z',
    )
  })

  it('rejects non-UTC timestamps', () => {
    expect(() => parseUtcTimestamp('2026-06-27T12:34:56+07:00')).toThrow(
      'Invalid RFC3339 UTC timestamp',
    )
  })

  it('parses positive dimension values', () => {
    const dimensions = parseDimensionsMm({
      widthMm: 10,
      heightMm: 20.5,
      depthMm: 30,
    })

    expect(dimensions).toEqual({
      widthMm: 10,
      heightMm: 20.5,
      depthMm: 30,
    })
    expect(parseMillimeter(2.5)).toBe(2.5)
  })

  it('rejects invalid dimension values', () => {
    expect(() => parseMillimeter(0)).toThrow('greater than zero')
    expect(() =>
      parseDimensionsMm({ widthMm: 10, heightMm: -1, depthMm: 30 }),
    ).toThrow('greater than zero')
  })
})
