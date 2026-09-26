// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import BoldText from '@/components/BoldText';
import { splitBold } from '@/lib/bold';

afterEach(cleanup);

const norm = (s: string | null | undefined): string => (s ?? '').replace(/\u00A0/g, ' ').replace(/\u200B/g, '');

describe('splitBold', () => {
  it('returns plain text as one segment and nothing for an empty string', () => {
    expect(splitBold('plain')).toEqual([{ text: 'plain', bold: false }]);
    expect(splitBold('')).toEqual([]);
  });

  it('splits the bold clause out of a sentence', () => {
    expect(splitBold('I scope first, and **the NDA comes first.**')).toEqual([
      { text: 'I scope first, and ', bold: false },
      { text: 'the NDA comes first.', bold: true },
    ]);
  });

  it('handles a clause at the start and several clauses', () => {
    expect(splitBold('**A** then **B** end')).toEqual([
      { text: 'A', bold: true },
      { text: ' then ', bold: false },
      { text: 'B', bold: true },
      { text: ' end', bold: false },
    ]);
  });

  it('leaves an unclosed or empty marker as literal text', () => {
    expect(splitBold('a **b')).toEqual([{ text: 'a **b', bold: false }]);
    expect(splitBold('a **** b')).toEqual([{ text: 'a **** b', bold: false }]);
  });
});

describe('BoldText', () => {
  it('wraps the bold clause in <strong> and keeps the rest as text', () => {
    const { container } = render(<BoldText text="I scope first, and **the NDA comes first.**" />);
    expect(container.querySelectorAll('strong')).toHaveLength(1);
    expect(norm(container.querySelector('strong')?.textContent)).toBe('the NDA comes first.');
    expect(norm(container.textContent)).toBe('I scope first, and the NDA comes first.');
  });

  it('renders a Thai clause glued to the word before it', () => {
    const { container } = render(<BoldText text="ประเมินสิ่งที่ทำได้จริงก่อน และ**เซ็น NDA ก่อนแลกข้อมูลกันเสมอ**" />);
    expect(norm(container.querySelector('strong')?.textContent)).toBe('เซ็น NDA ก่อนแลกข้อมูลกันเสมอ');
    expect(norm(container.textContent)).toBe('ประเมินสิ่งที่ทำได้จริงก่อน และเซ็น NDA ก่อนแลกข้อมูลกันเสมอ');
  });

  it('renders HTML-looking Notion text as text, never as markup', () => {
    const { container } = render(<BoldText text="<img src=x onerror=alert(1)> **ok**" />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('<img src=x onerror=alert(1)>');
  });

  it('renders an empty string without throwing', () => {
    const { container } = render(<BoldText text="" />);
    expect(container.textContent).toBe('');
  });
});
