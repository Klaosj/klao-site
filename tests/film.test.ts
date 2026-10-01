import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FILM_BEATS, FILM_DURATION_MS, FILM_HASH, FILM_LABEL, filmCuts } from '@/lib/film';
import { LOCALES } from '@/lib/models';

// The film's code-side registry (spec 2026-10-01-film-og §4.2 "Code-side registry", §3.3
// files and budgets): the paths Task 2 rendered, their size budgets, the posters' real
// dimensions, and the text version's beats (§3.1, verbatim).

const KB = 1024;
const MB = 1024 * KB;
const onDisk = (src: string) => join('public', src);

/** Width and height from a baseline/progressive JPEG's SOF marker. */
function jpegSize(file: string): { width: number; height: number } {
  const b = readFileSync(file);
  expect(b[0] === 0xff && b[1] === 0xd8, `${file} is not a JPEG`).toBe(true);
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = b[i + 1];
    // Fill bytes and markers without a length field.
    if (marker === 0xff) {
      i++;
      continue;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
      i += 2;
      continue;
    }
    // SOF0..SOF15, except DHT (C4), JPG (C8) and DAC (CC).
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) };
    }
    i += 2 + b.readUInt16BE(i + 2);
  }
  throw new Error(`${file}: no SOF marker`);
}

describe('film registry: files', () => {
  it('points at Task 2’s files, per locale and cut', () => {
    expect(filmCuts('en').wide.mp4).toBe('/film/film-en.mp4');
    expect(filmCuts('th').square.webm).toBe('/film/film-th-1x1.webm');
    expect(filmCuts('en')).toEqual({
      wide: { webm: '/film/film-en.webm', mp4: '/film/film-en.mp4', poster: '/images/film-en.jpg', width: 1920, height: 1080 },
      square: { webm: '/film/film-en-1x1.webm', mp4: '/film/film-en-1x1.mp4', poster: '/images/film-en-1x1.jpg', width: 1080, height: 1080 },
    });
    expect(filmCuts('th').wide.poster).toBe('/images/film-th.jpg');
    expect(filmCuts('th').square.poster).toBe('/images/film-th-1x1.jpg');
  });

  it.each(LOCALES)('%s: every file exists under public/ within budget (16:9 ≤ 6 MB, 1:1 ≤ 5 MB, poster ≤ 150 KB)', (locale) => {
    const { wide, square } = filmCuts(locale);
    for (const [cut, limit] of [
      [wide, 6 * MB],
      [square, 5 * MB],
    ] as const) {
      for (const src of [cut.webm, cut.mp4]) {
        const size = statSync(onDisk(src)).size;
        expect(size, `${src} is ${size} bytes`).toBeLessThanOrEqual(limit);
      }
      const poster = statSync(onDisk(cut.poster)).size;
      expect(poster, `${cut.poster} is ${poster} bytes`).toBeLessThanOrEqual(150 * KB);
    }
  });

  it.each(LOCALES)('%s: the posters are 1920×1080 and 1080×1080, matching the cuts', (locale) => {
    const { wide, square } = filmCuts(locale);
    expect(jpegSize(onDisk(wide.poster))).toEqual({ width: 1920, height: 1080 });
    expect(jpegSize(onDisk(square.poster))).toEqual({ width: 1080, height: 1080 });
    for (const cut of [wide, square]) expect(jpegSize(onDisk(cut.poster))).toEqual({ width: cut.width, height: cut.height });
  });
});

describe('film registry: constants and the text version', () => {
  it('is 40 s long and lives at #film', () => {
    expect(FILM_DURATION_MS).toBe(40000);
    expect(FILM_HASH).toBe('#film');
  });

  it('describes the video in one sentence per locale', () => {
    for (const locale of LOCALES) {
      expect(FILM_LABEL[locale].length).toBeGreaterThan(20);
      expect(FILM_LABEL[locale].trim()).toBe(FILM_LABEL[locale]);
    }
  });

  it('has the six beats in order: title, signature, GoNai, Aje, Cafénista, end', () => {
    expect(FILM_BEATS).toHaveLength(6);
    expect(FILM_BEATS.map((b) => b.at)).toEqual([0, 3.1, 10.0, 18.7, 27.3, 37.3]);
    for (const beat of FILM_BEATS) {
      for (const locale of LOCALES) {
        expect(beat.lines[locale].length, `beat at ${beat.at}s has no ${locale} lines`).toBeGreaterThan(0);
        for (const line of beat.lines[locale]) expect(line.trim().length, `empty ${locale} line at ${beat.at}s`).toBeGreaterThan(0);
      }
    }
    expect(FILM_BEATS[0].lines.en[0]).toBe('Business developer who builds his own tools.');
    expect(FILM_BEATS[2].lines.en[0]).toBe('GoNai · Live · since Aug 2026');
    expect(FILM_BEATS[3].lines.en[0]).toBe('Aje · Working prototype');
    expect(FILM_BEATS[4].lines.en[0]).toBe('Cafénista · Prototype · simulated data');
    expect(FILM_BEATS[5].lines.en).toEqual(['Suwichak Jarunopratamp', 'klao-site.vercel.app']);
  });

  it('keeps Cafénista’s status label: "simulated data" / "ข้อมูลจำลอง"', () => {
    const cafenista = FILM_BEATS[4];
    expect(cafenista.lines.en.join('\n')).toContain('simulated data');
    expect(cafenista.lines.th.join('\n')).toContain('ข้อมูลจำลอง');
  });

  // Global Constraints "Copy": every on-screen word comes verbatim from spec §3.1 -- so does the
  // text version of those words. Each line must appear, as written, in that table.
  it('takes every line verbatim from spec §3.1', () => {
    const spec = readFileSync('docs/superpowers/specs/2026-10-01-film-og-design.md', 'utf8');
    const table = spec.slice(spec.indexOf('### 3.1'), spec.indexOf('### 3.2'));
    expect(table.length).toBeGreaterThan(500);
    for (const beat of FILM_BEATS) {
      for (const locale of LOCALES) {
        for (const line of beat.lines[locale]) expect(table, `"${line}" is not in spec §3.1`).toContain(line);
      }
    }
  });
});
