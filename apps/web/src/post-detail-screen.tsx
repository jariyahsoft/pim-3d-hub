'use client';

import { useState, type ReactElement } from 'react';
import {
  demoComments,
  demoPostDetail,
  emptyComments,
} from './post-detail-screen-demo.js';
import type { PostDto } from '@pim/application';

export type CommentItem = {
  authorId: string;
  authorName: string;
  body: string;
  commentId: string;
  postedAt: string;
};

export type PostDetailScreenProps = Readonly<{
  comments?: readonly CommentItem[];
  initialErrorMessage?: string | null;
  initialLoading?: boolean;
  post?: PostDto;
  onReport?: (postId: string) => void;
  onSubmitComment?: (body: string) => Promise<void>;
}>;

export function PostDetailScreen(props: PostDetailScreenProps): ReactElement {
  const post = props.post ?? demoPostDetail;
  const comments = props.comments ?? emptyComments;
  const [loading] = useState(props.initialLoading ?? false);
  const [errorMessage] = useState(props.initialErrorMessage ?? null);
  const [commentDraft, setCommentDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="post-detail">
        <div role="status" aria-live="polite" className="loading-banner">
          กำลังโหลดโพสต์...
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="post-detail">
        <div role="alert" className="error-banner">
          {errorMessage}
        </div>
      </div>
    );
  }

  // Removed / Hidden / Draft should not be visible to public viewers
  if (
    post.status === 'REMOVED' ||
    post.status === 'HIDDEN' ||
    post.status === 'DRAFT'
  ) {
    return (
      <div className="post-detail">
        <div className="blocked" role="status">
          <h2>โพสต์นี้ไม่พร้อมใช้งาน</h2>
          <p>โพสต์นี้ถูกซ่อนหรือลบโดยเจ้าของหรือผู้ดูแล</p>
        </div>
      </div>
    );
  }

  async function handleSubmitComment(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!commentDraft.trim() || !props.onSubmitComment) return;
    setSubmitting(true);
    try {
      await props.onSubmitComment(commentDraft);
      setCommentDraft('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="post-detail">
      <article className="post" aria-labelledby="post-heading">
        <header className="post-header">
          <h2 id="post-heading">{post.type}</h2>
          <p className="post-meta">
            เผยแพร่เมื่อ {post.publishedAt?.slice(0, 10) ?? '-'}
          </p>
        </header>

        {post.media.length > 0 && (
          <div
            className="post-media"
            role="region"
            aria-label="รูปภาพประกอบโพสต์"
          >
            {post.media.map((m, i) => (
              <figure key={String(m.assetId ?? i)} className="post-media-item">
                <div
                  className="post-media-placeholder"
                  role="img"
                  aria-label={m.altText}
                >
                  [สื่อ]
                </div>
                <figcaption>{m.altText}</figcaption>
              </figure>
            ))}
          </div>
        )}

        <p className="post-caption">{post.caption}</p>

        <div className="post-actions">
          <button
            type="button"
            className="action-btn"
            onClick={() => props.onReport?.(String(post.id))}
          >
            รายงานโพสต์
          </button>
        </div>
      </article>

      <section className="comments-section" aria-label="ความเห็น">
        <h3>ความเห็น ({comments.length})</h3>

        {comments.length === 0 ? (
          <p className="empty-comments">ยังไม่มีความเห็น</p>
        ) : (
          <ul className="comment-list" role="list">
            {(comments as readonly CommentItem[]).map((c) => (
              <li key={c.commentId} className="comment-item">
                <header>
                  <strong>{c.authorName}</strong>
                  <time dateTime={c.postedAt}>{c.postedAt.slice(0, 10)}</time>
                </header>
                <p>{c.body}</p>
              </li>
            ))}
          </ul>
        )}

        {props.onSubmitComment && (
          <form
            className="comment-form"
            aria-label="ส่งความเห็น"
            onSubmit={handleSubmitComment}
          >
            <label htmlFor="comment-textarea">แสดงความคิดเห็น</label>
            <textarea
              id="comment-textarea"
              rows={3}
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              aria-required
            />
            <button
              type="submit"
              className="submit-btn"
              disabled={submitting || !commentDraft.trim()}
            >
              {submitting ? 'กำลังส่ง...' : 'ส่งความเห็น'}
            </button>
          </form>
        )}
      </section>

      <style>{`
        .post-detail {
          max-width: 720px;
          margin: 0 auto;
          padding: 1.5rem;
          font-family: system-ui, sans-serif;
        }
        .post {
          background: #fff;
          border: 1px solid #e1e5eb;
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1rem;
        }
        .post-header h2 { margin: 0 0 0.25rem; }
        .post-meta { color: #6b7280; font-size: 0.875rem; margin: 0; }
        .post-media {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 0.75rem;
          margin: 1rem 0;
        }
        .post-media-item { margin: 0; }
        .post-media-placeholder {
          padding: 4rem 1rem;
          background: #f3f4f6;
          text-align: center;
          border-radius: 4px;
          color: #6b7280;
        }
        .post-media-item figcaption {
          font-size: 0.75rem;
          color: #4b5563;
          text-align: center;
          margin-top: 0.375rem;
        }
        .post-caption {
          line-height: 1.5;
          margin: 1rem 0;
        }
        .post-actions {
          border-top: 1px solid #f3f4f6;
          padding-top: 0.75rem;
        }
        .action-btn {
          padding: 0.375rem 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          background: #fff;
          font-size: 0.875rem;
          cursor: pointer;
        }
        .action-btn:hover { background: #f9fafb; }
        .comments-section {
          background: #fff;
          border: 1px solid #e1e5eb;
          border-radius: 8px;
          padding: 1rem;
        }
        .comments-section h3 { margin: 0 0 1rem; font-size: 1.125rem; }
        .empty-comments {
          color: #6b7280;
          font-style: italic;
        }
        .comment-list {
          list-style: none;
          padding: 0;
          margin: 0 0 1rem;
        }
        .comment-item {
          padding: 0.75rem;
          border-bottom: 1px solid #f3f4f6;
        }
        .comment-item:last-child { border-bottom: none; }
        .comment-item header {
          display: flex;
          justify-content: space-between;
          font-size: 0.875rem;
          margin-bottom: 0.25rem;
        }
        .comment-item time { color: #6b7280; }
        .comment-item p { margin: 0; line-height: 1.5; }
        .comment-form {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .comment-form label { font-size: 0.875rem; font-weight: 500; }
        .comment-form textarea {
          padding: 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 1rem;
          font-family: inherit;
        }
        .submit-btn {
          align-self: flex-end;
          padding: 0.5rem 1rem;
          background: #2563eb;
          color: #fff;
          border: none;
          border-radius: 4px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
        }
        .submit-btn:hover:not(:disabled) { background: #1d4ed8; }
        .submit-btn:disabled {
          background: #cbd5e1;
          cursor: not-allowed;
        }
        .loading-banner,
        .error-banner,
        .blocked {
          padding: 1.5rem;
          border-radius: 6px;
          text-align: center;
        }
        .loading-banner {
          background: #f3f4f6;
          color: #6b7280;
        }
        .error-banner { background: #fee2e2; color: #991b1b; }
        .blocked { background: #fff7ed; color: #6b7280; }
      `}</style>
    </div>
  );
}

// Re-export for convenience in tests
export { demoPostDetail, demoComments };
