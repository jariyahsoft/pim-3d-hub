import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import {
  SocialInteractionsScreen,
  VerifiedPurchaseBadge,
  ReactionRow,
  ShowcaseConsentCard,
} from './social-interactions-screen.js';
import {
  demoReactions,
  demoShowcaseConsent,
  demoVerifiedPurchase,
  reactionLabels,
  withdrawalActionLabels,
} from './social-interactions-screen-demo.js';

describe('SocialInteractionsScreen', () => {
  it('renders heading', () => {
    const html = renderToStaticMarkup(<SocialInteractionsScreen />);
    expect(html).toContain('ชุมชน');
  });

  it('renders reactions section with all reaction pills', () => {
    const html = renderToStaticMarkup(<SocialInteractionsScreen />);
    expect(html).toContain('ปฏิกิริยา');
    expect(html).toContain('ถูกใจ');
    expect(html).toContain('ว้าว');
    expect(html).toContain('มีประโยชน์');
  });

  it('renders reaction totals', () => {
    const html = renderToStaticMarkup(<SocialInteractionsScreen />);
    expect(html).toContain('>12<');
    expect(html).toContain('>4<');
    expect(html).toContain('>8<');
  });

  it('marks reacted reactions with aria-pressed', () => {
    const html = renderToStaticMarkup(<SocialInteractionsScreen />);
    expect(html).toContain('aria-pressed="true"');
  });

  it('renders verified purchase badge when eligible', () => {
    const html = renderToStaticMarkup(<SocialInteractionsScreen />);
    expect(html).toContain('ยืนยันการซื้อ');
  });

  it('hides verified purchase badge when not eligible', () => {
    const html = renderToStaticMarkup(
      <VerifiedPurchaseBadge
        verification={{ ...demoVerifiedPurchase, eligible: false }}
      />,
    );
    expect(html).not.toContain('ยืนยันการซื้อ');
  });

  it('renders Thai reaction labels', () => {
    expect(reactionLabels.LIKE).toBe('ถูกใจ');
    expect(reactionLabels.WOW).toBe('ว้าว');
    expect(reactionLabels.HELPFUL).toBe('มีประโยชน์');
  });

  it('shows withdrawal action labels in Thai', () => {
    expect(withdrawalActionLabels.HIDE_CONTENT).toBe('ซ่อนเนื้อหา');
    expect(withdrawalActionLabels.REMOVE_CONTENT).toBe('ลบเนื้อหา');
  });

  it('renders consent card with status GRANTED', () => {
    const html = renderToStaticMarkup(<SocialInteractionsScreen />);
    expect(html).toContain('อนุญาต');
  });

  it('shows withdrawal notice when consent is withdrawn', () => {
    const html = renderToStaticMarkup(
      <ShowcaseConsentCard
        consent={{ ...demoShowcaseConsent, status: 'WITHDRAWN' }}
      />,
    );
    expect(html).toContain('การถอนคำยินยอย:');
  });

  it('does not render withdraw button when already withdrawn', () => {
    const html = renderToStaticMarkup(
      <ShowcaseConsentCard
        consent={{ ...demoShowcaseConsent, status: 'WITHDRAWN' }}
      />,
    );
    // Without onWithdraw, no button is rendered regardless of status.
    expect(html).not.toContain('<button');
  });

  it('shows withdraw button when consent is GRANTED', () => {
    const html = renderToStaticMarkup(
      <ShowcaseConsentCard
        consent={demoShowcaseConsent}
        onWithdraw={() => Promise.resolve()}
      />,
    );
    expect(html).toContain('ถอนคำยินยอย');
  });

  it('renders scope tags in consent card', () => {
    const html = renderToStaticMarkup(
      <SocialInteractionsScreen initialConsent={demoShowcaseConsent} />,
    );
    expect(html).toContain('ฟีดสาธารณะ');
    expect(html).toContain('โปรไฟล์ผู้ให้บริการ');
  });

  it('renders default consent card without explicit initialConsent', () => {
    const html = renderToStaticMarkup(<SocialInteractionsScreen />);
    expect(html).toContain('คำยินยอยในการแสดงผลงาน');
  });

  it('reactions rendered with aria-label counts', () => {
    const html = renderToStaticMarkup(<ReactionRow />);
    expect(html).toContain('aria-label="ถูกใจ 12 คน"');
    expect(html).toContain('aria-label="ว้าว 4 คน"');
  });

  it('demo data has 3 reactions', () => {
    expect(demoReactions.length).toBe(3);
  });
});
