import { notFound } from 'next/navigation';
import { LOCALES, type Locale } from './models';

// Split from models.ts on purpose: models.ts is otherwise a pure type/data
// file with zero runtime imports, and this needs the Next.js `notFound`
// runtime import (which also makes it unsafe to import from
// middleware.ts -- middleware runs in the Edge runtime and only ever needs
// the LOCALES array, not this).
function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

// A raw route segment (`params.locale`) is `string`, not `Locale` -- Next.js
// does not validate a dynamic segment's value against the app's type union.
// The old pattern at every call site (`locale === 'th' ? 'th' : 'en'`)
// coerced ANY unrecognized value -- including a single-segment dotted path
// like `/favicon.ico` or `/apple-touch-icon.png`, which falls through
// middleware's `.*\..*` matcher exclusion straight into `[locale]` -- to
// 'en' instead of 404ing. Trusting that coerced value then crashed with a
// bare TypeError deep in each page (e.g. `dict['favicon.ico']` is
// `undefined`, so `{t.email}` throws) after already having fetched
// Notion data. This is the one place "is this a real locale" is decided;
// every route segment becomes a `Locale` by calling this, never by
// coercion.
export function assertLocale(value: string): Locale {
  if (isLocale(value)) return value;
  notFound();
}
