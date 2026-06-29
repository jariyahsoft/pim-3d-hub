'use client';

import { useState, type ReactElement } from 'react';
import { emptyFeedCards, formatPublishedRelative } from './feed-screen-demo.js';
import type { FeedCard } from '@pim/application';

export type FeedScreenProps = Readonly<{
  initialCards?: readonly FeedCard[];
  initialErrorMessage?: string | null;
  initialLoading?: boolean;
  onLoadMore?: () => Promise<readonly FeedCard[]>;
  onReport?: (postId: string) => void;
}>;

export function FeedScreen(props: FeedScreenProps): ReactElement {
  const cards = props.initialCards ?? emptyFeedCards;
  const [loading] = useState(props.initialLoading ?? false);
  const [errorMessage] = useState(props.initialErrorMessage ?? null);
  const [announcement, setAnnouncement] = useState('');

  if (errorMessage) {
    return (
      <div className="feed-screen">
        <div role="alert" className="error-banner">
          {errorMessage}
          <button type="button" onClick={() => location.reload()}>
            ลองอีกครั้ง
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="feed-screen">
        <div className="loading-banner" role="status" aria-live="polite">
          กำลังโหลดฟีด...
        </div>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="feed-screen">
        <div className="empty-state" role="status">
          <h2>ยังไม่มีโพสต์ในฟีด</h2>
          <p>ติดตามผู้ให้บริการหรือเพื่อนเพื่อดูโพสต์ใหม่ๆ</p>
        </div>
      </div>
    );
  }

  return (
    <div className="feed-screen">
      <h2>ฟีด</h2>
      <div className="feed-list" role="feed" aria-label="ฟีดโพสต์ล่าสุด">
        {cards.map((card) => (
          <FeedCardItem
            key={card.postId}
            card={card}
            onReport={() => props.onReport?.(String(card.postId))}
            onReact={(kind) => {
              setAnnouncement(`ส่ง ${kind} แล้ว`);
            }}
          />
        ))}
      </div>
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>

      {props.onLoadMore && (
        <button
          type="button"
          className="load-more-btn"
          onClick={() => props.onLoadMore?.()}
        >
          โหลดโพสต์เพิ่ม
        </button>
      )}

      <style>{`
        .feed-screen {
          max-width: 720px;
          margin: 0 auto;
          padding: 1.5rem;
          font-family: system-ui, sans-serif;
        }
        .feed-screen h2 { margin: 0 0 1rem; }
        .feed-list { display: flex; flex-direction: column; gap: 1rem; }
        .feed-card {
          background: #fff;
          border: 1px solid #e1e5eb;
          border-radius: 8px;
          overflow: hidden;
        }
        .feed-card-author {
          padding: 0.75rem 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .author-name { font-weight: 600; }
        .verified-badge {
          background: #16a34a;
          color: #fff;
          padding: 0.125rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
        }
        .sponsored-badge {
          background: #f97316;
          color: #fff;
          padding: 0.125rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
        }
        .sponsored-note {
          padding: 0 1rem 0.5rem;
          font-size: 0.75rem;
          color: #6b7280;
          font-style: italic;
        }
        .feed-card-media {
          padding: 1rem;
          background: #f3f4f6;
          text-align: center;
          color: #6b7280;
          font-size: 0.875rem;
        }
        .feed-card-media-label {
          display: inline-block;
          padding: 2rem;
        }
        .feed-card-caption {
          padding: 0 1rem 0.75rem;
          font-size: 0.875rem;
          line-height: 1.5;
        }
        .feed-card-meta {
          padding: 0.5rem 1rem;
          border-top: 1px solid #f3f4f6;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.875rem;
        }
        .feed-card-actions {
          padding: 0.5rem 1rem;
          border-top: 1px solid #f3f4f6;
          display: flex;
          gap: 0.5rem;
        }
        .action-btn {
          flex: 1;
          padding: 0.375rem;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          background: #fff;
          font-size: 0.875rem;
          cursor: pointer;
        }
        .action-btn:hover { background: #f9fafb; }
        .empty-state {
          text-align: center;
          padding: 4rem 1rem;
          color: #6b7280;
        }
        .loading-banner,
        .error-banner {
          padding: 1rem;
          border-radius: 6px;
          text-align: center;
        }
        .loading-banner {
          background: #f3f4f6;
          color: #6b7280;
        }
        .error-banner {
          background: #fee2e2;
          color: #991b1b;
        }
        .load-more-btn {
          display: block;
          margin: 1.5rem auto 0;
          padding: 0.5rem 1.25rem;
          background: #fff;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.875rem;
          cursor: pointer;
        }
        .load-more-btn:hover { background: #f9fafb; }
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
      `}</style>
    </div>
  );
}

type FeedCardItemProps = Readonly<{
  card: FeedCard;
  onReact?: (kind: 'LIKE' | 'WOW' | 'HELPFUL') => void;
  onReport?: () => void;
}>;

function FeedCardItem(props: FeedCardItemProps): ReactElement {
  const { card, onReact, onReport } = props;
  const totalReactions = Object.values(card.reactionsSummary).reduce(
    (sum, n) => sum + n,
    0,
  );

  return (
    <article
      className="feed-card"
      aria-labelledby={`post-${card.postId}-author`}
    >
      <header className="feed-card-author">
        <span id={`post-${card.postId}-author`} className="author-name">
          {card.authorDisplayName}
        </span>
        <span style={{ display: 'flex', gap: '0.375rem' }}>
          {card.authorBadgeVerified && (
            <span className="verified-badge" aria-label="ยืนยันแล้ว">
              ✓ ยืนยัน
            </span>
          )}
          {card.sponsored && (
            <span
              className="sponsored-badge"
              role="note"
              aria-label="โพสต์ที่ได้รับการส่งเสริม"
            >
              โฆษณา
            </span>
          )}
        </span>
      </header>

      {card.sponsored && (
        <p className="sponsored-note">
          โพสต์นี้ได้รับการส่งเสริม — คะแนนและความน่าเชื่อถือไม่ได้รับผลกระทบ
        </p>
      )}

      {card.hasMedia && (
        <div
          className="feed-card-media"
          role="img"
          aria-label={card.altTextSummary}
        >
          <div className="feed-card-media-label">
            [รูปภาพ] {card.altTextSummary}
          </div>
        </div>
      )}

      <p className="feed-card-caption">{card.captionPreview}</p>

      <div className="feed-card-meta">
        <span>{formatPublishedRelative(card.publishedAt)}</span>
        <span>
          {totalReactions} คนกด · {card.commentsCount} ความเห็น
        </span>
      </div>

      <div className="feed-card-actions">
        <button
          type="button"
          className="action-btn"
          onClick={() => onReact?.('LIKE')}
          aria-label="กดถูกใจ"
        >
          ถูกใจ
        </button>
        <button
          type="button"
          className="action-btn"
          onClick={() => onReact?.('HELPFUL')}
          aria-label="กดมีประโยชน์"
        >
          มีประโยชน์
        </button>
        <button
          type="button"
          className="action-btn"
          onClick={onReport}
          aria-label="รายงานโพสต์"
        >
          รายงาน
        </button>
      </div>
    </article>
  );
}
