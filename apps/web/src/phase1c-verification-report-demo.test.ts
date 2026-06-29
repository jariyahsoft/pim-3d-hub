import { describe, it, expect } from 'vitest';
import {
  formatPhase1CReport,
  phase1cReadinessReport,
} from './phase1c-verification-report-demo.js';

describe('Phase1CVerificationReport', () => {
  it('exposes all 5 gates', () => {
    expect(phase1cReadinessReport.gates.length).toBe(5);
  });

  it('marks the report as READY when all gates pass', () => {
    expect(phase1cReadinessReport.summary.readiness).toBe('READY');
    expect(phase1cReadinessReport.summary.failed).toBe(0);
    expect(phase1cReadinessReport.summary.passed).toBe(5);
  });

  it('formats report as plain text', () => {
    const text = formatPhase1CReport(phase1cReadinessReport);
    expect(text).toContain('Phase 1C');
    expect(text).toContain('READY');
    expect(text).toContain('Content post lifecycle');
  });

  it('every gate has a unique gateId', () => {
    const ids = phase1cReadinessReport.gates.map((g) => g.gateId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every gate has evidence text', () => {
    for (const g of phase1cReadinessReport.gates) {
      expect(typeof g.evidence).toBe('string');
      expect(g.evidence.length).toBeGreaterThan(0);
    }
  });
});
