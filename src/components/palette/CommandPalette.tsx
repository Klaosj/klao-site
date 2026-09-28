'use client';

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Icon } from '@/components/icons';
// C2: the footer's language switch already reuses P1's LocaleToggle
// (preflight ruling), so its href logic (switchLocaleHref) is imported from
// there rather than re-declared as a second `swapLocale` in link-target.ts.
import { switchLocaleHref } from '@/components/LocaleToggle';
import { getReadingAnchor } from '@/lib/active-section';
import { askPreview, type AskAnswer } from '@/lib/ask';
import { copyShortcutHint, copyText } from '@/lib/clipboard';
import { goToTarget } from '@/lib/deep-link';
import { dict, type UiStringKey } from '@/lib/dictionary';
import { fill } from '@/lib/format';
import type { FaqItem, Locale } from '@/lib/models';
import { bestScoreIndex, highlight, searchPalette, type PaletteEntry, type PaletteGroup } from '@/lib/palette-index';
import { readThemePref, writeThemePref } from '@/lib/theme';
import AskCard from './AskCard';
import './palette.css';

export interface CommandPaletteProps {
  entries: PaletteEntry[];
  faq: FaqItem[];
  email: string;
  locale: Locale;
  initialQuery: string;
  onClose: (opts?: { restoreFocus?: boolean }) => void;
}

type Row = { kind: 'entry'; entry: PaletteEntry } | { kind: 'ask' };
type GroupKey = PaletteGroup | 'ask';

// C1: 'projects' and 'career' reuse SiteNav's existing navWork/navCareer
// keys instead of adding duplicate palProjects/palCareer keys with the same
// EN/TH text -- the same rule T11's palette-index.ts already follows for
// its SECTIONS rows. palFaq, palSuggested, palGo, palLinks and palPrefs are
// not duplicates (no other key already carries their text), so they stay.
const GROUP_LABEL: Record<GroupKey, UiStringKey> = {
  suggested: 'palSuggested',
  go: 'palGo',
  projects: 'navWork',
  career: 'navCareer',
  faq: 'palFaq',
  links: 'palLinks',
  prefs: 'palPrefs',
  ask: 'askTitle',
};

// Tab stops inside the dialog; tabindex="-1" headings are script focus
// targets, not stops.
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

function Marked({ text, query }: { text: string; query: string }) {
  const parts = highlight(text, query);
  if (!parts) return <>{text}</>;
  return (
    <>
      {parts[0]}
      <mark>{parts[1]}</mark>
      {parts[2]}
    </>
  );
}

// Bilingual search (prototype): when only the other language matched, show
// both names so the visitor sees why the row is there.
function EntryLabel({ entry, query }: { entry: PaletteEntry; query: string }) {
  if (!query || highlight(entry.label, query) || !entry.alt || !highlight(entry.alt, query)) {
    return <Marked text={entry.label} query={query} />;
  }
  return (
    <>
      {entry.label} · <Marked text={entry.alt} query={query} />
    </>
  );
}

