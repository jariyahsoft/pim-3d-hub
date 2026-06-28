import { randomBytes } from 'node:crypto'
import { parseUuidv7, type Uuidv7 } from '@pim/domain'

function formatUuid(bytes: Uint8Array): string {
  const hex = [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('')

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

export type UuidGeneratorPort = Readonly<{
  next(): Uuidv7
}>

export function createUuidv7Generator(): UuidGeneratorPort {
  return Object.freeze({
    next(): Uuidv7 {
      const bytes = randomBytes(16)
      const unixMilliseconds = BigInt(Date.now())

      bytes[0] = Number((unixMilliseconds >> 40n) & 0xffn)
      bytes[1] = Number((unixMilliseconds >> 32n) & 0xffn)
      bytes[2] = Number((unixMilliseconds >> 24n) & 0xffn)
      bytes[3] = Number((unixMilliseconds >> 16n) & 0xffn)
      bytes[4] = Number((unixMilliseconds >> 8n) & 0xffn)
      bytes[5] = Number(unixMilliseconds & 0xffn)
      bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x70
      bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80

      return parseUuidv7(formatUuid(bytes))
    },
  })
}
