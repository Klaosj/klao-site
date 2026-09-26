import { Fragment } from 'react';
import ThaiText from '@/components/ThaiText';
import { splitBold } from '@/lib/bold';

// Renders Notion text whose one key clause is marked **…**. The markers
// become real <strong> elements -- never dangerouslySetInnerHTML -- so
// anything HTML-shaped in Notion renders as text, and every segment still
// gets Thai keep-runs through ThaiText (C3). No hooks: usable from server
// components.
export default function BoldText({ text }: { text: string }) {
  return (
    <>
      {splitBold(text).map((segment, i) =>
        segment.bold ? (
          <strong key={i}>
            <ThaiText text={segment.text} />
          </strong>
        ) : (
          <Fragment key={i}>
            <ThaiText text={segment.text} />
          </Fragment>
        ),
      )}
    </>
  );
}
