import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'

const projectRoot = process.cwd()
const input = `${projectRoot}/packages/contracts/openapi/openapi.v1.json`
const output = `${projectRoot}/packages/contracts/src/generated/openapi-v1.ts`

mkdirSync(`${projectRoot}/packages/contracts/src/generated`, { recursive: true })

execFileSync(
  'corepack',
  ['pnpm', 'exec', 'openapi-typescript', input, '--output', output],
  {
    stdio: 'inherit',
  },
)
