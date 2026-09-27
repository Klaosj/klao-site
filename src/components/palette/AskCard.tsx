'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Icon } from '@/components/icons';
import type { AskAnswer, AskSource } from '@/lib/ask';
import { dict } from '@/lib/dictionary';
import { fill } from '@/lib/format';
import { mailto } from '@/lib/link-target';
import type { Locale } from '@/lib/models';

// Subject line on the "Something wrong?" mail (prototype). This string
// exists only here (preflight C14): ask.ts's canned answers carry no mail
// subject at all (askPreview never builds a mailto -- fix round 1 #10,
// correcting the earlier comment here), and CloseBand's own "Start a
// conversation" mail uses a different, shared subject (CONTACT_SUBJECT,
// src/lib/link-target.ts).
const ASK_SUBJECT = 'Ask Klao preview';

// The Ask Klao answer card, labelled Preview (spec §6): the question, the
// pre-written answer with [n] source markers, the numbered sources, or a
// decline that points to email. Chrome is in the page's language; the
// answer is in the language the question was asked in (prototype).
export default function AskCard({
  answer,
  email,
  locale,
  copyState,
  onBack,
  onGo,
  onCopyEmail,
}: {
  answer: AskAnswer;
  email: string;
  locale: Locale;
  // Fix round 1 #4: the caller (CommandPalette) owns the copyText() call and
  // its result, so its outcome -- and the ~2 s auto-revert on success -- can
  // be shared with the row-level "Copy email" hint elsewhere in the same
  // palette; this button renders its own label from the outcome rather than
  // taking a pre-rendered string, so it stays in the page's own locale.
  copyState: 'idle' | 'ok' | 'fail';
  onBack: () => void;
  onGo: (target: string) => void;
  onCopyEmail: () => void;
}) {
  const t = dict[locale];
  const a = dict[answer.lang];
  const titleId = useId();
  const titleRef = useRef<HTMLHeadingElement>(null);

  // A screen reader lands on the card's title, not on a stale search field.
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  return (
    <section className="ask" aria-labelledby={titleId}>
      <div className="ask-h">
        <Icon name="chat-circle-dots-duotone" className="ck-ic" />
        <h2 id={titleId} ref={titleRef} tabIndex={-1}>
          {t.askTitle}
        </h2>
        <span className="ask-badge">{t.askBadge}</span>
        <button type="button" className="ask-cancel" onClick={onBack}>
          {t.palCancel}
        </button>
      </div>
      <p className="ask-trust">{t.askTrust}</p>
      {/* Fix round 1 #9: the visitor's own question, shown verbatim, is in
          whichever language they typed it in -- same reasoning as .ask-a/
          .ask-decl's own lang below, just for the query instead of the
          answer. */}
      <p className="ask-q" lang={answer.lang}>
        {answer.query}
      </p>
      {answer.kind === 'decline' ? (
        <div className="ask-decl">
          <p lang={answer.lang}>{fill(a.askDeclined, { email })}</p>
          <p className="ask-decl-act">
            <button type="button" className="btn btn-out" onClick={onCopyEmail}>
              {/* C1: reuses the existing copyEmail key instead of a duplicate
                  palCopyEmail. Fix round 1 #4: on success the label swaps to
                  "Copied" for ~2 s rather than staying "Copy email" as if
                  nothing happened. Fix round 2 #2: on failure it reverts to
                  "Copy email" instead of round 1's "Press ⌘C to copy" --
                  focus never left the search input, so nothing was
                  selected for ⌘C to act on; the sr-only status (onCopyEmail
                  -> copy() in CommandPalette) still tells screen readers. */}
              {copyState === 'ok' ? t.copied : t.copyEmail}
            </button>
          </p>
        </div>
      ) : (
        <>
          <p className="ask-a" lang={answer.lang}>
            {withMarkers(answer.text, answer.sources, a.askSourceN, onGo)}
          </p>
          <div className="ask-srcs">
            <h3>{t.askSources}</h3>
            <ol>
              {answer.sources.map((s, i) => (
                <li key={`${s.target}-${i}`}>
                  <button type="button" onClick={() => onGo(s.target)}>
                    <b aria-hidden="true">{i + 1}</b>
                    <span>
                      <span>{s.label}</span>
                      {s.quote && <em lang={answer.lang}>“{s.quote}”</em>}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </>
      )}
      <div className="ask-f">
        <a href={mailto(email, ASK_SUBJECT)}>{t.askWrong}</a>
      </div>
    </section>
  );
}

// "…GoNai is live[2] and…" → each [n] becomes a small button that jumps to
// source n. split() with a capture group puts the numbers at odd indexes.
function withMarkers(
  text: string,
  sources: AskSource[],
  labelTemplate: string,
  onGo: (target: string) => void,
): ReactNode[] {
  return text.split(/\[(\d+)\]/).map((part, i) => {
    if (i % 2 === 0) return part;
    const n = Number(part);
    const src = sources[n - 1];
    if (!src) return null;
    return (
      <sup key={i}>
        <button type="button" aria-label={fill(labelTemplate, { n })} onClick={() => onGo(src.target)}>
          {n}
        </button>
      </sup>
    );
  });
}
