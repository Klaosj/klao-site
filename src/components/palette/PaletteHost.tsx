'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PALETTE_EVENT } from '@/lib/deep-link';
import type { FaqItem, Locale } from '@/lib/models';
import type { PaletteEntry } from '@/lib/palette-index';

// The palette itself — search, Ask Preview, its CSS — is a separate chunk,
// fetched the first time someone opens it and never part of the page's
// first load. Only this listener (a few hundred bytes) is always mounted.
const CommandPalette = dynamic(() => import('./CommandPalette'), { ssr: false });

type Session = { seq: number; query: string };

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
  );
}

export default function PaletteHost({
  entries,
  faq,
  email,
  locale,
}: {
  entries: PaletteEntry[];
  faq: FaqItem[];
  email: string;
  locale: Locale;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const openRef = useRef(false);
  const seq = useRef(0);
  const opener = useRef<HTMLElement | null>(null);

  const show = useCallback((query: string) => {
    if (!openRef.current) opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    openRef.current = true;
    seq.current += 1;
    // A new key per opening: every open starts from a fresh query/selection.
    setSession({ seq: seq.current, query });
  }, []);

  const close = useCallback((opts?: { restoreFocus?: boolean }) => {
    openRef.current = false;
    setSession(null);
    const back = opener.current;
    opener.current = null;
    // After the dialog has unmounted; skipped when the chosen action moved
    // focus itself (a deep link focuses the section it scrolled to).
    if (opts?.restoreFocus !== false && back) setTimeout(() => back.focus(), 0);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ignore a composing IME's own keydown -- Safari reports it as
      // keyCode 229 without isComposing set, so both checks stay (mirrors
      // CommandPalette's guard, T13's fix round 1). Without this, committing
      // a Thai candidate with Enter, or a compose step that happens to land
      // on "k"/"/", could toggle or open the palette out from under the IME.
      if (e.isComposing || e.keyCode === 229) return;
      // M7 (fix wave finding 10): e.key reflects the character the active
      // keyboard *layout* produces, not the physical key -- on a Thai
      // layout, the K/slash keys produce Thai letters, not 'k'/'/', so
      // Cmd+K and "/" alone did nothing at all. e.code names the physical
      // key regardless of layout (KeyK, Slash).
      //
      // Re-review round 1, Minor C: an unconditional e.code fallback opened
      // the palette on US Shift+Slash ('?', a real, unrelated shortcut
      // elsewhere) and on a German layout's own Slash-position key ('-') --
      // both produce e.code === 'Slash' regardless of what e.key actually
      // is. The fallback now applies only when e.key is NOT a printable
      // ASCII character at all (a genuinely non-Latin layout, e.g. Thai's
      // ก/ื/ฝ/ฟ); a Latin layout, where e.key and e.code already agree, is
      // unaffected either way. "/" also requires no Shift held, since "/"
      // itself is never typed with Shift on any layout this app targets.
      const nonLatin = !/^[\x20-\x7e]$/.test(e.key);
      if ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === 'k' || (e.code === 'KeyK' && nonLatin))) {
        e.preventDefault();
        if (openRef.current) close();
        else show('');
        return;
      }
      // "/" is the prototype's second shortcut — never while typing, never
      // over another dialog (a project sheet, the phone menu).
      if (
        (e.key === '/' || (e.code === 'Slash' && nonLatin && !e.shiftKey)) &&
        !openRef.current &&
        !isTyping(e.target) &&
        !document.querySelector('dialog[open]')
      ) {
        e.preventDefault();
        show('');
      }
    };
    const onPalette = (e: Event) => show((e as CustomEvent<{ query?: string }>).detail?.query ?? '');
    window.addEventListener('keydown', onKey);
    window.addEventListener(PALETTE_EVENT, onPalette);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(PALETTE_EVENT, onPalette);
    };
  }, [show, close]);

  if (!session) return null;
  return (
    <CommandPalette
      key={session.seq}
      entries={entries}
      faq={faq}
      email={email}
      locale={locale}
      initialQuery={session.query}
      onClose={close}
    />
  );
}
