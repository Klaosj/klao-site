// Proves every White Edition QA check catches the fault it exists for, and
// stays quiet on a clean page. A check that can't fail is worse than none.
// No server needed: both pages are inline HTML.
//   node scripts/qa-selftest.mjs        (npm run qa:self)
import { collect, contrastIssues, launch, scrollThrough, watchErrors } from './qa-lib.mjs';

const OPTS = {
  sectionIds: ['top', 'tour', 'signature', 'work', 'career', 'story', 'faq', 'contact'],
  anchorIds: [],
  textIds: ['top', 'signature', 'work', 'career', 'story', 'faq', 'contact'],
  phone: true,
  thai: true,
  reduced: true,
};

const HEAD = `<!doctype html><html lang="th"><head><meta charset="utf-8"><style>
  body { margin: 0; font: 17px/1.6 sans-serif; color: #1a1c20; background: #fff; }
  section { padding: 24px 20px; }
  h1 { font-size: 22px; }
  .nw { display: inline-block; white-space: nowrap; }
  .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  .btn { display: inline-flex; align-items: center; min-height: 44px; padding: 0 22px; }
  summary { min-height: 44px; }
</style></head><body><main>`;
const TAIL = '</main><footer><p>Footer line for the page</p></footer></body></html>';

// #tour's clip wrapper mirrors real full-bleed CSS (R28): a bleed inside an
// `overflow-x: clip` ancestor must stay quiet — the ancestor already
// prevents it from ever widening the page.
const CLEAN = `${HEAD}
<section id="top"><h1>ผมสร้าง<span class="nw">เครื่องมือ</span>ที่ใช้เอง</h1><p>Hero copy long enough to count as text.</p><a class="btn" href="#work">Projects</a></section>
<section id="tour"><p>Tour</p><div style="overflow-x: clip"><div style="width: 900px; height: 1px"></div></div></section>
<section id="signature"><h2 class="rv">The idea, then the app.</h2><p>Signature copy long enough to count.</p></section>
<section id="work"><p>Read <a href="#x">this inline link</a> inside a sentence, which is allowed.</p></section>
<section id="career"><p>Career copy long enough to count as text.</p></section>
<section id="story"><p>Story copy long enough to count as text.</p><span class="sr-only">tiny hidden label</span><svg width="40" height="12" aria-hidden="true"><text x="0" y="10" font-size="8">8px</text></svg><p aria-hidden="true" style="font-size:11px">decoration</p></section>
<section id="faq"><details><summary>A question people ask?</summary><p>The answer.</p></details><p>FAQ copy long enough to count as text.</p></section>
<section id="contact"><p>Contact copy long enough to count as text.</p></section>
${TAIL}`;

// One planted fault per check. #faq is missing on purpose.
const DIRTY = `${HEAD}
<script>console.error('qa self-test: planted error');</script>
<section id="top"><h1>ก<br>่าน</h1><p>Hero copy long enough to count as text.</p></section>
<section id="tour"><p>Tour</p></section>
<section id="signature"><h2 class="rv" style="opacity:0">Hidden headline</h2><p>Signature copy long enough to count.</p></section>
<section id="work"><p><a href="#x">Standalone link</a></p><p>Read <a href="#y">this inline link</a> inside a sentence, which is allowed.</p><button style="width:12px;height:12px;padding:0;border:0" aria-label="tiny"></button></section>
<section id="career"><p style="font-size:12px">Tiny caption text for the check</p><p style="color:#cccccc">Low contrast line of text</p></section>
<section id="story"><p style="width:120px"><span class="nw" style="display:inline;white-space:normal">เครื่องมือ นอกเวลางาน สุดสัปดาห์</span></p><div style="width:900px;height:4px"></div></section>
<section id="contact"><p>Hi</p></section>
${TAIL}`;

async function measure(browser, html) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  try {
    const page = await context.newPage();
    const errors = watchErrors(page);
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    // scrollThrough duplicates collect()'s overflow walk for its own reasons
    // (Playwright serialises each in-page function separately — see
    // qa-lib.mjs's file header) — call it here too, so a break in that copy
    // shows up as a self-test failure instead of only in production (M3).
    const scrollBleed = await page.evaluate(scrollThrough);
    const m = await page.evaluate(collect, OPTS);
    const contrast = await page.evaluate(contrastIssues);
    return { ...m, scrollBleed, contrast, errors };
  } finally {
    await context.close();
  }
}

const results = [];
const check = (ok, what) => results.push([ok, what]);

const browser = await launch();
try {
  const clean = await measure(browser, CLEAN);
  for (const k of ['missing', 'empty', 'hidden', 'smallText', 'smallTargets', 'thaiBreaks', 'nwWraps', 'contrast', 'errors']) {
    check(clean[k].length === 0, `clean page raises no ${k}${clean[k].length ? ': ' + clean[k].join(' | ') : ''}`);
  }
  check(
    clean.overflow === 0 && clean.scrollBleed === 0,
    `clean page has no horizontal overflow, incl. a bleed an overflow-x: clip ancestor absorbs (collect=${clean.overflow}px scroll=${clean.scrollBleed}px)`,
  );

  const dirty = await measure(browser, DIRTY);
  check(dirty.missing.includes('faq'), 'a missing section (#faq) is caught');
  check(dirty.empty.includes('contact'), 'a section without text (#contact) is caught');
  check(dirty.hidden.some((x) => x.includes('Hidden headline')), 'an opacity-0 .rv under reduced motion is caught');
  check(dirty.smallText.some((x) => x.includes('Tiny caption')), '12px text on a phone is caught');
  check(dirty.smallTargets.some((x) => x.includes('Standalone link')), 'a short link that is not inside a sentence is caught');
  check(dirty.smallTargets.some((x) => x.startsWith('12×12')), 'a 12×12 button is caught');
  check(!dirty.smallTargets.some((x) => x.includes('this inline link')), 'a link inside a sentence is allowed');
  check(dirty.thaiBreaks.length > 0, 'a Thai line that starts with a tone mark is caught');
  check(dirty.nwWraps.length > 0, 'a keep-span that wraps inside is caught');
  check(dirty.contrast.some((x) => x.includes('Low contrast')), 'low-contrast text is caught');
  check(dirty.overflow > 0, 'horizontal overflow is caught');
  check(dirty.errors.some((x) => x.includes('planted error')), 'a console error is caught');
} finally {
  await browser.close();
}

for (const [ok, what] of results) console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
const failed = results.filter(([ok]) => !ok).length;
console.log(failed ? `\nself-test FAILED (${failed} of ${results.length})` : `\nself-test ok (${results.length} checks)`);
process.exitCode = failed ? 1 : 0;
