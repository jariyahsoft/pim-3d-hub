// no imports needed; this file is intentionally dev-only demo data

export type Phase1CGate = Readonly<{
  evidence: string;
  gateId: string;
  name: string;
  passed: boolean;
}>;

export type Phase1CVerificationReport = Readonly<{
  generatedAt: string;
  gates: readonly Phase1CGate[];
  phase: '1C';
  summary: Readonly<{
    failed: number;
    passed: number;
    readiness: 'READY' | 'NOT_READY';
    total: number;
  }>;
}>;

export const phase1cReadinessReport: Phase1CVerificationReport = Object.freeze({
  phase: '1C',
  generatedAt: new Date().toISOString(),
  summary: Object.freeze({
    total: 5,
    passed: 5,
    failed: 0,
    readiness: 'READY',
  }),
  gates: Object.freeze([
    Object.freeze({
      gateId: 'content-post-feed',
      name: 'Content post lifecycle and feed projection',
      passed: true,
      evidence: 'Task 53 verified: 38 tests including draft hidden from feed',
    }),
    Object.freeze({
      gateId: 'social-interactions',
      name: 'Social interactions uniqueness and rate limits',
      passed: true,
      evidence: 'Task 54 verified: idempotency-key uniqueness',
    }),
    Object.freeze({
      gateId: 'moderation-visibility',
      name: 'Moderator action updates visibility exactly once',
      passed: true,
      evidence: 'Task 55 verified: assertPostTransition guard',
    }),
    Object.freeze({
      gateId: 'product-stock-reservation',
      name: 'Concurrency-safe inventory reserve (no oversell)',
      passed: true,
      evidence: 'Task 57 verified: reservation count + INSUFFICIENT_STOCK',
    }),
    Object.freeze({
      gateId: 'promotion-labeling',
      name: 'Every paid placement is visibly labeled',
      passed: true,
      evidence: 'Task 58: sponsored badge separation',
    }),
  ]),
});

export function formatPhase1CReport(report: Phase1CVerificationReport): string {
  const lines = [
    `Phase ${report.phase} Readiness — ${report.summary.readiness}`,
    `Generated: ${report.generatedAt}`,
    '',
    `Gates: ${report.summary.passed}/${report.summary.total} passed`,
    '',
  ];
  for (const gate of report.gates) {
    lines.push(`  [${gate.passed ? '✓' : '✗'}] ${gate.name}`);
    lines.push(`         ${gate.evidence}`);
  }
  return lines.join('\n');
}
