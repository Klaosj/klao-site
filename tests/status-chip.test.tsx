// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import StatusChip from '@/components/StatusChip';
import { installFakeIO } from './helpers/io';
import { stubMatchMedia } from './helpers/media';

afterEach(cleanup);

// Ruling C-11: every test file stubs matchMedia/IntersectionObserver in beforeEach, even one
// whose component never calls either (StatusChip is server-safe, no hooks) -- it's the repo
// convention, not a per-test need (see tests/hero.test.tsx). The observer is P1's shared FakeIO
// and matchMedia P1's stubMatchMedia (tests/helpers/media.ts, swapped in at the wave-2 merge).
beforeEach(() => {
  stubMatchMedia();
  installFakeIO();
});

const status = { en: 'Live · since Aug 2026', th: 'เปิดใช้งานแล้ว · ตั้งแต่ ส.ค. 2026' };

describe('StatusChip', () => {
  it.each([
    ['live', 'live'],
    ['proto', 'proto'],
    ['pitched', 'ring'],
    ['finalist', 'ring'],
  ] as const)('%s renders the word with a %s mark hidden from assistive tech', (statusKey, mark) => {
    const { container } = render(<StatusChip project={{ statusKey, status }} locale="en" />);
    expect(container.querySelector('.st-chip')?.textContent).toBe(status.en);
    const mk = container.querySelector('.st-mk');
    expect(mk?.getAttribute('data-mark')).toBe(mark);
    expect(mk?.getAttribute('aria-hidden')).toBe('true');
  });

  it('shows the word without a mark when StatusKey is empty', () => {
    const { container } = render(<StatusChip project={{ statusKey: null, status }} locale="en" />);
    expect(container.querySelector('.st-chip')?.textContent).toBe(status.en);
    expect(container.querySelector('.st-mk')).toBeNull();
  });

  it('renders nothing without a status word (pre-migration rows)', () => {
    const { container } = render(<StatusChip project={{ statusKey: 'live', status: null }} locale="en" />);
    expect(container.innerHTML).toBe('');
  });

  it('switches the word to Thai', () => {
    const { container } = render(<StatusChip project={{ statusKey: 'live', status }} locale="th" />);
    expect(container.querySelector('.st-chip')?.textContent).toBe(status.th);
  });
});
