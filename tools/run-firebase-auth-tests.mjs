import { spawnSync } from 'node:child_process'

const projectId = 'demo-pim-3d-hub-local'
const command = [
  'corepack pnpm exec vitest run --config vitest.auth.config.mjs',
]

const result = spawnSync(
  'corepack',
  [
    'pnpm',
    'exec',
    'firebase',
    'emulators:exec',
    '--project',
    projectId,
    '--config',
    'firebase/firebase.json',
    '--only',
    'auth',
    command.join(' '),
  ],
  {
    env: {
      ...process.env,
      APP_ENV: 'local',
    },
    shell: false,
    stdio: 'inherit',
  },
)

if (result.error) {
  throw result.error
}

process.exit(result.status ?? 1)
