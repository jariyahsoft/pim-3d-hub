import createClient from 'openapi-fetch'
import type { paths } from './generated/openapi-v1.js'

const createTypedApiClient = createClient<paths>

export type OpenApiPaths = paths
export type OpenApiClient = ReturnType<typeof createTypedApiClient>

export function createApiClient(baseUrl: string): OpenApiClient {
  return createTypedApiClient({
    baseUrl,
  })
}
