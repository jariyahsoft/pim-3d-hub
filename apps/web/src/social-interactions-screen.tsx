'use client';

import { useState, type ReactElement } from 'react';
import {
  demoReactions,
  demoVerifiedPurchase,
  reactionLabels,
  withdrawalActionLabels,
  type DemoReaction,
  type DemoShowcaseConsent,
  type DemoVerification,
} from './social-interactions-screen-demo.js';

export type ReactionRowProps = Readonly<{
  reactions?: readonly DemoReaction[];
  onToggle?: (kind: 'LIKE' | 'WOW' | 'HELPFUL') => void;
}>;

export type VerifiedPurchaseBadgeProps = Readonly<{
  verification?: DemoVerification;
}>;

export type ShowcaseConsentCardProps = Readonly<{
  consent?: DemoShowcaseConsent;
  onWithdraw?: () => void;
}>;

export type SocialInteractionsScreenProps = Readonly<{
  initialConsent?: DemoShowcaseConsent;
  initialReactions?: readonly DemoReaction[];
  initialVerification?: DemoVerification;
  onWithdrawConsent?: () => Promise<void>;
}>;

export function SocialInteractionsScreen(
  props: SocialInteractionsScreenProps,
): ReactElement {
  const reactions = props.initialReactions ?? demoReactions;
  const verification = props.initialVerification ?? demoVerifiedPurchase;

  return (
    <div className="social-screen">
      <h2>ชุมชน</h2>

      <section
        className="reactions-section"
        aria-labelledby="reactions-heading"
      >
        <h3 id="reactions-heading">ปฏิกิริยา</h3>
        <ReactionRow
          reactions={reactions}
          onToggle={(kind) => console.log('toggle', kind)}
        />
      </section>

      <VerifiedPurchaseBadge verification={verification} />

      <ShowcaseConsentCard
        consent={props.initialConsent}
        onWithdraw={() => props.onWithdrawConsent?.()}
      />

      <style>{`
        .social-screen {
          max-width: 720px;
          margin: 0 auto;
          padding: 1.5rem;
          font-family: system-ui, sans-serif;
        }
        h2 { margin: 0 0 1rem; }
        h3 { margin: 0 0 0.5rem; font-size: 1.125rem; }
        .reactions-section,
        .verified-section,
        .consent-section {
          background: #fff;
          border: 1px solid #e1e5eb;
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1rem;
        }
      `}</style>
    </div>
  );
}

export function ReactionRow(props: ReactionRowProps): ReactElement {
  const reactions = props.reactions ?? demoReactions;

  return (
    <div className="reaction-row" role="group" aria-label="ปฏิกิริยา">
      {reactions.map((r) => (
        <button
          key={r.kind}
          type="button"
          className={`reaction-pill ${r.reacted ? 'reacted' : ''}`}
          onClick={() => props.onToggle?.(r.kind)}
          aria-pressed={r.reacted}
          aria-label={`${reactionLabels[r.kind]} ${r.total} คน`}
        >
          <span className="reaction-icon" aria-hidden>
            {kindIcon(r.kind)}
          </span>
          <span className="reaction-label">
            {reactionLabels[r.kind] ?? r.kind}
          </span>
          <span className="reaction-count">{r.total}</span>
        </button>
      ))}
      <style>{`
        .reaction-row {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .reaction-pill {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 999px;
          background: #fff;
          font-size: 0.875rem;
          cursor: pointer;
        }
        .reaction-pill:hover { background: #f9fafb; }
        .reaction-pill.reacted {
          background: #2563eb;
          color: #fff;
          border-color: #2563eb;
        }
      `}</style>
    </div>
  );
}

function kindIcon(kind: string): string {
  switch (kind) {
    case 'LIKE':
      return '♥';
    case 'WOW':
      return '!';
    case 'HELPFUL':
      return '✓';
    default:
      return '•';
  }
}

export function VerifiedPurchaseBadge(
  props: VerifiedPurchaseBadgeProps,
): ReactElement {
  const verification = props.verification ?? demoVerifiedPurchase;

  if (!verification.eligible) {
    return null;
  }

  return (
    <section className="verified-section" aria-labelledby="verified-heading">
      <h3 id="verified-heading">การยืนยันการซื้อ</h3>
      <p>
        <span className="verified-badge-lg" aria-label="การยืนยันการซื้อ">
          ✓ ยืนยันการซื้อ
        </span>
      </p>
      <p className="verified-reason">{verification.reason}</p>
      <p className="verified-meta" aria-label="รหัสคำสั่งซื้อ">
        คำสั่งซื้อ: {verification.orderId.slice(0, 8)}…
      </p>
      <style>{`
        .verified-badge-lg {
          display: inline-block;
          background: #16a34a;
          color: #fff;
          padding: 0.375rem 0.75rem;
          border-radius: 4px;
          font-size: 0.875rem;
          font-weight: 600;
        }
        .verified-reason {
          color: #4b5563;
          font-size: 0.875rem;
        }
        .verified-meta {
          color: #6b7280;
          font-size: 0.75rem;
          font-family: monospace;
        }
      `}</style>
    </section>
  );
}

