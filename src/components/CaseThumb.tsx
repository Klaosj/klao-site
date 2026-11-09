import type { CSSProperties } from 'react';
import type { CaseStudy } from '@/lib/cases';
import type { Locale } from '@/lib/models';

type Variant = 'card' | 'hero' | 'mini';

/**
 * The picture for a case: the demo's own screenshots when there are some (a
 * desktop view with the phone view layered over it), otherwise a drawn,
 * explicitly illustrative five-stage tracker. Colours follow the theme tokens,
 * so it reads in light and dark.
 *
 * Motion (case-studies.css): inside a Reveal, the tracker draws itself once
 * when it scrolls in -- the line runs to the current stage, the checks land,
 * the bars fill. Transform and opacity only; reduced motion shows the
 * finished picture.
 */
export default function CaseThumb({ c, locale, variant = 'card' }: { c: CaseStudy; locale: Locale; variant?: Variant }) {
  const illustrative = locale === 'th' ? 'ภาพประกอบ' : 'Illustrative';
  const cls = `cs-thumb cs-thumb-${variant}`;
  if (variant === 'mini' && c.imageMini) {
    return (
      <span className={`${cls} cs-thumb-crop`} aria-hidden="true">
        <img src={c.imageMini.src} alt="" width={596} height={372} loading="lazy" decoding="async" />
      </span>
    );
  }
  if (c.image) {
    const lazy = variant === 'hero' ? undefined : ('lazy' as const);
    return (
      <span className={`${cls} cs-thumb-shot`} aria-hidden={variant === 'mini' ? true : undefined}>
        <img className="cs-shot-main" src={c.image.src} alt={c.image.alt[locale]} width={2160} height={1400} loading={lazy} decoding="async" />
        {c.imagePhone && variant !== 'mini' && (
          <img className="cs-shot-phone" src={c.imagePhone.src} alt={c.imagePhone.alt[locale]} width={780} height={2200} loading={lazy} decoding="async" />
        )}
      </span>
    );
  }
  // Monochrome status marks (spec §5.1): Kram is the only accent.
  const ink = 'var(--kram)';
  const idle = 'var(--spine)';
  const stages = locale === 'th' ? ['เงื่อนไข', 'เตรียม', 'ติดตั้ง', 'ขาย', 'ตรวจ'] : ['Terms', 'Prep', 'Install', 'Sales', 'Audit'];
  const xs = [40, 120, 200, 280, 360];
  const k = (i: number) => ({ ['--k' as string]: String(i) }) as CSSProperties;
  return (
    // The mini (next-case card) is decoration: the link's text already names the case.
    <span className={cls} aria-hidden={variant === 'mini' ? true : undefined}>
      <svg viewBox="0 0 400 220" role="img" aria-label={locale === 'th' ? 'ภาพประกอบ: tracker ห้าขั้นของงานติดตั้ง' : 'Illustrative five-stage rollout tracker'}>
        <line x1="40" y1="70" x2="360" y2="70" style={{ stroke: idle }} strokeWidth="2" />
        <line className="ct-run" x1="40" y1="70" x2="200" y2="70" style={{ stroke: ink }} strokeWidth="3" />
        {xs.map((x, i) =>
          i < 2 ? (
            <g key={x} className="ct-done" style={k(i)}>
              <circle cx={x} cy="70" r="13" style={{ fill: ink }} />
              <path d={`m${x - 6} 70 4 4 8-8`} style={{ stroke: 'var(--on-kram)' }} strokeWidth="2.2" fill="none" />
            </g>
          ) : i === 2 ? (
            <g key={x} className="ct-now">
              <circle cx={x} cy="70" r="12" fill="none" style={{ stroke: ink }} strokeWidth="3" />
              <circle cx={x} cy="70" r="4.5" style={{ fill: ink }} />
            </g>
          ) : (
            <circle key={x} cx={x} cy="70" r="11" fill="none" style={{ stroke: idle }} strokeWidth="2" />
          ),
        )}
        {xs.map((x, i) => (
          <text key={`t${x}`} x={x} y="104" textAnchor="middle" fontSize="12" fontWeight="600" style={{ fill: 'var(--ink-2)' }}>
            {stages[i]}
          </text>
        ))}
        <g transform="translate(40 136)">
          {[208, 150, 72].map((w, i) => (
            <g key={w}>
              <rect y={i * 26} width="320" height="12" rx="6" style={{ fill: 'var(--line)' }} />
              <rect className="ct-bar" y={i * 26} width={w} height="12" rx="6" style={{ fill: ink, opacity: [0.85, 0.55, 0.3][i], ...k(i) }} />
            </g>
          ))}
        </g>
      </svg>
      {variant !== 'mini' && <span className="cs-illus">{illustrative}</span>}
    </span>
  );
}
