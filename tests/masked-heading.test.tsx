// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MaskedHeading from '@/components/motion/MaskedHeading';

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('IntersectionObserver', class {
    observe() {} unobserve() {} disconnect() {}
  });
});

describe('MaskedHeading', () => {
  it('splits into one span per word without losing the sentence', () => {
    const { container } = render(<MaskedHeading text="I close the deal" level={1} />);
    expect(container.querySelectorAll('.w')).toHaveLength(4);
    expect(container.textContent?.replace(/\s+/g, ' ').trim()).toBe('I close the deal');
  });

  it('puts the mask on a wrapper, never on the observed element itself', () => {
    // Chrome folds an element's own clip into its intersection rect, so a
    // clipped element reports 0% visible and the observer never fires it.
    const { container } = render(<MaskedHeading text="two words" />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain('rv-mask');
    expect(wrapper.style.clipPath).toBe('');
    expect(wrapper.querySelector('h2')).toBeTruthy();
  });

  it('renders the requested heading level', () => {
    const { container } = render(<MaskedHeading text="x" level={1} />);
    expect(container.querySelector('h1')).toBeTruthy();
  });
});
