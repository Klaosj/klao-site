'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState, type MouseEvent } from 'react';
import { Icon } from '@/components/icons';
import LocaleToggle from '@/components/LocaleToggle';
import ThemeToggle from '@/components/ThemeToggle';
import { copyShortcutHint, copyText } from '@/lib/clipboard';
import { dict } from '@/lib/dictionary';
import { openPalette } from '@/lib/deep-link';
import { mailtoHref } from '@/lib/format';
import type { Locale, Profile } from '@/lib/models';
import { firstName, NAV_LABEL_KEY, NAV_SECTIONS, sectionHref, type NavSection } from '@/lib/nav';
import './nav-menu.css';

const COPIED_MS = 2000;
// Fix round 1 (Minor #12, from P1 T11's review): CopyEmail holds its honest
// failure hint longer than a plain success, on the reasoning that a hint
// telling someone to do something themselves (⌘C) needs more reading time
// than a one-word confirmation.
const COPY_FAILED_MS = 3000;

/**
 * The phone menu (spec §6; prototype renderMenu): the Menu button that sits in
 * the capsule at ≤ 899 px, and the panel it opens: search, the four sections,
 * the three actions, language, appearance, LinkedIn and GitHub.
 *
 * A native modal <dialog>: the browser traps focus, makes the page behind it
 * inert, and closes it on Esc, so none of that is hand-rolled here (the old
 * overlay did all three by hand). Every way out (close button, a link, the
 * backdrop, Esc) ends in the dialog's `close` event, and onClose is the one
 * place that syncs state and hands focus back to Menu.
 */
export default function NavMenu({ locale, profile, active }: { locale: Locale; profile: Profile; active: NavSection | null }) {
  const t = dict[locale];
  const pathname = usePathname() ?? `/${locale}`;
  const href = (hash: `#${string}`) => sectionHref(hash, pathname, locale);
  const first = firstName(profile);
  const id = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  // Wave-1 integration review carry-over (b): 'fail' is the honest third
  // state CopyEmail already has (src/components/CopyEmail.tsx) -- a plain
  // boolean can't say "we tried and it didn't work" without silently
  // claiming success or nothing at all.
  const [copyState, setCopyState] = useState<'idle' | 'ok' | 'fail'>('idle');

  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    [],
  );

  const show = () => {
    dialogRef.current?.showModal();
    setOpen(true);
  };
  const hide = () => dialogRef.current?.close();
  const onClose = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };
  // A click whose target is the <dialog> itself landed on its ::backdrop.
  const onBackdrop = (e: MouseEvent<HTMLDialogElement>) => {
    if (e.target === e.currentTarget) hide();
  };
  const search = () => {
    hide();
    openPalette();
  };
  const copy = async () => {
    // The one copy path (src/lib/clipboard.ts), shared with CopyEmail: on
    // failure -- no clipboard (non-secure context) or permission refused --
    // this shows the same honest hint CopyEmail does instead of the mailto
    // link above's address being the only way to find out.
    const ok = await copyText(profile.email);
    setCopyState(ok ? 'ok' : 'fail');
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopyState('idle'), ok ? COPIED_MS : COPY_FAILED_MS);
  };
  // Fix round 1 (Minor #12): computed once and reused for both the button's
  // own label and the sr-only live region, the way CopyEmail does -- two
  // separate ternaries could drift out of sync with each other.
  const copyMessage = copyState === 'ok' ? t.copied : copyState === 'fail' ? copyShortcutHint(t.closeCopyFail) : '';

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="nm-open"
        aria-haspopup="dialog"
        aria-controls={id}
        aria-expanded={open}
        onClick={show}
      >
        {t.navMenu}
      </button>
      <dialog ref={dialogRef} id={id} className="nm" aria-label={t.navMenu} onClose={onClose} onClick={onBackdrop}>
        <div className="nm-head">
          {/* Preflight ruling C8: reuses the capsule's own brand markup/classes
              (`.sn-brand`/`.sn-mono`, prototype 1745) instead of a copied
              `.nm-brand`/`.nm-mono` pair -- SiteNav (T9) declares them once. */}
          <Link href={href('#top')} className="sn-brand" aria-label={t.navBrandAria.replace('{name}', first)} onClick={hide}>
            <span className="sn-mono" aria-hidden="true">
              {first.charAt(0).toUpperCase()}
            </span>
            <span>{first}</span>
          </Link>
          <button type="button" className="nm-close ctl" aria-label={t.navCloseMenu} onClick={hide}>
            <Icon name="x" />
          </button>
        </div>

        <button type="button" className="nm-search" onClick={search}>
          <Icon name="magnifying-glass" /> {t.navSearchPrompt}
        </button>

        <div className="nm-grid">
          {NAV_SECTIONS.map((sec) => (
            <Link
              key={sec}
              href={href(`#${sec}`)}
              data-sec={sec}
              aria-current={active === sec ? 'location' : undefined}
              onClick={hide}
            >
              {t[NAV_LABEL_KEY[sec]]}
            </Link>
          ))}
        </div>

        {(profile.email || profile.resumeUrl) && (
          <>
            <div className="nm-div" />
            <div className="nm-act">
              {profile.email && (
                <a className="btn btn-fill" href={mailtoHref(profile.email)}>
                  {t.startConversation}
                </a>
              )}
              {profile.email && (
                <button type="button" className="btn btn-out" onClick={copy}>
                  {copyMessage || t.copyEmail}
                </button>
              )}
              {profile.resumeUrl && (
                <a className="btn btn-out" href={profile.resumeUrl} target="_blank" rel="noreferrer">
                  {t.resumeShort}
                </a>
              )}
            </div>
            <span className="sr-only" aria-live="polite">
              {copyMessage}
            </span>
          </>
        )}

        <div className="nm-div" />
        <div className="nm-pref">
          <p className="nm-label">{t.navLanguage}</p>
          <LocaleToggle wide />
          {/* Preflight ruling C5: reuses P0's `appearance` key instead of a
              duplicate `navAppearance`. Ruling C7: icons={false} + full width,
              like the prototype's menu control (proto 690-691) -- see
              nav-menu.css's `.nm-pref .seg` override. */}
          <p className="nm-label">{t.appearance}</p>
          <ThemeToggle locale={locale} icons={false} />
        </div>

        {(profile.linkedin || profile.github) && (
          <div className="nm-links">
            {profile.linkedin && (
              <a href={profile.linkedin} target="_blank" rel="noreferrer">
                LinkedIn ›
              </a>
            )}
            {profile.github && (
              <a href={profile.github} target="_blank" rel="noreferrer">
                GitHub ›
              </a>
            )}
          </div>
        )}
      </dialog>
    </>
  );
}
