import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { PostDetailScreen } from './post-detail-screen.js';
import { demoComments, demoPostDetail } from './post-detail-screen-demo.js';

describe('PostDetailScreen', () => {
  it('renders the caption', () => {
    const html = renderToStaticMarkup(
      <PostDetailScreen post={demoPostDetail} comments={demoComments} />,
    );
    expect(html).toContain('เสร็จเรียบร้อย');
  });

  it('renders alt text for each media item', () => {
    const html = renderToStaticMarkup(
      <PostDetailScreen post={demoPostDetail} comments={demoComments} />,
    );
    expect(html).toContain('Bracket สีดำที่พิมพ์สำเร็จ');
    expect(html).toContain('Bracket สีดำด้านหลัง');
  });

  it('renders comments list', () => {
    const html = renderToStaticMarkup(
      <PostDetailScreen post={demoPostDetail} comments={demoComments} />,
    );
    expect(html).toContain('Nattapong P.');
    expect(html).toContain('Waranya K.');
    expect(html).toContain('งานดีมากครับ');
  });

  it('renders empty comments state', () => {
    const html = renderToStaticMarkup(
      <PostDetailScreen post={demoPostDetail} comments={[]} />,
    );
    expect(html).toContain('ยังไม่มีความเห็น');
  });

  it('renders blocked state for HIDDEN post', () => {
    const hiddenPost = { ...demoPostDetail, status: 'HIDDEN' as const };
    const html = renderToStaticMarkup(
      <PostDetailScreen post={hiddenPost} comments={[]} />,
    );
    expect(html).toContain('โพสต์นี้ไม่พร้อมใช้งาน');
  });

  it('renders blocked state for REMOVED post', () => {
    const removedPost = { ...demoPostDetail, status: 'REMOVED' as const };
    const html = renderToStaticMarkup(
      <PostDetailScreen post={removedPost} comments={[]} />,
    );
    expect(html).toContain('โพสต์นี้ไม่พร้อมใช้งาน');
  });

  it('renders blocked state for DRAFT post', () => {
    const draftPost = { ...demoPostDetail, status: 'DRAFT' as const };
    const html = renderToStaticMarkup(
      <PostDetailScreen post={draftPost} comments={[]} />,
    );
    expect(html).toContain('โพสต์นี้ไม่พร้อมใช้งาน');
  });

  it('renders loading banner', () => {
    const html = renderToStaticMarkup(<PostDetailScreen initialLoading />);
    expect(html).toContain('กำลังโหลดโพสต์');
  });

  it('renders error banner', () => {
    const html = renderToStaticMarkup(
      <PostDetailScreen initialErrorMessage="โหลดไม่สำเร็จ" />,
    );
    expect(html).toContain('โหลดไม่สำเร็จ');
  });

  it('renders comment form when onSubmitComment provided', () => {
    const html = renderToStaticMarkup(
      <PostDetailScreen
        post={demoPostDetail}
        comments={demoComments}
        onSubmitComment={async () => {}}
      />,
    );
    expect(html).toContain('ส่งความเห็น');
  });

  it('hides comment form when no onSubmitComment', () => {
    const html = renderToStaticMarkup(
      <PostDetailScreen post={demoPostDetail} comments={demoComments} />,
    );
    expect(html).not.toContain('แสดงความคิดเห็น');
  });
});