export function ShowcaseConsentCard(
  props: ShowcaseConsentCardProps,
): ReactElement {
  const consent = props.consent ?? {
    consentId: '00000000-0000-7000-0000-000000000000',
    customerId: '00000000-0000-7000-0000-000000000000',
    orderId: '00000000-0000-7000-0000-000000000000',
    providerId: '00000000-0000-7000-0000-000000000000',
    scopes: [],
    status: 'GRANTED' as const,
    withdrawalAction: 'HIDE_CONTENT' as const,
  };
  const [withdrawing, setWithdrawing] = useState(false);

  async function handleWithdraw(): Promise<void> {
    if (!props.onWithdraw) return;
    setWithdrawing(true);
    try {
      await props.onWithdraw();
    } finally {
      setWithdrawing(false);
    }
  }

  return (
    <section className="consent-section" aria-labelledby="consent-heading">
      <h3 id="consent-heading">คำยินยอยในการแสดงผลงาน</h3>

      <dl className="consent-summary">
        <dt>สถานะ</dt>
        <dd>
          <span
            className={`consent-status consent-${consent.status.toLowerCase()}`}
            role="status"
          >
            {consent.status === 'GRANTED' ? 'อนุญาต' : 'ถอนคำยินยอย'}
          </span>
        </dd>
        <dt>ขอบเขตที่อนุญาต</dt>
        <dd>
          {consent.scopes.map((s) => (
            <span key={s} className="scope-tag">
              {scopeLabel(s)}
            </span>
          ))}
        </dd>
        <dt>คำสั่งซื้อ</dt>
        <dd className="consent-id">{consent.orderId.slice(0, 8)}…</dd>
      </dl>

      {consent.status === 'WITHDRAWN' && (
        <div className="withdrawal-notice" role="status">
          <strong>การถอนคำยินยอย:</strong>{' '}
          {withdrawalActionLabels[consent.withdrawalAction] ??
            consent.withdrawalAction}
        </div>
      )}

      {consent.status === 'GRANTED' && props.onWithdraw && (
        <button
          type="button"
          className="withdraw-btn"
          onClick={handleWithdraw}
          disabled={withdrawing}
          aria-busy={withdrawing}
        >
          {withdrawing ? 'กำลังถอนคำยินยอย...' : 'ถอนคำยินยอย'}
        </button>
      )}

      <style>{`
        .consent-summary { display: grid; grid-template-columns: auto 1fr; gap: 0.5rem 1rem; margin: 0 0 1rem; }
        .consent-summary dt { font-weight: 600; color: #4b5563; }
        .consent-summary dd { margin: 0; }
        .consent-status {
          display: inline-block;
          padding: 0.125rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
        }
        .consent-granted { background: #d4edda; color: #155724; }
        .consent-withdrawn { background: #f8d7da; color: #721c24; }
        .scope-tag {
          display: inline-block;
          margin: 0.25rem 0.25rem 0 0;
          padding: 0.125rem 0.5rem;
          border-radius: 4px;
          background: #eff6ff;
          color: #1d4ed8;
          font-size: 0.75rem;
        }
        .consent-id { font-family: monospace; font-size: 0.875rem; }
        .withdrawal-notice {
          padding: 0.75rem;
          background: #fff3cd;
          color: #92400e;
          border-radius: 6px;
          margin-bottom: 1rem;
          font-size: 0.875rem;
        }
        .withdraw-btn {
          padding: 0.5rem 1rem;
          background: #dc2626;
          color: #fff;
          border: none;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
        }
        .withdraw-btn:hover:not(:disabled) { background: #b91c1c; }
        .withdraw-btn:disabled {
          background: #fca5a5;
          cursor: not-allowed;
        }
      `}</style>
    </section>
  );
}

function scopeLabel(scope: string): string {
  switch (scope) {
    case 'PUBLIC_FEED':
      return 'ฟีดสาธารณะ';
    case 'PROVIDER_PROFILE':
      return 'โปรไฟล์ผู้ให้บริการ';
    case 'COMMUNITY_GALLERY':
      return 'แกลเลอรีชุมชน';
    case 'NDA_BLOCKED':
      return 'ไม่อนุญาต (NDA)';
    default:
      return scope;
  }
}
