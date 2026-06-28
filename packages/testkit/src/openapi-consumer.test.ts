import { describe, expect, it } from 'vitest'
import { sampleOpenApiClient } from './openapi-consumer.js'

describe('OpenAPI client consumer', () => {
  it('exposes a typed client for the public contract', () => {
    expect(typeof sampleOpenApiClient.GET).toBe('function')
    expect(typeof sampleOpenApiClient.POST).toBe('function')
  })
})
