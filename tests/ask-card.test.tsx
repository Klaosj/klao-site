// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AskCard from '@/components/palette/AskCard';
import type { AskAnswer } from '@/lib/ask';

afterEach(cleanup);

// Re-review round 1, Minor D. Today's real askDeclined/askTrust TH copy
// carries no Thai keep-list word (src/lib/thai.ts THAI_KEEP), so a test
// against the real dictionary can't tell ThaiText's wrapping apart from a
// bare string there -- the reviewer's own mutation check found exactly this
// gap (reverting ThaiText in the decline <p> and the trust line still
// passed every existing test). This mocks just those two Thai strings with
// a keep-list word inserted, so the wrapping itself is what's under test,
// not today's particular copy.
vi.mock('@/lib/dictionary', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/dictionary')>();
  return {
    ...actual,
    dict: {
      ...actual.dict,
      th: {
        ...actual.dict.th,
        askDeclined: 'ทดสอบคำโปรเจกต์ต่อ {email}',
        askTrust: 'ทดสอบข้อความโปรเจกต์ตัวอย่าง',
      },
    },
  };
});

const decline: AskAnswer = { kind: 'decline', query: 'ทดสอบ', lang: 'th' };

function renderCard() {
  return render(
    <AskCard
      answer={decline}
      email="real@example.com"
      locale="th"
      copyState="idle"
      onBack={() => {}}
      onGo={() => {}}
      onCopyEmail={() => {}}
    />,
  );
}

describe('AskCard Thai wrapping (re-review Minor D)', () => {
  it('wraps a keep-list word in the decline line with an .nw span', () => {
    const { container } = renderCard();
    const declineP = container.querySelector('.ask-decl p');
    expect(declineP?.querySelector('.nw')?.textContent).toBe('โปรเจกต์');
  });

  it('wraps a keep-list word in the trust line with an .nw span', () => {
    const { container } = renderCard();
    const trust = container.querySelector('.ask-trust');
    expect(trust?.querySelector('.nw')?.textContent).toBe('โปรเจกต์');
  });
});
