'use client';

import { useState, type ReactElement } from 'react';
import {
  demoCreatorProfile,
  demoSuspendedCreator,
  platformLabels,
  type DemoCreatorProfile,
} from './creator-profile-screen-demo.js';

export type ReportContext = Readonly<{
  targetId: string;
  targetType: 'POST' | 'COMMENT' | 'USER';
}>;

export type CreatorProfileScreenProps = Readonly<{
  initialProfile?: DemoCreatorProfile;
  initialErrorMessage?: string | null;
  initialLoading?: boolean;
  onFollowToggle?: () => Promise<void>;
  onReport?: (ctx: ReportContext) => void;
}>;

export function CreatorProfileScreen(
  props: CreatorProfileScreenProps,
): ReactElement {
  const initial = props.initialProfile ?? demoCreatorProfile;
  const [profile] = useState<DemoCreatorProfile>(initial);
  const [loading] = useState(props.initialLoading ?? false);
  const [errorMessage] = useState(props.initialErrorMessage ?? null);
  const [announcement, setAnnouncement] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);

  if (loading) {
    return (
      <div className="creator-profile-screen">
        <div role="status" aria-live="polite" className="loading-banner">
          กำลังโหลดโปรไฟล์...
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="creator-profile-screen">
        <div role="alert" className="error-banner">
          {errorMessage}
        </div>
      </div>
    );
  }

  if (profile.visibility === 'REMOVED') {
    return (
      <div className="creator-profile-screen">
        <div role="status" className="removed-banner">
          <h2>โปรไฟล์นี้ถูกลบแล้ว</h2>
        </div>
      </div>
    );
  }

  async function handleFollow(): Promise<void> {
    if (!props.onFollowToggle) return;
    await props.onFollowToggle();
    setAnnouncement(
      profile.isFollowedByViewer ? 'ยกเลิกติดตามแล้ว' : 'ติดตามแล้ว',
    );
  }

  return (
    <div className="creator-profile-screen">
      <header className="profile-header" aria-labelledby="creator-name">
        <h2 id="creator-name">{profile.displayName}</h2>
        {profile.province && (
          <p className="profile-province">{profile.province}</p>
        )}
        <p className="profile-bio">{profile.bio}</p>
      </header>

      {profile.visibility === 'SUSPENDED' && (
        <div
          className="suspended-banner"
          role="alert"
          data-testid="creator-suspended"
        >
          <strong>บัญชีนี้ถูกระงับ</strong>
          <p>{profile.suspendedReason ?? 'ไม่มีรายละเอียด'}</p>
          {profile.suspendedUntil && (
            <p>จนถึง: {profile.suspendedUntil.slice(0, 10)}</p>
          )}
        </div>
      )}

      {profile.visibility === 'PUBLIC_HIDDEN' && (
        <div className="hidden-banner" role="status">
          <strong>โปรไฟล์นี้ถูกซ่อน</strong>
        </div>
      )}

      <section className="profile-stats" aria-label="สถิติสาธารณะ">
        <div className="stat">
          <strong>{profile.postsCount}</strong>
          <span>โพสต์</span>
        </div>
        <div className="stat">
          <strong>{profile.productsCount}</strong>
          <span>ผลิตภัณฑ์</span>
        </div>
        <div className="stat">
          <strong>
            {profile.ratingAverage !== null
              ? profile.ratingAverage.toFixed(1)
              : '—'}
          </strong>
          <span>
            ★{' '}
            {profile.ratingCount > 0
              ? `(${profile.ratingCount})`
              : 'ไม่มีรีวิว'}
          </span>
        </div>
      </section>

      {profile.socialLinks.length > 0 && (
        <section className="social-section" aria-label="ลิงก์โซเชียล">
          <h3>ช่องทางติดต่อ</h3>
          <ul className="social-list" role="list">
            {profile.socialLinks.map((link) => (
              <li key={link.url}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${platformLabels[link.platform] ?? link.platform}: ${link.url}`}
                >
                  {platformLabels[link.platform] ?? link.platform}
                </a>
              </li>
            ))}
          </ul>
          <p className="privacy-note">
            ข้อมูลติดต่อโดยตรง (อีเมล เบอร์โทร) จะไม่ปรากฏต่อสาธารณะ
          </p>
        </section>
      )}

      <div className="profile-actions">
        {props.onFollowToggle && (
          <button
            type="button"
            className={`follow-btn ${
              profile.isFollowedByViewer ? 'following' : ''
            }`}
            onClick={handleFollow}
            aria-pressed={profile.isFollowedByViewer}
            disabled={profile.visibility !== 'PUBLIC_ACTIVE'}
          >
            {profile.isFollowedByViewer ? 'กำลังติดตาม' : 'ติดตาม'}
          </button>
        )}
        {props.onReport && profile.visibility !== 'SUSPENDED' && (
          <button
            type="button"
            className="report-btn"
            onClick={() => setShowReportModal(!showReportModal)}
            aria-expanded={showReportModal}
          >
            รายงานโปรไฟล์
          </button>
        )}
      </div>

      {showReportModal && (
        <ReportModal
          onClose={() => setShowReportModal(false)}
          onSubmit={(reason, _description) => {
            props.onReport?.({
              targetId: profile.creatorUserId,
              targetType: 'USER',
            });
            setAnnouncement(`รายงาน${reason}ถูกส่งแล้ว`);
            setShowReportModal(false);
          }}
        />
      )}

      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>

      <style>{`
        .creator-profile-screen {
          max-width: 720px;
          margin: 0 auto;
          padding: 1.5rem;
          font-family: system-ui, sans-serif;
        }
        h2 { margin: 0 0 0.25rem; }
        h3 { margin: 0 0 0.5rem; font-size: 1.125rem; }
        .profile-header h2 { font-size: 1.75rem; }
        .profile-province { color: #6b7280; font-size: 0.875rem; margin: 0 0 0.5rem; }
        .profile-bio { line-height: 1.5; }
        .profile-stats {
          display: flex;
          gap: 1.5rem;
          padding: 1rem 0;
          border-bottom: 1px solid #e1e5eb;
          margin-bottom: 1rem;
        }
        .stat { display: flex; flex-direction: column; }
        .stat strong { font-size: 1.25rem; }
        .stat span { color: #6b7280; font-size: 0.875rem; }
        .social-section {
          background: #f9fafb;
          padding: 1rem;
          border-radius: 6px;
          margin-bottom: 1rem;
        }
        .social-list { list-style: none; padding: 0; margin: 0; }
        .social-list li { padding: 0.25rem 0; }
        .social-list a { color: #2563eb; text-decoration: none; }
        .privacy-note { font-size: 0.75rem; color: #6b7280; margin: 0.5rem 0 0; }
        .profile-actions {
          display: flex;
          gap: 0.5rem;
          margin: 1rem 0;
        }
        .follow-btn {
          padding: 0.5rem 1rem;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          background: #fff;
          cursor: pointer;
        }
        .follow-btn.following {
          background: #2563eb;
          color: #fff;
          border-color: #2563eb;
        }
        .follow-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .report-btn {
          padding: 0.5rem 1rem;
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fca5a5;
          border-radius: 4px;
          cursor: pointer;
        }
        .suspended-banner {
          background: #fef3cd;
          color: #92400e;
          padding: 1rem;
          border-radius: 6px;
          margin-bottom: 1rem;
        }
        .suspended-banner p { margin: 0.25rem 0 0; }
        .hidden-banner {
          background: #e0e7ff;
          color: #4338ca;
          padding: 1rem;
          border-radius: 6px;
          margin-bottom: 1rem;
        }
        .removed-banner {
          padding: 2rem;
          background: #f3f4f6;
          color: #6b7280;
          border-radius: 6px;
          text-align: center;
        }
        .loading-banner,
        .error-banner {
          padding: 1.5rem;
          border-radius: 6px;
          text-align: center;
        }
        .loading-banner { background: #f3f4f6; color: #6b7280; }
        .error-banner { background: #fee2e2; color: #991b1b; }
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          border: 0;
        }
        .report-modal {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .report-modal-content {
          background: #fff;
          padding: 1.5rem;
          border-radius: 8px;
          max-width: 400px;
          width: 90%;
        }
      `}</style>
    </div>
  );
}

type ReportModalProps = Readonly<{
  onClose: () => void;
  onSubmit: (reason: string, description: string) => void;
}>;

function ReportModal(props: ReportModalProps): ReactElement {
  const [reason, setReason] = useState('SPAM');
  const [description, setDescription] = useState('');

  return (
    <div
      className="report-modal"
      role="dialog"
      aria-modal
      aria-labelledby="report-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) props.onClose();
      }}
    >
      <div className="report-modal-content">
        <h3 id="report-modal-title">รายงานโปรไฟล์</h3>
        <label>
          เหตุผล
          <select value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="SPAM">สแปม</option>
            <option value="HARASSMENT">การคุกคาม</option>
            <option value="INAPPROPRIATE_CONTENT">เนื้อหาไม่เหมาะสม</option>
            <option value="FRAUD">การฉ้อโกง</option>
            <option value="IMPERSONATION">การแอบอ้าง</option>
            <option value="OTHER">อื่นๆ</option>
          </select>
        </label>
        <label>
          รายละเอียดเพิ่มเติม
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            justifyContent: 'flex-end',
            marginTop: '0.75rem',
          }}
        >
          <button
            type="button"
            onClick={props.onClose}
            style={{
              padding: '0.375rem 0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              background: '#fff',
            }}
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={() => props.onSubmit(reason, description)}
            style={{
              padding: '0.375rem 0.75rem',
              border: 'none',
              borderRadius: '4px',
              background: '#dc2626',
              color: '#fff',
            }}
          >
            ส่งรายงาน
          </button>
        </div>
      </div>
    </div>
  );
}

void demoSuspendedCreator;
