import { describe, it, expect } from 'vitest';
import {
  validateReleaseReadiness,
  validateMigrationDecision,
  ReleaseOperationBlockedError,
  MigrationNotReadyError,
} from './release-operations.js';

describe('ReleaseOperations', () => {
  it('passes when all items pass', () => {
    expect(() =>
      validateReleaseReadiness({
        releaseVersion: '1.0',
        createdAt: '',
        summaryStatus: 'READY',
        checklist: [
          {
            itemId: 'i1',
            label: 'Index',
            assignee: 'eng',
            status: 'PASS',
            evidence: 'done',
          },
        ],
      }),
    ).not.toThrow();
  });
  it('blocks on BLOCKED', () => {
    expect(() =>
      validateReleaseReadiness({
        releaseVersion: '1.0',
        createdAt: '',
        summaryStatus: 'BLOCKED',
        checklist: [
          {
            itemId: 'i1',
            label: 'X',
            assignee: 'eng',
            status: 'BLOCKED',
            evidence: 'nope',
          },
        ],
      }),
    ).toThrow(ReleaseOperationBlockedError);
  });
  it('blocks on PENDING', () => {
    expect(() =>
      validateReleaseReadiness({
        releaseVersion: '1.0',
        createdAt: '',
        summaryStatus: 'IN_PROGRESS',
        checklist: [
          {
            itemId: 'i1',
            label: 'X',
            assignee: 'eng',
            status: 'PENDING',
            evidence: '',
          },
        ],
      }),
    ).toThrow(ReleaseOperationBlockedError);
  });
  it('migration requires evidence', () => {
    expect(() =>
      validateMigrationDecision({
        adrVersion: 1,
        decision: 'REMAIN',
        decisionDate: '',
        evidenceLinks: [],
        thresholdsMet: true,
      }),
    ).toThrow(MigrationNotReadyError);
  });
  it('EXECUTE without thresholds fails', () => {
    expect(() =>
      validateMigrationDecision({
        adrVersion: 1,
        decision: 'EXECUTE',
        decisionDate: '',
        evidenceLinks: ['l'],
        thresholdsMet: false,
      }),
    ).toThrow(MigrationNotReadyError);
  });
  it('REMAIN with evidence passes', () => {
    expect(() =>
      validateMigrationDecision({
        adrVersion: 1,
        decision: 'REMAIN',
        decisionDate: '',
        evidenceLinks: ['l'],
        thresholdsMet: true,
      }),
    ).not.toThrow();
  });
});
