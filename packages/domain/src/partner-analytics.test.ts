import { describe, it, expect } from 'vitest';
import {
  validateReportRequest,
  AffiliateSelfReferralError,
  OfficialStoreNotApprovedError,
} from './partner-analytics.js';

describe('PartnerAnalytics', () => {
  it('rejects PII export', () => {
    expect(() =>
      validateReportRequest({
        format: 'CSV',
        includePii: true,
        periodEnd: '2026-08-01',
        periodStart: '2026-07-01',
        reportType: 'SELLER',
      }),
    ).toThrow(/PII/);
  });
  it('rejects invalid range', () => {
    expect(() =>
      validateReportRequest({
        format: 'JSONL',
        includePii: false,
        periodEnd: '2026-01-01',
        periodStart: '2026-07-01',
        reportType: 'PLATFORM',
      }),
    ).toThrow(/periodEnd.*periodStart/);
  });
  it('accepts valid report', () => {
    expect(() =>
      validateReportRequest({
        format: 'JSONL',
        includePii: false,
        periodEnd: '2026-08-01',
        periodStart: '2026-07-01',
        reportType: 'PLATFORM',
      }),
    ).not.toThrow();
  });
  it('SelfReferral error code', () => {
    expect(new AffiliateSelfReferralError().code).toBe('SELF_REFERRAL');
  });
  it('OfficialStore error code', () => {
    expect(new OfficialStoreNotApprovedError('prov-1' as any).code).toBe(
      'OFFICIAL_STORE_NOT_APPROVED',
    );
  });
});
