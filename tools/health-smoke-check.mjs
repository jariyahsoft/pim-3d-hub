import { readFileSync } from 'node:fs'

const args = new Map(
  process.argv.slice(2).map((entry) => {
    const [key, value = 'true'] = entry.split('=')
    return [key.replace(/^--/, ''), value]
  }),
)

const contractOnly = args.has('contract-only')
const baseUrl = args.get('base-url') || process.env.SMOKE_BASE_URL || ''

function assertContractHasHealthEndpoints() {
  const document = JSON.parse(readFileSync('packages/contracts/openapi/openapi.v1.json', 'utf8'))
  const health = document.paths?.['/health']?.get
  const readiness = document.paths?.['/readiness']?.get

  if (!health || !readiness) {
    throw new Error('OpenAPI contract is missing /health or /readiness endpoints')
  }

  console.log('Validated /health and /readiness endpoints in the OpenAPI contract')
}

async function assertHttpEndpoint(path) {
  const response = await fetch(new URL(path, baseUrl))

  if (!response.ok) {
    throw new Error(`Smoke check failed for ${path}: HTTP ${response.status}`)
  }

  const body = await response.json()

  if (body?.data?.status !== 'ok') {
    throw new Error(`Smoke check failed for ${path}: unexpected payload`)
  }
}

if (contractOnly) {
  assertContractHasHealthEndpoints()
  process.exit(0)
}

if (!baseUrl) {
  throw new Error('SMOKE_BASE_URL or --base-url=<url> is required for live smoke checks')
}

await assertHttpEndpoint('/health')
await assertHttpEndpoint('/readiness')

console.log(`Smoke checks passed for ${baseUrl}`)
