import { Fragment } from 'react';
import type { ContentBlock, RichSpan } from '@/lib/models';

function Spans({ spans }: { spans: RichSpan[] }) {
  return (
    <>
      {spans.map((s, i) => {
        let node: React.ReactNode = s.text;
        if (s.code) node = <code className="rounded bg-line px-1 text-[0.9em]">{node}</code>;
        if (s.bold) node = <strong>{node}</strong>;
        if (s.italic) node = <em>{node}</em>;
        if (s.href)
          node = (
            <a href={s.href} className="underline hover:text-soft" target="_blank" rel="noreferrer">
              {node}
            </a>
          );
        return <Fragment key={i}>{node}</Fragment>;
      })}
    </>
  );
}

type ListGroup = { type: 'bullets' | 'numbers'; items: RichSpan[][] };
// 'bullet' and 'numbered' ContentBlock variants never survive groupLists as
// themselves — they are always folded into a ListGroup — so they are excluded
// from the type the renderer switches over. That keeps the switch below
// exhaustive: a new ContentBlock variant becomes a compile error (via the
// `never` check in `default`) instead of silently rendering nothing.
type NonListBlock = Exclude<ContentBlock, { type: 'bullet' } | { type: 'numbered' }>;
type Grouped = NonListBlock | ListGroup;

function groupLists(blocks: ContentBlock[]): Grouped[] {
  const out: Grouped[] = [];
  for (const block of blocks) {
    const last = out[out.length - 1];
    if (block.type === 'bullet') {
      if (last && 'items' in last && last.type === 'bullets') last.items.push(block.spans);
      else out.push({ type: 'bullets', items: [block.spans] });
    } else if (block.type === 'numbered') {
      if (last && 'items' in last && last.type === 'numbers') last.items.push(block.spans);
      else out.push({ type: 'numbers', items: [block.spans] });
    } else {
      out.push(block);
    }
  }
  return out;
}

export default function PostBody({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <div className="space-y-4 leading-relaxed">
      {groupLists(blocks).map((block, i) => {
        switch (block.type) {
          case 'heading': {
            const cls = 'font-display mt-8';
            if (block.level === 1)
              return (
                <h2 key={i} className={`${cls} text-2xl`}>
                  {block.text}
                </h2>
              );
            if (block.level === 2)
              return (
                <h3 key={i} className={`${cls} text-xl`}>
                  {block.text}
                </h3>
              );
            return (
              <h4 key={i} className={`${cls} text-lg`}>
                {block.text}
              </h4>
            );
          }
          case 'paragraph':
            return (
              <p key={i}>
                <Spans spans={block.spans} />
              </p>
            );
          case 'bullets':
            return (
              <ul key={i} className="list-disc space-y-1 pl-6">
                {block.items.map((spans, j) => (
                  <li key={j}>
                    <Spans spans={spans} />
                  </li>
                ))}
              </ul>
            );
          case 'numbers':
            return (
              <ol key={i} className="list-decimal space-y-1 pl-6">
                {block.items.map((spans, j) => (
                  <li key={j}>
                    <Spans spans={spans} />
                  </li>
                ))}
              </ol>
            );
          case 'quote':
            return (
              <blockquote key={i} className="border-l-2 border-ink pl-4 italic text-soft">
                <Spans spans={block.spans} />
              </blockquote>
            );
          case 'code':
            return (
              <pre key={i} className="overflow-x-auto rounded bg-ink p-4 text-sm text-paper">
                <code>{block.code}</code>
              </pre>
            );
          case 'image':
            return (
              <figure key={i}>
                <img src={block.src} alt={block.caption || 'post image'} loading="lazy" className="w-full rounded" />
                {block.caption && <figcaption className="mt-1 text-xs text-soft">{block.caption}</figcaption>}
              </figure>
            );
          default: {
            const exhaustive: never = block;
            return exhaustive;
          }
        }
      })}
    </div>
  );
}
