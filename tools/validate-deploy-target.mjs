const args = new Map(
  process.argv.slice(2).map((entry) => {
    const [key, value = ''] = entry.split('=')
    return [key.replace(/^--/, ''), value]
  }),
)

const environment = args.get('environment') || process.env.DEPLOY_ENVIRONMENT || 'preview'
const eventName = args.get('event') || process.env.GITHUB_EVENT_NAME || 'workflow_dispatch'
const dryRun = (args.get('dry-run') || process.env.DEPLOY_DRY_RUN || 'true') === 'true'

const allowedEnvironments = new Set(['preview', 'staging'])

if (!allowedEnvironments.has(environment)) {
  throw new Error(`Deployment environment must be preview or staging, received: ${environment}`)
}

if (eventName === 'pull_request' && environment !== 'preview') {
  throw new Error('Pull request deployments must target the preview environment only')
}

if (eventName === 'pull_request' && !dryRun) {
  throw new Error('Pull request deployments must remain dry-run only')
}

console.log(`Validated deploy target: environment=${environment}, event=${eventName}, dryRun=${dryRun}`)
