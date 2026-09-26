import { Fragment } from 'react';
import { keepRuns } from '@/lib/thai';

/** Renders copy with Thai keep-runs (master plan C3/R25): each keep run
 *  becomes an unbreakable `.nw` span (inline-block + nowrap, globals.css),
 *  the rest is plain text. Two keep runs side by side get a <wbr> between
 *  them -- that gap is the one place the line may break (see src/lib/thai.ts).
 *  `display` switches to the prototype's disp() rules (every space-delimited
 *  Thai token kept whole) instead of the keep-list/date/unit rules the
 *  default mode uses; either way the markup shape is identical.
 *  Non-Thai text renders exactly as given. No 'use client': it is pure and
 *  works in server and client components alike. */
export default function ThaiText({ text, display }: { text: string; display?: boolean }) {
  const runs = keepRuns(text, display ? { display: true } : undefined);
  return (
    <>
      {runs.map((run, i) =>
        run.keep ? (
          <Fragment key={i}>
            {i > 0 && runs[i - 1].keep ? <wbr /> : null}
            <span className="nw">{run.text}</span>
          </Fragment>
        ) : (
          <Fragment key={i}>{run.text}</Fragment>
        ),
      )}
    </>
  );
}
