import { createApiClient } from '@pim/contracts'

export const sampleOpenApiClient = createApiClient('https://api.example.com/api/v1')

if (false) {
  void sampleOpenApiClient.GET('/health')
  void sampleOpenApiClient.GET('/readiness')
}
