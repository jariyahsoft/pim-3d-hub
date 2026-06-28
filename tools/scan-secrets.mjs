import { readFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'

const examplePathPatterns = [/\.env\.example$/, /\.example\./, /docs\/cli\.example\.md$/]
const secretPatterns = [
  {
    id: 'private-key-block',
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/m,
  },
  {
    id: 'telegram-token',
    pattern: /\b\d{6,}:[A-Za-z0-9_-]{35,}\b/,
  },
  {
    id: 'aws-access-key',
    pattern: /\bAKIA[0-9A-Z]{16}\b/,
  },
  {
    id: 'github-token',
    pattern: /\bgh[pousr]_[A-Za-z0-9_]{36,}\b/,
  },
  {
    id: 'google-api-key',
    pattern: /\bAIza[0-9A-Za-z_-]{35}\b/,
  },
  {
    id: 'slack-token',
    pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/,
  },
]

function isExampleFile(filePath) {
  return examplePathPatterns.some((pattern) => pattern.test(filePath))
}

function getTrackedFiles() {
  const output = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((filePath) => !isExampleFile(filePath))
}

async function scanFile(filePath) {
  const text = await readFile(filePath, 'utf8')
  const findings = []

  for (const rule of secretPatterns) {
    if (rule.pattern.test(text)) {
      findings.push(rule.id)
    }
  }

  return findings
}

async function main() {
  const filePaths = process.argv.slice(2)
  const targets = filePaths.length > 0 ? filePaths : getTrackedFiles()
  const findings = []

  for (const filePath of targets) {
    const detected = await scanFile(filePath)

    for (const ruleId of detected) {
      findings.push({ filePath, ruleId })
    }
  }

  if (findings.length === 0) {
    return
  }

  console.error('Secret scan failed:')
  for (const finding of findings) {
    console.error(`- ${finding.filePath} matched ${finding.ruleId}`)
  }
  process.exitCode = 1
}

await main()
