// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { Icon, ICON_NAMES, isIconName } from '@/components/icons';

afterEach(cleanup);

// The prototype's `IC` object, key for key -- the icons the new page uses.
const PROTOTYPE_KEYS = [
  'arrow-right', 'arrow-up-right', 'caret-left', 'caret-right', 'copy', 'x', 'magnifying-glass',
  'pause', 'play', 'target-duotone', 'rocket-launch-duotone', 'translate-duotone', 'wrench-duotone',
  'chart-line-up-duotone', 'key-duotone', 'file-pdf-duotone', 'envelope-duotone', 'map-pin-duotone',
  'linkedin-logo', 'github-logo', 'sun', 'moon', 'circle-half', 'command', 'check-duotone',
  'code-duotone', 'chat-circle-dots-duotone',
];

describe('Icon', () => {
  it('carries exactly the prototype icon set', () => {
    expect([...ICON_NAMES].sort()).toEqual([...PROTOTYPE_KEYS].sort());
  });

  it('renders a decorative 256-unit svg that follows the text colour and size', () => {
    const { container } = render(<Icon name="sun" />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('viewBox')).toBe('0 0 256 256');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('focusable')).toBe('false');
    expect(svg.getAttribute('fill')).toBe('currentColor');
    expect(svg.getAttribute('width')).toBe('1em');
    expect(svg.querySelectorAll('path')).toHaveLength(1);
  });

  it('draws the duotone back layer at 0.2 opacity under the solid path', () => {
    const { container } = render(<Icon name="target-duotone" />);
    const paths = container.querySelectorAll('path');
    expect(paths).toHaveLength(2);
    expect(paths[0].getAttribute('opacity')).toBe('0.2');
    expect(paths[1].hasAttribute('opacity')).toBe(false);
  });

  it('passes className through for sizing', () => {
    const { container } = render(<Icon name="copy" className="size-5" />);
    expect(container.querySelector('svg')?.getAttribute('class')).toBe('size-5');
  });

  it('renders nothing, without throwing, for a name it does not know (e.g. a Notion typo)', () => {
    expect(() => render(<Icon name="rocket" />)).not.toThrow();
    expect(renderToStaticMarkup(<Icon name="rocket" />)).toBe('');
    expect(renderToStaticMarkup(<Icon name="" />)).toBe('');
  });

  it('narrows strings with isIconName', () => {
    expect(isIconName('moon')).toBe(true);
    expect(isIconName('Moon')).toBe(false);
    expect(isIconName('toString')).toBe(false);
  });
});
