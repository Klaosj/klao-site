// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CommandPalette from '@/components/palette/CommandPalette';
import { dict } from '@/lib/dictionary';
import { fill } from '@/lib/format';
import type { FaqItem } from '@/lib/models';
import { buildPaletteIndex, type PaletteInput } from '@/lib/palette-index';

const faq: FaqItem[] = [
  {
    id: 'fx-faq-contact',
    question: { en: 'How do I reach him?', th: 'ติดต่อยังไง?' },
    answer: {
      en: 'Email suvichuk.j@gmail.com, or use Start a conversation at the end of this page.',
      th: 'อีเมล suvichuk.j@gmail.com หรือกด "เริ่มคุยกัน" ท้ายหน้านี้',
    },
    links: [{ label: { en: 'Contact', th: 'Contact' }, target: 'contact' }],
    order: 5,
  },
];

const input: PaletteInput = {
  profile: { email: 'real@example.com', resumeUrl: '/resume.pdf', linkedin: '', github: '' },
  projects: [
    {
      id: 'p-gonai',
      name: 'GoNai',
      slug: null,
      type: 'build',
      kicker: { en: 'Trip planner', th: 'แอปวางแผนเที่ยว' },
      description: { en: 'One-day Bangkok trip planner', th: 'แอปวางแผนเที่ยวกรุงเทพฯ 1 วัน' },
    },
  ],
  career: [
    {
      id: 'c1',
      key: 'actmedia',
      company: 'Actmedia',
      role: { en: 'Senior Business Development', th: 'นักพัฒนาธุรกิจอาวุโส' },
      period: 'MAR 2026 – Present',
    },
  ],
  faq,
};

let fetchSpy: ReturnType<typeof vi.fn>;
let onClose: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
  // jsdom has no modal dialogs and no scrollIntoView; these stand in.
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
  Element.prototype.scrollIntoView = vi.fn();
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  fetchSpy = vi.fn();
  vi.stubGlobal('fetch', fetchSpy);
  onClose = vi.fn();
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

afterEach(() => {
  // The whole palette, Ask Preview included, never touches the network.
  expect(fetchSpy).not.toHaveBeenCalled();
  cleanup();
  document.body.innerHTML = '';
  history.replaceState(null, '', '/');
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function open(locale: 'en' | 'th' = 'en', initialQuery = '') {
  render(
    <CommandPalette
      entries={buildPaletteIndex(input, locale)}
      faq={faq}
      email="real@example.com"
      locale={locale}
      initialQuery={initialQuery}
      onClose={onClose}
    />,
  );
  return screen.getByRole('combobox') as HTMLInputElement;
}
const type = (box: HTMLElement, value: string) => fireEvent.change(box, { target: { value } });
// Lets the palette's post-close setTimeout(…, 0) and clipboard promises run.
const settle = () =>
  act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });

