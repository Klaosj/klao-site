// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CommandPalette from '@/components/palette/CommandPalette';
import { copyShortcutHint } from '@/lib/clipboard';
import { dict } from '@/lib/dictionary';
import { fill } from '@/lib/format';
import type { FaqItem } from '@/lib/models';
import { buildPaletteIndex, type PaletteInput } from '@/lib/palette-index';
import { stubMatchMedia } from './helpers/media';

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
      start: '2026-03',
      end: null,
    },
  ],
  faq,
};

let fetchSpy: ReturnType<typeof vi.fn>;
let onClose: ReturnType<typeof vi.fn>;

beforeEach(() => {
  stubMatchMedia();
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
  // A couple of fix-round-1 tests below use fake timers (the Ask decline's
  // 2 s copy revert); this returns every test after them to real ones.
  vi.useRealTimers();
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
// copy() awaits copyText(), which awaits writeText(): a few microtask hops
// before the state update. Same convention as tests/copy-email.test.tsx,
// for the fake-timer tests below (settle()'s real setTimeout doesn't fire
// under vi.useFakeTimers()).
const flushMicrotasks = async () => {
  for (let i = 0; i < 6; i++) await Promise.resolve();
};

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

  // Fix wave finding 2 (Important, I-1): the Ask card's Thai body copy
  // (withMarkers' plain segments, the decline line, source quotes, the
  // trust line) rendered as bare strings, so the browser could break a
  // keep-list compound mid-word. Every one of those spots now goes through
  // ThaiText, same as the rest of the page's Thai body text.
  it('renders the Ask answer’s Thai body copy with keep-run spans (fix wave finding 2)', () => {
    const box = open('th');
    type(box, 'เคยทำสตาร์ทอัพไหม');
    fireEvent.keyDown(box, { key: 'Enter' });
    const card = screen.getByRole('region', { name: dict.th.askTitle });
    // 'โปรเจกต์' is on the Thai keep-list (src/lib/thai.ts THAI_KEEP) and
    // appears inside the canned startup answer -- ThaiText renders it as an
    // unbreakable '.nw' span so a browser line break can never split it.
    expect(within(card).getByText('โปรเจกต์', { selector: '.nw' })).toBeTruthy();
  });

  // Re-review round 1, Minor D: the finding-2 test above only covers
  // withMarkers' answer-body segments. The source quote <em> (AskCard.tsx)
  // needs its own assertion -- Tripedia's TH quote 'เข้ารอบ 30 ทีมสุดท้ายจาก
  // 500 ทีม' contains '30 ทีม', a number+unit keep run (src/lib/thai.ts's
  // UNIT pattern: 'ทีม' is on its unit list).
  it('renders a Thai source quote with keep-run spans too (re-review Minor D)', () => {
    const box = open('th');
    type(box, 'เคยทำสตาร์ทอัพไหม');
    fireEvent.keyDown(box, { key: 'Enter' });
    const card = screen.getByRole('region', { name: dict.th.askTitle });
    expect(card.querySelector('.ask-srcs em .nw')?.textContent).toBe('30 ทีม');
  });

  // Re-review round 1, Minor E: a [n] marker with no preceding text to glue
  // to could wrap onto its own line (e.g. a lone "1" starting the next
  // line). U+2060 WORD JOINER right before the marker forbids a break there.
  it('glues each [n] marker to the word before it (re-review Minor E)', () => {
    const box = open();
    type(box, 'has he done a startup?');
    fireEvent.keyDown(box, { key: 'Enter' });
    const card = screen.getByRole('region', { name: dict.en.askTitle });
    const sups = card.querySelectorAll('.ask-a sup');
    expect(sups.length).toBeGreaterThan(0);
    for (const sup of Array.from(sups)) {
      const preceding = sup.previousSibling?.textContent ?? '';
      expect(preceding.endsWith('⁠'), preceding).toBe(true);
    }
  });

  it('has no network API anywhere in the palette source', () => {
    for (const f of ['src/components/palette/CommandPalette.tsx', 'src/components/palette/AskCard.tsx']) {
      expect(readFileSync(f, 'utf8'), f).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource/);
    }
  });

  // --- Fix round 1 regressions -------------------------------------------

  it('ignores a composing Enter (IME guard #2): no row runs', () => {
    const box = open();
    type(box, 'dark');
    fireEvent.keyDown(box, { key: 'Enter', isComposing: true });
    expect(document.documentElement.getAttribute('data-theme')).not.toBe('dark');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('ignores the Safari post-composition Enter, sent as keyCode 229 (IME guard #2)', () => {
    const box = open();
    type(box, 'dark');
    fireEvent.keyDown(box, { key: 'Enter', keyCode: 229 });
    expect(document.documentElement.getAttribute('data-theme')).not.toBe('dark');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('ignores a composing arrow key: the selection does not move (IME guard #2)', () => {
    const box = open();
    const options = screen.getAllByRole('option');
    fireEvent.keyDown(box, { key: 'ArrowDown', isComposing: true });
    expect(box.getAttribute('aria-activedescendant')).toBe(options[0].id);
  });

  it('ignores a composing Escape: the palette stays open with its query (IME guard #2)', () => {
    const box = open('en', 'gonai');
    fireEvent.keyDown(box, { key: 'Escape', isComposing: true });
    expect(box.value).toBe('gonai');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes with the default focus restore before a mailto href, not restoreFocus:false (fix #3)', () => {
    // "conversation" matches only suggested:mail ("Start a conversation"),
    // whose action is an internal (non-external) mailto: href.
    const box = open();
    type(box, 'conversation');
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onClose).toHaveBeenCalledWith(undefined);
  });

  it('closes normally (no restoreFocus override) before an external href, e.g. the résumé', () => {
    const box = open();
    type(box, 'resume');
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onClose).toHaveBeenCalledWith();
  });

  // M8 (fix wave finding 11): repo convention for an outbound target="_blank"
  // link is 'noopener,noreferrer' -- this row was missing the referrer half.
  it('opens an external row with noopener,noreferrer (M8)', () => {
    const windowOpen = vi.spyOn(window, 'open').mockImplementation(() => null);
    const box = open();
    type(box, 'resume');
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(windowOpen).toHaveBeenCalledWith('/resume.pdf', '_blank', 'noopener,noreferrer');
  });

  it('switches locale through switchLocaleHref and window.location.assign (C2 wiring)', () => {
    const assign = vi.fn();
    vi.stubGlobal('location', { assign, pathname: '/', href: '/' });
    const box = open();
    type(box, 'language');
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onClose).toHaveBeenCalledWith({ restoreFocus: false });
    expect(assign).toHaveBeenCalledWith('/th');
  });

  // M3 (fix wave finding 6): Enter used to just run the row listed first
  // (rows[0]), which follows the fixed group display order -- not score
  // order. A query that matches an earlier group's row only weakly, and a
  // later group's row strongly, used to run the weak match.
  it('Enter runs the best-scoring row, not just whichever group lists first (M3)', () => {
    const assign = vi.fn();
    vi.stubGlobal('location', { assign, pathname: '/', href: '/' });
    const withLangFaq: PaletteInput = {
      ...input,
      faq: [...input.faq, { id: 'fx-faq-lang', question: { en: 'Which languages does he work in?', th: 'ทำงานได้กี่ภาษา?' } }],
    };
    render(
      <CommandPalette
        entries={buildPaletteIndex(withLangFaq, 'en')}
        faq={faq}
        email="real@example.com"
        locale="en"
        initialQuery=""
        onClose={onClose}
      />,
    );
    const box = screen.getByRole('combobox') as HTMLInputElement;
    type(box, 'ภาษา');
    const options = screen.getAllByRole('option');
    // Display order is unchanged -- the FAQ row (group 'faq') still lists
    // before the language switch (group 'prefs').
    expect(options[0].textContent).toContain('Which languages');
    // But the language switch is the one that's actually highlighted
    // (its EN label 'Switch to ภาษาไทย' has a word starting with the
    // query -- a closer match than the FAQ row's Thai substring hit) --
    // and the one Enter runs.
    const langOption = options.find((o) => o.textContent?.includes('ภาษาไทย'))!;
    expect(langOption.getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(assign).toHaveBeenCalledWith('/th');
  });

  it('closes on a backdrop click -- the dialog element itself, not its content', () => {
    open();
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalledWith();
  });

  it('keeps the row\'s own hint (the address) on a copy failure, never a false "Copied" (fix round 2 #2)', async () => {
    // Fix round 2 #2: round 1's "Press ⌘C to copy" on the row was itself
    // dishonest -- focus stays in the search input, so nothing is selected
    // for ⌘C to act on. The row now simply keeps showing its own hint (the
    // address, still readable and selectable by hand); the sr-only status
    // region -- not the row -- carries the failure to screen readers.
    vi.stubGlobal('navigator', {});
    const box = open();
    type(box, 'copy');
    fireEvent.keyDown(box, { key: 'Enter' });
    await settle();
    const hint = screen.getAllByRole('option')[0].textContent ?? '';
    expect(hint).toContain('real@example.com');
    expect(hint).not.toContain(dict.en.copied);
    expect(hint).not.toContain(copyShortcutHint(dict.en.closeCopyFail));
    expect(screen.getByRole('status').textContent).toBe(copyShortcutHint(dict.en.closeCopyFail));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('swaps the Ask decline "Copy email" button to Copied, then reverts after ~2 s (fix #4)', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const box = open();
    type(box, 'zzzq');
    fireEvent.keyDown(box, { key: 'Enter' });
    const card = screen.getByRole('region', { name: dict.en.askTitle });
    await act(async () => {
      fireEvent.click(within(card).getByRole('button', { name: dict.en.copyEmail }));
      await flushMicrotasks();
    });
    expect(writeText).toHaveBeenCalledWith('real@example.com');
    expect(within(card).getByRole('button', { name: dict.en.copied })).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(within(card).getByRole('button', { name: dict.en.copyEmail })).toBeTruthy();
  });

  it('keeps the Ask decline "Copy email" label on a copy failure, never a false Copied (fix round 2 #2)', async () => {
    // Same correction as the row above: the button's own label reverts to
    // "Copy email" rather than an unmet ⌘C prompt (nothing is selected
    // there either); the sr-only status still says so.
    vi.stubGlobal('navigator', {});
    const box = open();
    type(box, 'zzzq');
    fireEvent.keyDown(box, { key: 'Enter' });
    const card = screen.getByRole('region', { name: dict.en.askTitle });
    await act(async () => {
      fireEvent.click(within(card).getByRole('button', { name: dict.en.copyEmail }));
      await flushMicrotasks();
    });
    expect(within(card).getByRole('button', { name: dict.en.copyEmail })).toBeTruthy();
    expect(card.textContent).not.toContain(dict.en.copied);
    expect(screen.getByRole('status').textContent).toBe(copyShortcutHint(dict.en.closeCopyFail));
  });

  it('treats a composing Escape as handled if the browser also raises `cancel` for it (fix round 2 #3 nit)', () => {
    // Fix round 2 #3: the composing early-return in onDialogKeyDown used to
    // skip escHandled entirely, so a browser that still fires `cancel` for
    // an IME-consumed Escape would close the palette anyway.
    const box = open();
    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(box, { key: 'Escape', isComposing: true });
    fireEvent(dialog, new Event('cancel', { cancelable: true }));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('phone Ask is a bottom sheet: full width, content-height capped, safe-area padding (fix round 2 #1)', () => {
    // Regression guard for the phone cut-off bug: the desktop
    // .ck:has(> .ask) rule (0,2,0 specificity) used to keep winning over
    // the phone-only .ck rule (0,1,0), leaving the mobile Ask view at
    // width:min(620px,...) + margin:12vh auto auto stacked on height:
    // 100dvh -- pushing its bottom 12vh below the viewport. This reads the
    // published CSS (not jsdom, which applies no layout) to lock the phone
    // override in place.
    const css = readFileSync('src/components/palette/palette.css', 'utf8');
    const start = css.indexOf('@media (max-width: 734px)');
    expect(start, 'the phone media block').toBeGreaterThan(-1);
    let depth = 0;
    let end = -1;
    for (let i = css.indexOf('{', start); i < css.length; i++) {
      if (css[i] === '{') depth++;
      else if (css[i] === '}') {
        depth--;
        if (depth === 0) {
          end = i + 1;
          break;
        }
      }
    }
    expect(end, 'unbalanced @media (max-width: 734px) block').toBeGreaterThan(-1);
    const phone = css.slice(start, end);
    const askOverride = /\.ck:has\(>\s*\.ask\)\s*\{([^}]*)\}/.exec(phone)?.[1] ?? '';
    expect(askOverride, 'the phone .ck:has(> .ask) override').toContain('width: 100%');
    // M5 (fix wave finding 8): `height: auto` here, with the dialog's inset
    // (top:0/bottom:0) both non-auto, stretched to fill the gap instead of
    // letting `margin-top: auto` push a content-sized box to the bottom --
    // the sheet was always ~97% tall. `fit-content` is what content-sizes it.
    expect(askOverride).not.toContain('height: auto');
    expect(askOverride).toContain('height: fit-content');
    expect(askOverride).toContain('max-height: calc(100dvh - 24px)');
    expect(askOverride).toContain('margin: auto 0 0');
    expect(askOverride).toContain('border-radius: 24px 24px 0 0');
    expect(phone).toMatch(/\.ask\s*\{[^}]*padding-bottom:\s*calc\(28px \+ env\(safe-area-inset-bottom\)\)/);
  });
});
