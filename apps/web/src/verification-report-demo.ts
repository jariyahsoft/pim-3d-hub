// Phase 1B Verification Report Demo
// This is documentation data demonstrating the structure of the readiness report.

export const phase1bReadinessReport = Object.freeze({
  phase: '1B',
  generatedAt: new Date().toISOString(),
  summary: Object.freeze({
    totalTasks: 12,
    completedTasks: 12,
    openIssues: 0,
    readiness: 'READY',
  }),
  gates: Object.freeze([
    Object.freeze({
      id: 'pricing-reproducibility',
      name: 'Pricing reproducibility (Task 48/50 verify)',
      status: 'PASS',
      evidence: '98 tests including publishing-does-not-affect-old-quotes',
    }),
    Object.freeze({
      id: 'capacity-no-oversell',
      name: 'Capacity reservation no oversell (Task 23 + 50)',
      status: 'PASS',
      evidence: 'capacity tests + transition guards in Task 50',
    }),
    Object.freeze({
      id: 'queue-no-duplicate-effect',
      name: 'Queue replay no duplicate business effect (Task 46)',
      status: 'PASS',
      evidence: 'model-analysis idempotency contract tests',
    }),
    Object.freeze({
      id: 'private-file-penetration',
      name: 'Private file authorization / URL expiry (Task 22 + 23)',
      status: 'PASS',
      evidence: 'IDOR negative tests for file assets and orders',
    }),
  ]),
  residualRisks: Object.freeze([
    Object.freeze({
      category: 'external-vendor',
      description: 'Payment/KYC/shipping vendors still require legal signoff',
      owner: 'legal',
    }),
    Object.freeze({
      category: 'mobile',
      description: 'Mobile framework choice deferred to Task 59',
      owner: 'engineering',
    }),
  ]),
});

export function formatReadinessReport(
  report: typeof phase1bReadinessReport,
): string {
  const lines = [
    `Phase ${report.phase} Readiness — ${report.summary.readiness}`,
    `Generated: ${report.generatedAt}`,
    '',
    `Tasks: ${report.summary.completedTasks}/${report.summary.totalTasks} completed`,
    `Open issues: ${report.summary.openIssues}`,
    '',
    'Gates:',
  ];
  for (const gate of report.gates) {
    lines.push(`  [${gate.status}] ${gate.name}`);
    lines.push(`         ${gate.evidence}`);
  }
  return lines.join('\n');
}
