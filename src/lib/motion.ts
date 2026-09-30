// Client-only checks for "may this move on its own?", shared by the islands that start
// motion without a click (the project sheet's transitions and product clips, the hero tour).
// Call them after mount, never during render: the server has no matchMedia or navigator, so
// reading them in render would make the first client render differ from the server HTML.

/** True only when the visitor has not asked for reduced motion (and matchMedia exists). */
export function motionAllowed(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: no-preference)').matches;
}

/** The browser's Save-Data hint (Chromium's navigator.connection); absent elsewhere = off. */
export function saveDataOn(): boolean {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return connection?.saveData === true;
}
