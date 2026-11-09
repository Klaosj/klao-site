import type { CaseStudy } from '@/lib/cases';
import type { Locale } from '@/lib/models';

/**
 * The picture for a case card: the demo's own screenshot when there is one,
 * otherwise a drawn, explicitly illustrative tracker. Colours follow the theme
 * tokens, so it reads in light and dark.
 */
export default function CaseThumb({ c, locale }: { c: CaseStudy; locale: Locale }) {
  const illustrative = locale === 'th' ? 'ภาพประกอบ' : 'Illustrative';
  if (c.image) {
    return (
      <span className="cs-thumb cs-thumb-shot">
        <img src={c.image.src} alt={c.image.alt[locale]} width={1580} height={900} loading="lazy" decoding="async" />
      </span>
    );
  }
  // Monochrome status marks (spec §5.1): Kram is the only accent.
  const done = 'var(--kram)';
  const ink = 'var(--kram)';
  const idle = 'var(--spine)';
  const stages = locale === 'th' ? ['เงื่อนไข', 'เตรียม', 'ติดตั้ง', 'ขาย', 'ตรวจ'] : ['Terms', 'Prep', 'Install', 'Sales', 'Audit'];
  const xs = [40, 120, 200, 280, 360];
  return (
    <span className="cs-thumb">
      <svg viewBox="0 0 400 220" role="img" aria-label={locale === 'th' ? 'ภาพประกอบ: tracker ห้าขั้นของงานติดตั้ง' : 'Illustrative five-stage rollout tracker'}>
        <line x1="40" y1="70" x2="360" y2="70" style={{ stroke: idle }} strokeWidth="2" />
        <line x1="40" y1="70" x2="200" y2="70" style={{ stroke: done }} strokeWidth="3" />
        {xs.map((x, i) =>
          i < 2 ? (
            <g key={x}>
              <circle cx={x} cy="70" r="13" style={{ fill: done }} />
              <path d={`m${x - 6} 70 4 4 8-8`} style={{ stroke: 'var(--on-kram)' }} strokeWidth="2.2" fill="none" />
            </g>
          ) : i === 2 ? (
            <g key={x}>
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
              <rect y={i * 26} width={w} height="12" rx="6" style={{ fill: ink, opacity: [0.85, 0.55, 0.3][i] }} />
            </g>
          ))}
        </g>
      </svg>
      <span className="cs-illus">{illustrative}</span>
    </span>
  );
}
