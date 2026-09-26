'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { dict } from '@/lib/dictionary';
import { mailtoHref } from '@/lib/format';
import type { Locale, Profile } from '@/lib/models';
import './thumb-bar.css';

/**
 * The phone thumb bar (spec §6; prototype .tbar): the two actions a visitor
 * came for, within thumb reach. CSS shows it only at ≤ 734 px. It appears once
 * the hero's own buttons have scrolled away above (`heroGone`, measured by
 * SiteNav, which also fills its Contact pill from it). It steps aside while the
 * contact section, which repeats both actions, is on screen, and while the
 * on-screen keyboard takes the bottom of the viewport. An open menu, sheet or
 * palette is a modal dialog in the top layer, which covers the bar by itself.
 */
export default function ThumbBar({ locale, profile, heroGone }: { locale: Locale; profile: Profile; heroGone: boolean }) {
  const t = dict[locale];
  const pathname = usePathname();
  const [contactInView, setContactInView] = useState(false);
  const [keyboard, setKeyboard] = useState(false);

  // Re-run per route: the layout (and this bar) outlives a client-side
  // navigation, and the #contact element on the new page is a different node.
  useEffect(() => {
    setContactInView(false);
    const contact = document.getElementById('contact');
    if (!contact || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        // One callback can batch several records for #contact, oldest
        // first; the last is where it is now.
        const entry = entries[entries.length - 1];
        setContactInView(
          entry.intersectionRatio >= 0.3 || (entry.isIntersecting && entry.boundingClientRect.top < innerHeight * 0.7),
        );
      },
      { threshold: [0, 0.3, 0.6] },
    );
    io.observe(contact);
    return () => io.disconnect();
  }, [pathname]);

  useEffect(() => {
    const vv = typeof visualViewport === 'undefined' ? null : visualViewport;
    if (!vv) return;
    const onResize = () => setKeyboard(vv.height < 0.75 * innerHeight);
    vv.addEventListener('resize', onResize);
    return () => vv.removeEventListener('resize', onResize);
  }, []);

  if (!profile.email && !profile.resumeUrl) return null;
  const show = heroGone && !contactInView && !keyboard;

  return (
    <div className="sn-tbar glass" role="region" aria-label={t.navQuickActions} data-show={show ? '' : undefined}>
      {profile.email && (
        <a className="btn btn-fill" href={mailtoHref(profile.email)}>
          {t.startConversation}
        </a>
      )}
      {profile.resumeUrl && (
        <a className="btn btn-out" href={profile.resumeUrl} target="_blank" rel="noopener">
          {t.resumeShort}
        </a>
      )}
    </div>
  );
}
