export interface BoldSegment {
  text: string;
  bold: boolean;
}

// Notion copy marks its one key clause with **…** (spec §7: Story BodyEN/TH,
// Profile PrologueEN/TH). In Notion the clause is bold formatting;
// notion-mappers.ts's boldText turns it back into the markers. A pair needs at least one character between the
// markers; an unclosed or empty pair stays literal, so a half-typed edit in
// Notion shows up as-is on the page (and gets noticed) instead of bolding the
// rest of the paragraph.
export function splitBold(input: string): BoldSegment[] {
  const out: BoldSegment[] = [];
  const pair = /\*\*(.+?)\*\*/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pair.exec(input)) !== null) {
    if (match.index > last) out.push({ text: input.slice(last, match.index), bold: false });
    out.push({ text: match[1], bold: true });
    last = match.index + match[0].length;
  }
  if (last < input.length) out.push({ text: input.slice(last), bold: false });
  return out;
}