describe('CommandPalette', () => {
  it('opens as a labelled dialog: a combobox driving a listbox, first option active, input focused', () => {
    const box = open();
    expect(screen.getByRole('dialog', { name: dict.en.navSearch })).toBeTruthy();
    expect(box.getAttribute('aria-expanded')).toBe('true');
    const list = screen.getByRole('listbox');
    expect(box.getAttribute('aria-controls')).toBe(list.id);
    const options = within(list).getAllByRole('option');
    expect(options).toHaveLength(buildPaletteIndex(input, 'en').length);
    expect(options[0].getAttribute('aria-selected')).toBe('true');
    expect(box.getAttribute('aria-activedescendant')).toBe(options[0].id);
    expect(document.activeElement).toBe(box);
  });

  it('moves the active option with the arrows (wrapping) and Home/End', () => {
    const box = open();
    const options = screen.getAllByRole('option');
    fireEvent.keyDown(box, { key: 'ArrowDown' });
    expect(box.getAttribute('aria-activedescendant')).toBe(options[1].id);
    fireEvent.keyDown(box, { key: 'ArrowUp' });
    fireEvent.keyDown(box, { key: 'ArrowUp' });
    expect(box.getAttribute('aria-activedescendant')).toBe(options[options.length - 1].id);
    fireEvent.keyDown(box, { key: 'Home' });
    expect(box.getAttribute('aria-activedescendant')).toBe(options[0].id);
    fireEvent.keyDown(box, { key: 'End' });
    expect(options[options.length - 1].getAttribute('aria-selected')).toBe('true');
  });

  it('filters as you type, keeps the group label and marks the match', () => {
    const box = open();
    type(box, 'gonai');
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0].querySelector('mark')?.textContent).toBe('GoNai');
    // C1: 'projects' group reuses navWork ("Projects") rather than a duplicate palProjects key.
    expect(screen.getByText(dict.en.navWork)).toBeTruthy();
  });

  it('Enter on a Career row closes first, then opens that pill (C8)', async () => {
    document.body.insertAdjacentHTML('beforeend', '<section id="career"><h2>Career</h2></section>');
    const heard = vi.fn();
    window.addEventListener('klao:career', heard);
    const box = open();
    type(box, 'actmedia');
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onClose).toHaveBeenCalledWith({ restoreFocus: false });
    await settle();
    expect((heard.mock.calls[0][0] as CustomEvent).detail).toEqual({ key: 'actmedia' });
    window.removeEventListener('klao:career', heard);
  });

  it('Esc clears the query first, then closes', () => {
    const box = open('en', 'gonai');
    expect(box.value).toBe('gonai');
    fireEvent.keyDown(box, { key: 'Escape' });
    expect(box.value).toBe('');
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(box, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('offers "Ask Klao" when nothing matches, and declines what the page does not say', () => {
    const box = open();
    type(box, 'zzzq');
    expect(screen.getByText(fill(dict.en.palNone, { q: 'zzzq' }))).toBeTruthy();
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0].textContent).toContain(fill(dict.en.palAsk, { q: 'zzzq' }));
    fireEvent.keyDown(box, { key: 'Enter' });
    const card = screen.getByRole('region', { name: dict.en.askTitle });
    expect(within(card).getByText(dict.en.askBadge)).toBeTruthy();
    expect(card.textContent).toContain(fill(dict.en.askDeclined, { email: 'real@example.com' }));
    // C1: the Ask decline's "Copy email" button reuses the existing copyEmail key.
    expect(within(card).getByRole('button', { name: dict.en.copyEmail })).toBeTruthy();
    expect(document.activeElement?.textContent).toBe(dict.en.askTitle);
  });

  it('answers with numbered sources that jump to where the answer came from', async () => {
    document.body.insertAdjacentHTML('beforeend', '<section id="work"></section>');
    const box = open();
    type(box, 'has he done a startup?');
    fireEvent.keyDown(box, { key: 'End' });
    fireEvent.keyDown(box, { key: 'Enter' });
    const card = screen.getByRole('region', { name: dict.en.askTitle });
    expect(within(card).getAllByRole('button', { name: /^Source \d$/ })).toHaveLength(2);
    const list = within(card).getByRole('list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    fireEvent.click(within(list).getAllByRole('button')[0]);
    expect(onClose).toHaveBeenCalledWith({ restoreFocus: false });
    await settle();
    expect(window.location.hash).toBe('#work/tripedia');
  });

  it('Cancel or Esc leaves the answer and returns to the search, query intact', () => {
    const box = open();
    type(box, 'zzzq');
    fireEvent.keyDown(box, { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: dict.en.palCancel }));
    const again = screen.getByRole('combobox') as HTMLInputElement;
    expect(again.value).toBe('zzzq');
    expect(document.activeElement).toBe(again);
    fireEvent.keyDown(again, { key: 'Enter' });
    fireEvent.keyDown(screen.getByRole('region', { name: dict.en.askTitle }), { key: 'Escape' });
    expect(screen.getByRole('combobox')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('keeps Tab inside the dialog', () => {
    const box = open();
    type(box, 'zzzq');
    fireEvent.keyDown(box, { key: 'Enter' });
    const dialog = screen.getByRole('dialog');
    const cancel = within(dialog).getByRole('button', { name: dict.en.palCancel });
    const wrong = within(dialog).getByRole('link', { name: dict.en.askWrong });
    wrong.focus();
    fireEvent.keyDown(wrong, { key: 'Tab' });
    expect(document.activeElement).toBe(cancel);
    fireEvent.keyDown(cancel, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(wrong);
  });

  it('copies the email in place and says so, without closing', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const box = open();
    type(box, 'copy');
    fireEvent.keyDown(box, { key: 'Enter' });
    await settle();
    expect(writeText).toHaveBeenCalledWith('real@example.com');
    expect(screen.getAllByRole('option')[0].textContent).toContain(dict.en.copied);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('applies a theme from Preferences and closes', () => {
    const box = open();
    type(box, 'dark');
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(onClose).toHaveBeenCalledWith();
  });

  it('speaks Thai on /th, including a Thai decline for a Thai question', () => {
    const box = open('th');
    // C1: the placeholder reuses navSearchPrompt rather than a duplicate palPlaceholder key.
    expect(box.getAttribute('placeholder')).toBe(dict.th.navSearchPrompt);
    type(box, 'เงินเดือนเท่าไหร่');
    fireEvent.keyDown(box, { key: 'Enter' });
    const card = screen.getByRole('region', { name: dict.th.askTitle });
    expect(within(card).getByText(dict.th.askBadge)).toBeTruthy();
    expect(card.textContent).toContain(fill(dict.th.askDeclined, { email: 'real@example.com' }));
  });

  it('has no network API anywhere in the palette source', () => {
    for (const f of ['src/components/palette/CommandPalette.tsx', 'src/components/palette/AskCard.tsx']) {
      expect(readFileSync(f, 'utf8'), f).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource/);
    }
  });
});
