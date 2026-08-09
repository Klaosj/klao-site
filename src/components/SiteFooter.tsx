import { getProfile } from '@/lib/content';

// Async server component that fetches its own data, same as before this
// rewrite -- kept that way (rather than lifted to a `profile` prop) so its
// only consumer, layout.tsx, doesn't need to restructure its own data
// fetching just for the footer. getProfile() is wrapped in React's cache()
// (src/lib/content.ts), so this doesn't cost a second real fetch when
// RootLayout has already resolved the same call for SiteNav within the same
// request.
//
// No `locale` prop: the dark treatment below (bg-deep, a top hairline, the
// copyright line) has no locale-dependent copy -- profile.name and the year
// render identically either way -- so a param that would sit unused was
// dropped rather than kept for symmetry with SiteNav. Nothing here links to
// "#": the previous LinkedIn/GitHub/email row was dropped as a duplicate of
// SiteNav's own social links, per the brief's "nothing that links to #".
export default async function SiteFooter() {
  const profile = await getProfile();
  return (
    <footer className="relative z-[2] border-t border-on-dark-faint bg-deep px-6 py-8 text-center">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-on-dark-soft">
        © {new Date().getFullYear()} {profile.name}
      </p>
    </footer>
  );
}
