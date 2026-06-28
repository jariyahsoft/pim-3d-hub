const taskName = process.argv[2] ?? 'task'
const packageName = process.env.npm_package_name ?? 'unknown-package'
const failureTarget = process.env.WORKSPACE_TASK_FAIL

if (failureTarget && (failureTarget === packageName || failureTarget === taskName)) {
  console.error(`[placeholder] ${packageName} ${taskName} failed by request`)
  process.exit(1)
}

console.log(`[placeholder] ${packageName} ${taskName}`)
