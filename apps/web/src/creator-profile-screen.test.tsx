import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { CreatorProfileScreen } from './creator-profile-screen.js';
import {
  demoCreatorProfile,
  demoSuspendedCreator,
  platformLabels,
} from './creator-profile-screen-demo.js';

describe('CreatorProfileScreen', () => {
  it('renders the heading with display name', () => {
    const html = renderToStaticMarkup(<CreatorProfileScreen />);
    expect(html).toContain('Bangkok Print Lab');
  });

  it('renders bio and province', () => {
    const html = renderToStaticMarkup(<CreatorProfileScreen />);
    expect(html).toContain('รับงาน PLA/PETG/ABS');
    expect(html).toContain('กรุงเทพมหานคร');
  });

  it('shows public stats (posts, products, rating)', () => {
    const html = renderToStaticMarkup(<CreatorProfileScreen />);
    expect(html).toContain('24'); // posts
    expect(html).toContain('8'); // products
    expect(html).toContain('4.8'); // rating
  });

  it('renders social links with proper labels', () => {
    const html = renderToStaticMarkup(<CreatorProfileScreen />);
    expect(html).toContain('เว็บไซต์');
    expect(html).toContain('Instagram');
    expect(html).toContain('href="https://example.com"');
  });

  it('renders privacy note (no contact/KYC leaked)', () => {
    const html = renderToStaticMarkup(<CreatorProfileScreen />);
    expect(html).toContain('ข้อมูลติดต่อโดยตรง');
  });

  it('renders follow button when handler provided', () => {
    const html = renderToStaticMarkup(
      <CreatorProfileScreen onFollowToggle={() => Promise.resolve()} />,
    );
    expect(html).toContain('ติดตาม');
  });

  it('renders report button when handler provided', () => {
    const html = renderToStaticMarkup(
      <CreatorProfileScreen onReport={() => {}} />,
    );
    expect(html).toContain('รายงานโปรไฟล์');
  });

  it('does not render report button for SUSPENDED creator', () => {
    const html = renderToStaticMarkup(
      <CreatorProfileScreen
        initialProfile={demoSuspendedCreator}
        onReport={() => {}}
      />,
    );
    expect(html).toContain('ระงับ');
    expect(html).not.toContain('รายงานโปรไฟล์');
  });

  it('renders suspended banner with reason and date', () => {
    const html = renderToStaticMarkup(
      <CreatorProfileScreen initialProfile={demoSuspendedCreator} />,
    );
    expect(html).toContain('ละเมิดข้อกำหนดการใช้งาน');
    expect(html).toContain('2026-12-31');
  });

  it('shows removed-banner for REMOVED profile', () => {
    const html = renderToStaticMarkup(
      <CreatorProfileScreen
        initialProfile={{ ...demoCreatorProfile, visibility: 'REMOVED' }}
      />,
    );
    expect(html).toContain('โปรไฟล์นี้ถูกลบแล้ว');
  });

  it('shows hidden banner for PUBLIC_HIDDEN profile', () => {
    const html = renderToStaticMarkup(
      <CreatorProfileScreen
        initialProfile={{ ...demoCreatorProfile, visibility: 'PUBLIC_HIDDEN' }}
      />,
    );
    expect(html).toContain('โปรไฟล์นี้ถูกซ่อน');
  });

  it('renders loading banner', () => {
    const html = renderToStaticMarkup(<CreatorProfileScreen initialLoading />);
    expect(html).toContain('กำลังโหลดโปรไฟล์');
  });

  it('renders error banner with retry', () => {
    const html = renderToStaticMarkup(
      <CreatorProfileScreen initialErrorMessage="โหลดไม่สำเร็จ" />,
    );
    expect(html).toContain('โหลดไม่สำเร็จ');
  });

  it('exposes Thai platform labels', () => {
    expect(platformLabels.WEBSITE).toBe('เว็บไซต์');
    expect(platformLabels.TWITTER).toBe('Twitter');
    expect(platformLabels.INSTAGRAM).toBe('Instagram');
  });

  it('does not leak internal contact/KYC fields in public profile', () => {
    const html = renderToStaticMarkup(<CreatorProfileScreen />);
    expect(html).not.toContain('email');
    expect(html).not.toContain('phoneE164');
    expect(html).not.toContain('kyc');
    expect(html).not.toContain('address');
  });
});
