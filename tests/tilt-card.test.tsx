// @vitest-environment jsdom
// Only this file needs a DOM (Testing Library's `render`); the rest of the
// suite stays on the default `node` environment set in vitest.config.ts --
// same convention as tests/reveal.test.tsx for the sibling motion component.
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import TiltCard from '@/components/motion/TiltCard';

it('renders children inside the tilt wrapper', () => {
  render(<TiltCard><p>content</p></TiltCard>);
  expect(screen.getByText('content')).toBeTruthy();
  expect(screen.getByText('content').closest('[data-tilt]')).not.toBeNull();
});
