// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NavMenu from '@/components/NavMenu';
import { copyShortcutHint } from '@/lib/clipboard';
import { dict } from '@/lib/dictionary';
import { PALETTE_EVENT } from '@/lib/deep-link';
import type { Locale } from '@/lib/models';
import { stubDialog } from './helpers/dialog';
import { makeProfile } from './helpers/profile';

vi.mock('next/navigation', () => ({ usePathname: vi.fn(() => '/en') }));
// P0's ThemeToggle has its own tests; here it only has to be present, in the right language.
vi.mock('@/components/ThemeToggle', async () => {
  const { createElement } = await import('react');
  return {
    default: ({ locale }: { locale: string }) => createElement('div', { 'data-testid': 'theme-toggle', 'data-locale': locale }),
  };
});

beforeEach(() => {
  stubDialog();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.mocked(usePathname).mockReturnValue('/en');
  history.replaceState(null, '', '/');
});

const menuButton = (locale: Locale = 'en') => screen.getByRole('button', { name: dict[locale].navMenu });
const openMenu = (locale: Locale = 'en') => {
  fireEvent.click(menuButton(locale));
  return document.querySelector('dialog') as HTMLDialogElement;
};

describe('NavMenu', () => {
  it('is a Menu button that opens a modal dialog and reports its state', () => {
    render(<NavMenu locale="en" profile={makeProfile()} active={null} />);
    const button = menuButton();
    expect(button.getAttribute('aria-haspopup')).toBe('dialog');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    const dialog = openMenu();
    expect(dialog.hasAttribute('open')).toBe(true);
    expect(dialog.getAttribute('aria-label')).toBe(dict.en.navMenu);
    expect(button.getAttribute('aria-controls')).toBe(dialog.id);
    expect(button.getAttribute('aria-expanded')).toBe('true');
  });

  it('lists the four sections and marks the one in view', () => {
    render(<NavMenu locale="en" profile={makeProfile()} active="career" />);
    const dialog = openMenu();
    const links = Array.from(dialog.querySelectorAll<HTMLAnchorElement>('a[data-sec]'));
    expect(links.map((a) => a.textContent)).toEqual([dict.en.navWork, dict.en.navCareer, dict.en.navStory, dict.en.navFaq]);
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['#work', '#career', '#story', '#faq']);
    expect(links[1].getAttribute('aria-current')).toBe('location');
    expect(links[0].hasAttribute('aria-current')).toBe(false);
  });

  it('points the section links at the home page from any other route', () => {
    vi.mocked(usePathname).mockReturnValue('/th/projects');
    render(<NavMenu locale="th" profile={makeProfile()} active={null} />);
    const dialog = openMenu('th');
    const hrefs = Array.from(dialog.querySelectorAll('a[data-sec]')).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['/th#work', '/th#career', '/th#story', '/th#faq']);
    expect(within(dialog).getByRole('link', { name: 'Suwichak กลับขึ้นด้านบน' }).getAttribute('href')).toBe('/th#top');
  });

  it('offers the actions: start a conversation, copy the email, the résumé', () => {
    render(<NavMenu locale="en" profile={makeProfile()} active={null} />);
    const dialog = openMenu();
    expect(within(dialog).getByRole('link', { name: dict.en.startConversation }).getAttribute('href')).toBe(
      'mailto:klao@example.com?subject=Hello%20from%20klao-site',
    );
    expect(within(dialog).getByRole('button', { name: dict.en.copyEmail })).toBeTruthy();
    const resume = within(dialog).getByRole('link', { name: dict.en.resumeShort });
    expect(resume.getAttribute('href')).toBe('/resume.pdf');
    expect(resume.getAttribute('target')).toBe('_blank');
    // Wave-1 integration review: the repo's convention for target="_blank"
    // is rel="noreferrer" (this dialog's own LinkedIn/GitHub links already
    // use it, below).
    expect(resume.getAttribute('rel')).toBe('noreferrer');
  });

  it('copies the email, confirms it on the button, and says so to screen readers', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    render(<NavMenu locale="en" profile={makeProfile()} active={null} />);
    const dialog = openMenu();
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: dict.en.copyEmail }));
    });
    expect(writeText).toHaveBeenCalledWith('klao@example.com');
    expect(within(dialog).getByRole('button', { name: dict.en.copied })).toBeTruthy();
    expect(dialog.querySelector('[aria-live="polite"]')?.textContent).toBe(dict.en.copied);
  });

  // Wave-1 integration review carry-over (b): copy() now goes through the
  // one shared copyText() (src/lib/clipboard.ts, also CopyEmail's path) and
  // shows CopyEmail's own honest failure hint instead of the old silent
  // no-op -- never a false "Copied" (see src/components/CopyEmail.tsx).
  it('shows an honest failure hint, never a false "Copied", when the write is rejected (permission denied)', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
    render(<NavMenu locale="en" profile={makeProfile()} active={null} />);
    const dialog = openMenu();
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: dict.en.copyEmail }));
    });
    const hint = copyShortcutHint(dict.en.closeCopyFail);
    expect(within(dialog).getByRole('button', { name: hint })).toBeTruthy();
    expect(dialog.querySelector('[aria-live="polite"]')?.textContent).toBe(hint);
    expect(within(dialog).queryByRole('button', { name: dict.en.copied })).toBeNull();
  });

  it('shows the same honest failure hint when there is no clipboard at all (non-secure context)', async () => {
    vi.stubGlobal('navigator', {});
    render(<NavMenu locale="en" profile={makeProfile()} active={null} />);
    const dialog = openMenu();
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: dict.en.copyEmail }));
    });
    const hint = copyShortcutHint(dict.en.closeCopyFail);
    expect(within(dialog).getByRole('button', { name: hint })).toBeTruthy();
    expect(dialog.querySelector('[aria-live="polite"]')?.textContent).toBe(hint);
  });

  it('leaves out every action and link it has no data for', () => {
    render(<NavMenu locale="en" profile={makeProfile({ email: '', resumeUrl: null, linkedin: '', github: '' })} active={null} />);
    const dialog = openMenu();
    expect(dialog.querySelector('a[href^="mailto:"]')).toBeNull();
    expect(within(dialog).queryByRole('button', { name: dict.en.copyEmail })).toBeNull();
    expect(within(dialog).queryByRole('link', { name: dict.en.resumeShort })).toBeNull();
    expect(within(dialog).queryByRole('link', { name: /LinkedIn/ })).toBeNull();
    expect(within(dialog).queryByRole('link', { name: /GitHub/ })).toBeNull();
  });

  it('links LinkedIn and GitHub in a new tab without leaking a referrer', () => {
    render(<NavMenu locale="en" profile={makeProfile()} active={null} />);
    const dialog = openMenu();
    const li = within(dialog).getByRole('link', { name: /LinkedIn/ });
    expect(li.getAttribute('href')).toBe('https://linkedin.example/klao');
    expect(li.getAttribute('target')).toBe('_blank');
    expect(li.getAttribute('rel')).toBe('noreferrer');
    expect(within(dialog).getByRole('link', { name: /GitHub/ }).getAttribute('href')).toBe('https://github.example/klao');
  });

  it('hands off to the ⌘K palette: closes itself and dispatches klao:palette', () => {
    const seen = vi.fn();
    window.addEventListener(PALETTE_EVENT, seen);
    render(<NavMenu locale="en" profile={makeProfile()} active={null} />);
    const dialog = openMenu();
    fireEvent.click(within(dialog).getByRole('button', { name: dict.en.navSearchPrompt }));
    expect(seen).toHaveBeenCalledTimes(1);
    expect(dialog.hasAttribute('open')).toBe(false);
    window.removeEventListener(PALETTE_EVENT, seen);
  });

  // C5 (preflight ruling): the phone menu's Appearance label reuses P0's
  // `appearance` dictionary key rather than a duplicate `navAppearance` --
  // so this asserts against `dict.th.appearance`, not a nav-specific key.
  it('carries the language and appearance switches, in the page language', () => {
    vi.mocked(usePathname).mockReturnValue('/th');
    render(<NavMenu locale="th" profile={makeProfile()} active={null} />);
    const dialog = openMenu('th');
    expect(within(dialog).getByRole('group', { name: dict.th.navLanguage })).toBeTruthy();
    expect(within(dialog).getByText(dict.th.appearance)).toBeTruthy();
    expect(within(dialog).getByTestId('theme-toggle').getAttribute('data-locale')).toBe('th');
  });

  it('closes from its close button and hands focus back to Menu', () => {
    render(<NavMenu locale="en" profile={makeProfile()} active={null} />);
    const dialog = openMenu();
    fireEvent.click(within(dialog).getByRole('button', { name: dict.en.navCloseMenu }));
    expect(dialog.hasAttribute('open')).toBe(false);
    expect(document.activeElement).toBe(menuButton());
    expect(menuButton().getAttribute('aria-expanded')).toBe('false');
  });

  it('closes when a section link is followed, and when the backdrop is clicked', () => {
    render(<NavMenu locale="en" profile={makeProfile()} active={null} />);
    let dialog = openMenu();
    fireEvent.click(dialog.querySelector('a[data-sec="faq"]') as HTMLElement);
    expect(dialog.hasAttribute('open')).toBe(false);
    dialog = openMenu();
    fireEvent.click(dialog); // the target is the dialog itself = its backdrop
    expect(dialog.hasAttribute('open')).toBe(false);
  });

  // P1 final review I-1: a section link used to close the menu and hand
  // focus back to Menu, leaving the reader's focus at the top of the page.
  // It now follows the section in place (P4's followTarget) and the heading
  // keeps focus.
  const withFaq = () =>
    render(
      <>
        <section id="faq">
          <h2>FAQ heading</h2>
        </section>
        <NavMenu locale="en" profile={makeProfile()} active={null} />
      </>,
    );

  it('follows a section link in place: the menu closes and focus lands on the section heading, not Menu', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    withFaq();
    const dialog = openMenu();
    // fireEvent returns false when the handler called preventDefault().
    expect(fireEvent.click(dialog.querySelector('a[data-sec="faq"]') as HTMLElement)).toBe(false);
    expect(dialog.hasAttribute('open')).toBe(false);
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'FAQ heading' }));
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(window.location.hash).toBe('#faq');
    expect(menuButton().getAttribute('aria-expanded')).toBe('false');
  });

  it('keeps focus on the heading when the browser fires close from a later task, as real browsers do', async () => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    // The shared stub fires `close` synchronously; a real browser queues it,
    // so it lands after the click handler has already moved focus.
    HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
      if (!this.hasAttribute('open')) return;
      this.removeAttribute('open');
      setTimeout(() => this.dispatchEvent(new Event('close')));
    };
    withFaq();
    const dialog = openMenu();
    fireEvent.click(dialog.querySelector('a[data-sec="faq"]') as HTMLElement);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve));
    });
    expect(menuButton().getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'FAQ heading' }));
  });

  // P1 final review M-3: without JavaScript the Menu button opened nothing,
  // a dead control in the capsule. It is hidden until the page's script has
  // marked <html> with `.js` (the same hook the tour's Play button uses).
  it('hides the Menu button until JavaScript is running', () => {
    const css = readFileSync('src/components/nav-menu.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).toContain('html:not(.js) .nm-open { display: none; }');
  });

  it('stays in sync when the browser closes it on Esc (the dialog fires close by itself)', () => {
    render(<NavMenu locale="en" profile={makeProfile()} active={null} />);
    const dialog = openMenu();
    act(() => {
      dialog.close();
    });
    expect(menuButton().getAttribute('aria-expanded')).toBe('false');
  });
});
