import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { FeedScreen } from './feed-screen.js';
import { demoFeedCards, formatPublishedRelative } from './feed-screen-demo.js';

describe('FeedScreen', () => {
  it('renders heading', () => {
    const html = renderToStaticMarkup(
      <FeedScreen initialCards={demoFeedCards} />,
    );
    expect(html).toContain('ฟีด');
  });

  it('shows empty state when no cards', () => {
    const html = renderToStaticMarkup(<FeedScreen initialCards={[]} />);
    expect(html).toContain('ยังไม่มีโพสต์ในฟีด');
  });

  it('renders loading banner', () => {
    const html = renderToStaticMarkup(<FeedScreen initialLoading />);
    expect(html).toContain('กำลังโหลด');
  });

  it('renders error banner with retry', () => {
    const html = renderToStaticMarkup(
      <FeedScreen initialErrorMessage="ไม่สามารถเชื่อมต่อ" />,
    );
    expect(html).toContain('ไม่สามารถเชื่อมต่อ');
    expect(html).toContain('ลองอีกครั้ง');
  });

  it('renders feed roles', () => {
    const html = renderToStaticMarkup(
      <FeedScreen initialCards={demoFeedCards} />,
    );
    expect(html).toContain('role="feed"');
  });

  it('renders all author names', () => {
    const html = renderToStaticMarkup(
      <FeedScreen initialCards={demoFeedCards} />,
    );
    expect(html).toContain('Bangkok Print Lab');
    expect(html).toContain('Fast Print Studio');
    expect(html).toContain('Maker Space Bangkok');
  });

  it('renders sponsored badge and note separately from verified', () => {
    const html = renderToStaticMarkup(
      <FeedScreen initialCards={demoFeedCards} />,
    );
    expect(html).toContain('โฆษณา');
    expect(html).toContain('โพสต์นี้ได้รับการส่งเสริม');
  });

  it('renders verified badge', () => {
    const html = renderToStaticMarkup(
      <FeedScreen initialCards={demoFeedCards} />,
    );
    expect(html).toContain('ยืนยัน');
  });

  it('renders report and react actions', () => {
    const html = renderToStaticMarkup(
      <FeedScreen initialCards={demoFeedCards} />,
    );
    expect(html).toContain('ถูกใจ');
    expect(html).toContain('มีประโยชน์');
    expect(html).toContain('รายงาน');
  });

  it('does not duplicate the same post', () => {
    const html = renderToStaticMarkup(
      <FeedScreen initialCards={demoFeedCards} />,
    );
    const matches = html.match(/Bangkok Print Lab/g) ?? [];
    expect(matches.length).toBe(1);
  });

  it('renders media placeholder when hasMedia is true', () => {
    const html = renderToStaticMarkup(
      <FeedScreen initialCards={demoFeedCards} />,
    );
    expect(html).toContain('รูปภาพ');
  });

  it('renders relative publish time', () => {
    expect(formatPublishedRelative(new Date().toISOString())).toContain('นาที');
  });
});
