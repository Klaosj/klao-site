// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ThumbBar from '@/components/ThumbBar';
import { dict } from '@/lib/dictionary';
import { FakeIO, installFakeIO } from './helpers/io';
import { makeProfile } from './helpers/profile';

vi.mock('next/navigation', () => ({ usePathname: vi.fn(() => '/en') }));

beforeEach(() => {
  installFakeIO();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.mocked(usePathname).mockReturnValue('/en');
});

const bar = () => screen.getByRole('region', { name: dict.en.navQuickActions });
const rect = (top: number) => ({ top }) as DOMRectReadOnly;

describe('ThumbBar', () => {
  it('holds the two phone actions: start a conversation, and the résumé in a new tab', () => {
    render(<ThumbBar locale="en" profile={makeProfile()} heroGone={false} />);
    const links = Array.from(bar().querySelectorAll('a'));
    expect(links.map((a) => a.textContent)).toEqual([dict.en.startConversation, dict.en.resumeShort]);
    expect(links[0].getAttribute('href')).toBe('mailto:klao@example.com?subject=Hello%20from%20klao-site');
    expect(links[1].getAttribute('href')).toBe('/resume.pdf');
    expect(links[1].getAttribute('target')).toBe('_blank');
    expect(bar().classList.contains('glass')).toBe(true);
  });

  it("stays hidden while the hero's own buttons are on screen", () => {
    render(<ThumbBar locale="en" profile={makeProfile()} heroGone={false} />);
    expect(bar().hasAttribute('data-show')).toBe(false);
  });

  it("shows once the hero's buttons have scrolled away", () => {
    render(<ThumbBar locale="en" profile={makeProfile()} heroGone />);
    expect(bar().hasAttribute('data-show')).toBe(true);
  });

  it('steps aside while the contact section, which repeats both actions, is on screen', () => {
    render(
      <>
        <section id="contact" />
        <ThumbBar locale="en" profile={makeProfile()} heroGone />
      </>,
    );
    const contact = document.getElementById('contact')!;
    const io = FakeIO.watching(contact);
    expect(io.options.threshold).toEqual([0, 0.3, 0.6]);
    io.fire([{ target: contact, intersectionRatio: 0.5, isIntersecting: true, boundingClientRect: rect(200) }]);
    expect(bar().hasAttribute('data-show')).toBe(false);
    io.fire([{ target: contact, intersectionRatio: 0, isIntersecting: false, boundingClientRect: rect(2000) }]);
    expect(bar().hasAttribute('data-show')).toBe(true);
  });

  it('counts a tall contact section as on screen once its top passes 70 % of the viewport', () => {
    render(
      <>
        <section id="contact" />
        <ThumbBar locale="en" profile={makeProfile()} heroGone />
      </>,
    );
    const contact = document.getElementById('contact')!;
    FakeIO.watching(contact).fire([{ target: contact, intersectionRatio: 0.1, isIntersecting: true, boundingClientRect: rect(100) }]);
    expect(bar().hasAttribute('data-show')).toBe(false);
  });

  it('steps aside while the on-screen keyboard takes the bottom of the viewport', () => {
    const vv = Object.assign(new EventTarget(), { height: 800 });
    vi.stubGlobal('visualViewport', vv);
    render(<ThumbBar locale="en" profile={makeProfile()} heroGone />);
    expect(bar().hasAttribute('data-show')).toBe(true);
    vv.height = 300; // jsdom's innerHeight is 768: under 75 % means a keyboard is up
    act(() => {
      vv.dispatchEvent(new Event('resize'));
    });
    expect(bar().hasAttribute('data-show')).toBe(false);
  });

  it('renders nothing without an email or a résumé to offer', () => {
    const { container } = render(<ThumbBar locale="en" profile={makeProfile({ email: '', resumeUrl: null })} heroGone />);
    expect(container.innerHTML).toBe('');
  });

  it('speaks Thai', () => {
    render(<ThumbBar locale="th" profile={makeProfile()} heroGone />);
    const region = screen.getByRole('region', { name: dict.th.navQuickActions });
    expect(Array.from(region.querySelectorAll('a')).map((a) => a.textContent)).toEqual([dict.th.startConversation, dict.th.resumeShort]);
  });
});