// The ⌘K palette (spec §6), loaded lazily by PaletteHost and mounted only
// while open. A native modal <dialog>: the page behind goes inert, Esc and
// the Android back gesture raise `cancel`, and the top layer sits above the
// glass nav. Combobox/listbox pattern: focus stays in the input and
// aria-activedescendant names the highlighted option.
export default function CommandPalette({ entries, faq, email, locale, initialQuery, onClose }: CommandPaletteProps) {
  const t = dict[locale];
  const uid = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const escHandled = useRef(false);
  const [query, setQuery] = useState(initialQuery);
  const raw = query.trim();
  const results = useMemo(() => searchPalette(entries, raw), [entries, raw]);
  // M3 (fix wave finding 6): the initial selection is the best-scoring row,
  // not just rows[0] -- searchPalette's `results` (and so `rows` below) are
  // in fixed group order, not score order, so a weaker match in an earlier
  // group could otherwise win Enter's default action.
  const [sel, setSel] = useState(() => bestScoreIndex(results, raw));
  const [answer, setAnswer] = useState<AskAnswer | null>(null);
  const [status, setStatus] = useState('');
  // Fix round 1 #4: `ok` travels with the id now, so a failed copy can show
  // its own honest hint on the row (or the Ask decline button) instead of
  // only the sr-only status region -- id === null is the Ask decline's
  // "Copy email" button (copy(null, email) below), never a real row id.
  const [copyResult, setCopyResult] = useState<{ id: string | null; ok: boolean } | null>(null);
  // Only the id === null (Ask decline) case reverts on its own after ~2 s,
  // matching CopyEmail.tsx's (Task 8) identical button elsewhere on the
  // page; a row's hint instead simply clears when the query next changes.
  const emailCopyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (emailCopyTimer.current) clearTimeout(emailCopyTimer.current);
  }, []);

  // Prototype rule: offer "Ask Klao" from 3 characters, when nothing matched
  // or when the query reads like a question (has a space or ends with "?").
  const showAsk = raw.length >= 3 && (results.length === 0 || /\s/.test(raw) || /[?？]$/.test(raw));
  const rows = useMemo<Row[]>(
    () => [...results.map((entry): Row => ({ kind: 'entry', entry })), ...(showAsk ? [{ kind: 'ask' } as Row] : [])],
    [results, showAsk],
  );
  const active = rows.length > 0 ? Math.min(sel, rows.length - 1) : -1;
  const optionId = (i: number) => `${uid}-o-${i}`;
  const activeId = active >= 0 ? optionId(active) : undefined;
  const theme = readThemePref();

  // Open as a real modal. jsdom (tests) has no showModal; the attribute
  // keeps the element rendered and accessible there.
  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (typeof d.showModal === 'function') {
      if (!d.open) d.showModal();
    } else {
      d.setAttribute('open', '');
    }
    return () => {
      if (typeof d.close === 'function' && d.open) d.close();
    };
  }, []);

  // Back in the list (first render included), focus is in the search field;
  // AskCard moves focus to its own title when an answer opens.
  useEffect(() => {
    if (!answer) inputRef.current?.focus();
  }, [answer]);

  // Keep the highlighted option on screen while arrowing through the list.
  // Fix round 1 #8: `raw` is also a dependency -- typing resets `sel` to 0,
  // but row 0's id string (`${uid}-o-0`) is the same before and after a
  // keystroke even though it now names a completely different entry, so
  // `activeId` alone never changes and this effect would otherwise not
  // re-run to scroll a still-scrolled-down list back to the new row 0.
  useEffect(() => {
    if (activeId) document.getElementById(activeId)?.scrollIntoView?.({ block: 'nearest' });
  }, [activeId, raw]);

  // Result count for screen readers, debounced so typing isn't read out
  // letter by letter (prototype: 300 ms).
  useEffect(() => {
    if (answer) return;
    const id = setTimeout(() => setStatus(fill(t.palCount, { n: rows.length })), 300);
    return () => clearTimeout(id);
  }, [answer, rows.length, t.palCount]);

  function leave(target: string) {
    onClose({ restoreFocus: false });
    // After the modal is gone: while it is open the page is inert, so a
    // scroll or focus move made now would be dropped.
    setTimeout(() => goToTarget(target, locale), 0);
  }

  async function copy(entryId: string | null, text: string) {
    const ok = await copyText(text);
    setCopyResult({ id: entryId, ok });
    setStatus(ok ? t.copied : copyShortcutHint(t.closeCopyFail));
    if (emailCopyTimer.current) clearTimeout(emailCopyTimer.current);
    // Fix round 1 #4: only the Ask decline's button times out on its own;
    // a failed copy (there or on a row) stays visible until the next
    // attempt or query change, so it is never silently swapped back to a
    // false "all clear".
    if (entryId === null && ok) {
      emailCopyTimer.current = setTimeout(() => setCopyResult(null), 2000);
    }
  }

  function run(row: Row | undefined) {
    if (!row) return;
    if (row.kind === 'ask') {
      const next = askPreview(raw, faq, locale);
      setAnswer(next);
      setStatus(next.kind === 'answer' ? fill(t.askReady, { n: next.sources.length }) : t.askTitle);
      return;
    }
    const { action } = row.entry;
    switch (action.type) {
      case 'target':
        leave(action.target);
        return;
      case 'copy':
        // Stays open: the confirmation is shown on the row itself.
        void copy(row.entry.id, action.text);
        return;
      case 'theme':
        writeThemePref(action.pref);
        onClose();
        return;
      case 'locale':
        onClose({ restoreFocus: false });
        // Klao decision 6: like the toggle, keep the band being read.
        window.location.assign(switchLocaleHref(window.location.pathname, action.locale, getReadingAnchor()));
        return;
      case 'href':
        if (action.external) {
          onClose();
          // M8 (fix wave finding 11): repo convention for an outbound
          // target="_blank" is 'noopener,noreferrer' (SiteFooter's
          // LinkedIn/GitHub rows, NavMenu, WorkDeck, ProjectTour, PostBody,
          // SignatureScene) -- this row was missing the referrer half.
          window.open(action.href, '_blank', 'noopener,noreferrer');
        } else {
          // Fix round 1 #3: restoreFocus:false is for a same-tab navigation
          // that unloads this document (focus would be moot). A `mailto:`
          // href never does that -- the page stays put and the mail client
          // opens elsewhere -- so skipping the restore here was dropping
          // focus to <body> instead of giving it back to whatever opened
          // the palette.
          onClose(action.href.startsWith('mailto:') ? undefined : { restoreFocus: false });
          window.location.href = action.href;
        }
        return;
    }
  }

  function backToList() {
    setAnswer(null);
    setStatus('');
  }

  // Esc peels one layer at a time: the answer, then the query, then the palette.
  function onEscape() {
    if (answer) {
      backToList();
      return;
    }
    if (query) {
      setQuery('');
      setSel(0);
      return;
    }
    onClose();
  }

  function trapTab(e: ReactKeyboardEvent<HTMLDialogElement>) {
    const d = dialogRef.current;
    if (!d) return;
    const stops = Array.from(d.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.checkVisibility?.() ?? true);
    if (stops.length === 0) return;
    const first = stops[0];
    const last = stops[stops.length - 1];
    const current = document.activeElement;
    if (e.shiftKey && (current === first || !d.contains(current))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (current === last || !d.contains(current))) {
      e.preventDefault();
      first.focus();
    }
  }

  // Some browsers still raise `cancel` for the same key press as a real,
  // handled Escape; the flag stops onCancel from treating it as a second
  // one. Fix round 2 #3 (nit): also used for a composing Escape below --
  // a browser can raise `cancel` for that too, even though the IME (not
  // the dialog) consumed the keypress.
  function markEscHandled() {
    escHandled.current = true;
    setTimeout(() => {
      escHandled.current = false;
    }, 0);
  }

  function onDialogKeyDown(e: ReactKeyboardEvent<HTMLDialogElement>) {
    // Fix round 1 #2 (IME guard): an IME's own Escape (cancelling the
    // composition, not the dialog) must not also close the palette. Safari
    // reports a composing key's *own* keydown as keyCode 229 without
    // isComposing; the flag alone misses that case.
    if (e.nativeEvent.isComposing || e.keyCode === 229) {
      if (e.key === 'Escape') markEscHandled();
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      markEscHandled();
      onEscape();
      return;
    }
    if (e.key === 'Tab') trapTab(e);
  }

  function onInputKeyDown(e: ReactKeyboardEvent<HTMLInputElement>) {
    // Fix round 1 #2 (IME guard): while an IME composition is open, Enter
    // and the arrow keys pick a candidate, not a row -- without this, the
    // reviewer found a composing Enter running the highlighted row
    // (switching theme, closing the palette) and a composing Arrow moving
    // the selection underneath the candidate list. Safari sends the
    // committing Enter itself as keyCode 229 right after compositionend,
    // when isComposing has already gone back to false, so both checks stay.
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    const n = rows.length;
    if (e.key === 'ArrowDown' && e.metaKey) {
      e.preventDefault();
      setSel(Math.max(0, n - 1));
    } else if (e.key === 'ArrowUp' && e.metaKey) {
      e.preventDefault();
      setSel(0);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSel(n ? (active + 1) % n : 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSel(n ? (active - 1 + n) % n : 0);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setSel(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setSel(Math.max(0, n - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      run(rows[active]);
    }
  }

  function hintFor(entry: PaletteEntry): string {
    if (entry.action.type === 'theme') return entry.action.pref === theme ? '✓' : '';
    // Fix round 2 #2: round 1 swapped a failed copy's hint for
    // copyShortcutHint(t.closeCopyFail) ("Press ⌘C to copy"), but focus
    // stays in the search input, so nothing is selected there for ⌘C to
    // act on -- that message was dishonest in a different way than a false
    // "Copied" is. On failure the row now simply keeps its own hint (the
    // address, still visible and selectable by hand); the sr-only status
    // region (set in copy() below either way) carries the failure to
    // screen readers instead.
    if (entry.action.type === 'copy' && copyResult?.id === entry.id && copyResult.ok) {
      return t.copied;
    }
    return entry.hint;
  }

  // Fix round 1 #4: the Ask decline's "Copy email" button is the id === null
  // case of the same copyResult state a row's hint reads above; AskCard
  // renders its own label from this rather than from a pre-rendered string,
  // so it stays in the page's own locale exactly like its other chrome
  // (palCancel, copyEmail).
  const emailCopyState: 'idle' | 'ok' | 'fail' =
    copyResult?.id === null ? (copyResult.ok ? 'ok' : 'fail') : 'idle';

  // Consecutive rows of one group share a heading; searchPalette already
  // returns rows grouped in display order, and "Ask Klao" comes last.
  const blocks: { key: GroupKey; items: { row: Row; index: number }[] }[] = [];
  rows.forEach((row, index) => {
    const key: GroupKey = row.kind === 'ask' ? 'ask' : row.entry.group;
    const last = blocks[blocks.length - 1];
    if (last && last.key === key) last.items.push({ row, index });
    else blocks.push({ key, items: [{ row, index }] });
  });

  return (
    <dialog
      ref={dialogRef}
      className="ck"
      aria-label={t.navSearch}
      onKeyDown={onDialogKeyDown}
      onCancel={(e) => {
        e.preventDefault();
        if (!escHandled.current) onClose();
      }}
      onClick={(e) => {
        // A click on the <dialog> box itself (not its content) is the backdrop.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {answer ? (
        <AskCard
          answer={answer}
          email={email}
          locale={locale}
          copyState={emailCopyState}
          onBack={backToList}
          onGo={leave}
          onCopyEmail={() => void copy(null, email)}
        />
      ) : (
        <>
          <div className="ck-row">
            <Icon name="magnifying-glass" className="ck-ic" />
            <input
              ref={inputRef}
              id={`${uid}-q`}
              className="ck-input"
              type="text"
              role="combobox"
              aria-expanded="true"
              aria-controls={`${uid}-list`}
              aria-autocomplete="list"
              aria-activedescendant={activeId}
              aria-label={t.navSearchPrompt}
              placeholder={t.navSearchPrompt}
              autoComplete="off"
              spellCheck={false}
              value={query}
              onChange={(e) => {
                const value = e.target.value;
                setQuery(value);
                // M3: re-selects the new query's best-scoring row, computed
                // fresh here rather than read from `results` (last render's
                // query, one keystroke behind by the time this runs).
                const q = value.trim();
                setSel(bestScoreIndex(searchPalette(entries, q), q));
                setCopyResult(null);
              }}
              onKeyDown={onInputKeyDown}
            />
            <button type="button" className="ck-cancel" onClick={() => onClose()}>
              {t.palCancel}
            </button>
          </div>
          {raw && results.length === 0 && <p className="ck-empty">{fill(t.palNone, { q: raw })}</p>}
          {/* Fix round 1 #7: aria-label names the list "Results" directly --
              aria-labelledby pointing at the search input named it after the
              input's own accessible name (the placeholder text), not after
              what the listbox actually is. */}
          <div className="ck-list" id={`${uid}-list`} role="listbox" aria-label={t.palResults}>
            {blocks.map((block) => (
              <div key={block.key} role="group" aria-labelledby={`${uid}-g-${block.key}`}>
                <div className="ck-g" id={`${uid}-g-${block.key}`}>
                  {t[GROUP_LABEL[block.key]]}
                </div>
                {block.items.map(({ row, index }) => (
                  <div
                    key={row.kind === 'ask' ? 'ask' : row.entry.id}
                    id={optionId(index)}
                    role="option"
                    aria-selected={index === active}
                    className="ck-o"
                    onClick={() => run(row)}
                    onPointerMove={() => {
                      if (index !== active) setSel(index);
                    }}
                  >
                    {row.kind === 'ask' ? (
                      <>
                        <Icon name="chat-circle-dots-duotone" className="ck-ic" />
                        <span>{fill(t.palAsk, { q: raw })}</span>
                        <span className="ck-hint">↵</span>
                      </>
                    ) : (
                      <>
                        <Icon name={row.entry.icon} className="ck-ic" />
                        <span>
                          <EntryLabel entry={row.entry} query={raw} />
                        </span>
                        <span className="ck-hint">{hintFor(row.entry)}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="ck-foot" aria-hidden="true">
            <span>{t.palMove}</span>
            <span>{t.palOpen}</span>
            <span>{t.palClose}</span>
            <span>{fill(t.palCount, { n: rows.length })}</span>
          </div>
        </>
      )}
      <div className="sr-only" role="status" aria-live="polite">
        {status}
      </div>
    </dialog>
  );
}
