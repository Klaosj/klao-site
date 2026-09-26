import { Fragment } from 'react';
import { keepRuns } from '@/lib/thai';

/** Renders copy with Thai keep-runs (master plan C3/R25). Default mode: each
 *  keep run becomes an unbreakable `.nw` span (inline-block + nowrap,
 *  globals.css) -- appropriate for the short keep-list words, dates and
 *  units it targets. `display` switches to the prototype's disp() rules
 *  (every space-delimited Thai token kept whole) AND to the `.kt` class
 *  (inline-block + max-width:100%, globals.css) -- a whole token can be a
 *  full heading line, so it must still be able to wrap onto the next line as
 *  a unit; `.nw`'s hard `nowrap` would reinstate the overflow risk the
 *  display option exists to avoid (fix round 1, finding 1). Either mode:
 *  two keep runs side by side get a <wbr> between them -- that gap is the
 *  one place the line may break (see src/lib/thai.ts). Non-Thai text renders
 *  exactly as given. No 'use client': it is pure and works in server and
 *  client components alike. */
export default function ThaiText({ text, display }: { text: string; display?: boolean }) {
  const runs = keepRuns(text, display ? { display: true } : undefined);
  const keepClass = display ? 'kt' : 'nw';
  // Trap (fix wave finding 13, doc only): .nw/.kt are inline-block, which
  // also means an ancestor <a>'s underline stops at each
  // keep-span's edge instead of drawing straight through it -- an
  // inline-block always starts a new text-decoration run. Never observed
  // on this site (no keep run sits inside an underlined link today), but a
  // future one that does would show a broken underline, not a missing fix.
  return (
    <>
      {runs.map((run, i) =>
        run.keep ? (
          <Fragment key={i}>
            {i > 0 && runs[i - 1].keep ? <wbr /> : null}
            <span className={keepClass}>{run.text}</span>
          </Fragment>
        ) : (
          <Fragment key={i}>{run.text}</Fragment>
        ),
      )}
    </>
  );
}
