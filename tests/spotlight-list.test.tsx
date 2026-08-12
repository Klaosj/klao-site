// @vitest-environment jsdom
// Copies the top-of-file setup style from tests/reveal.test.tsx: SpotlightList
// (like Reveal) reads global `matchMedia` directly, which jsdom does not
// implement -- unmocked, the effect throws on mount.
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import SpotlightList from '@/components/motion/SpotlightList';

const LINES = ['Alpha.', 'Beta.', 'Gamma.'] as const;

afterEach(cleanup);

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
});

it('renders every line as a list item', () => {
  render(<SpotlightList lines={LINES} />);
  expect(screen.getAllByRole('listitem')).toHaveLength(3);
});

it('emphasizes the first line before any scroll', () => {
  render(<SpotlightList lines={LINES} />);
  const items = screen.getAllByRole('listitem');
  expect(items[0].classList.contains('spot-on')).toBe(true);
  expect(items[1].classList.contains('spot-on')).toBe(false);
});
