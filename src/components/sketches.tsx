import type { ReactNode } from 'react';

/* Line drawings from the approved prototype
   (design/white-edition/prototype/index.html): the five By-day chapter
   sketches (`SK`), the Talatify TAM/SAM/SOM rings (`drawRings`) and the
   Tripedia "five apps -> one" strip (`drawFive`), plus the five app tiles it
   uses (`TI`), which the Signature scene can reuse through <TileIcon>.
   Ported to JSX so they render on the server. The prototype styled them
   with its `.ln` class; those styles are inlined here as SVG presentation
   attributes (a CSS class beat the 1.25 stroke attribute there, so the
   rendered stroke was 1.5 -- 1.5 is what is kept). Paints that use a CSS
   variable go through `style`, where var() works in every browser. */

const LINE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

/** Every sketch name, in chapter order then the two project drawings. The
 *  Story DB `Sketch` select and story.json must use exactly these literals. */
export const SKETCH_NAMES = ['room', 'cases', 'formats', 'rollout', 'handover', 'rings', 'five'] as const;
export type SketchName = (typeof SKETCH_NAMES)[number];
type ChapterSketch = Exclude<SketchName, 'rings' | 'five'>;

/** Chapter sketches, 160 x 64, in chapter order (chapter 6 has the phase
 *  strip instead of a sketch). */
const CHAPTER: Record<ChapterSketch, ReactNode> = {
  // 01 Find the room: a room with a door gap, a table with a seat each side, arrow to an NDA.
  room: (
    <>
      <g {...LINE}>
        <path d="M24 58H6V6h96v52H44" />
        <rect x="38" y="26" width="30" height="12" rx="2" />
        <circle cx="30" cy="32" r="4" />
        <circle cx="76" cy="32" r="4" />
        <path d="M110 32h16m-5-5l5 5-5 5" />
        <path d="M134 14h14l6 6v30h-20z" />
      </g>
      <text x="144" y="41" textAnchor="middle">NDA</text>
    </>
  ),
  // 02 Make the deal work: low / base / high, no values.
  cases: (
    <>
      <g {...LINE}>
        <rect x="24" y="8" width="44" height="10" rx="2" />
        <rect x="24" y="27" width="78" height="10" rx="2" />
        <rect x="24" y="46" width="116" height="10" rx="2" />
      </g>
      <text x="8" y="17">L</text>
      <text x="8" y="36">B</text>
      <text x="8" y="55">H</text>
    </>
  ),
  // 03 Design what goes on the wall: shelf-edge strip, archway, e-paper tag.
  formats: (
    <g {...LINE}>
      <path d="M4 30h44M4 38h44" />
      <rect x="4" y="30" width="44" height="8" rx="1" />
      <path d="M4 54h44" />
      <path d="M62 58V28a18 18 0 0 1 36 0v30" />
      <path d="M70 58V29a10 10 0 0 1 20 0v29" />
      <rect x="114" y="16" width="36" height="42" rx="3" />
      <path d="M121 28h22M121 36h16M121 44h19" />
    </g>
  ),
  // 04 Put it in the stores: dashed route to a shopfront, price tag with a check.
  rollout: (
    <>
      <g {...LINE}>
        <path d="M6 50c20 0 22-20 44-20s24 18 40 18" strokeDasharray="3 4" />
        <path d="M92 58V30h40v28M92 30l4-10h32l4 10M104 58V44h12v14" />
        <path d="M140 8l14 0 0 14-12 12-14-14z" />
      </g>
      <text x="142" y="21" fontSize="10">
        ✓
      </text>
    </>
  ),
  // 05 Hand it over: key from BD to Ops; three linked nodes.
  handover: (
    <>
      <g {...LINE}>
        <rect x="4" y="18" width="34" height="24" rx="4" />
        <rect x="74" y="18" width="38" height="24" rx="4" />
        <path d="M44 30h22m-5-5l5 5-5 5" />
        <circle cx="128" cy="12" r="5" />
        <circle cx="152" cy="30" r="5" />
        <circle cx="128" cy="50" r="5" />
        <path d="M132 15l16 12M148 34l-16 12M128 17v28" />
      </g>
      <text x="21" y="34" textAnchor="middle">
        BD
      </text>
      <text x="93" y="34" textAnchor="middle">
        Ops
      </text>
    </>
  ),
};

/** The prototype's `TI` tiles: 24 x 24 line icons (map, calendar, wallet,
 *  train, chat) and GoNai's pin. */
const TILE_PATHS = {
  map: (
    <>
      <path d="M3.5 6.5l5-2 7 2 5-2v13l-5 2-7-2-5 2z" />
      <path d="M8.5 4.5v13M15.5 6.5v13" />
    </>
  ),
  cal: (
    <>
      <rect x="4" y="5.5" width="16" height="14" rx="2.5" />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    </>
  ),
  wal: (
    <>
      <rect x="3.5" y="6" width="17" height="13" rx="2.5" />
      <path d="M3.5 9.5h13" />
      <path d="M15.5 13.5h2" />
    </>
  ),
  trn: (
    <>
      <rect x="6" y="3.5" width="12" height="13" rx="3" />
      <path d="M6 10.5h12M9 20l1.5-3.5M15 20l-1.5-3.5" />
      <path d="M9 13.5h.01M15 13.5h.01" />
    </>
  ),
  cht: <path d="M4.5 5.5h15v10h-9l-4.5 3.5v-3.5h-1.5z" />,
  pin: (
    <>
      <path d="M12 20.5s6-5.2 6-10.5a6 6 0 0 0-12 0c0 5.3 6 10.5 6 10.5z" />
      <circle cx="12" cy="10" r="2.2" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type TileName = keyof typeof TILE_PATHS;
const FIVE_APPS: readonly TileName[] = ['map', 'cal', 'wal', 'trn', 'cht'];

/** One 24 x 24 app tile icon (Signature scene tiles, Tripedia strip).
 *  Colour-neutral (currentColor only, no brand paint): P2's Signature scene
 *  renders all five tiles in one uniform grey. */
export function TileIcon({ name, className }: { name: TileName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false" {...LINE}>
      {TILE_PATHS[name]}
    </svg>
  );
}

export function isSketchName(value: string): value is SketchName {
  return (SKETCH_NAMES as readonly string[]).includes(value);
}

type SketchProps = {
  /** A SketchName, or any string from Notion (Story `Sketch` select); an
   *  unknown or empty name renders nothing instead of throwing. */
  name: SketchName | (string & {});
  /** rings/five only: the thumbnail cut (no labels, shorter). */
  small?: boolean;
  /** Accessible name. With it the drawing is role="img"; without it the
   *  drawing is decoration (aria-hidden), as in the By-day chapters and the
   *  index thumbnails, whose text says the same thing. */
  label?: string;
  /** rings, full size only: the line under the rings (prototype copy
   *  "Method, not to scale." / "วิธีคิด ไม่ใช่สัดส่วนจริง"). */
  caption?: string;
  className?: string;
};

export function Sketch({ name, small = false, label, caption, className }: SketchProps) {
  if (!isSketchName(name)) return null;
  const a11y = label
    ? ({ role: 'img', 'aria-label': label } as const)
    : ({ 'aria-hidden': true, focusable: 'false' } as const);

  if (name === 'rings') {
    return (
      <svg
        viewBox={`0 0 320 ${small ? 182 : 260}`}
        className={className}
        fontSize={13}
        fontWeight={600}
        style={{ letterSpacing: 0 }}
        {...a11y}
      >
        <g fill="none" stroke="currentColor" strokeWidth={1.5}>
          <circle cx="160" cy={small ? 91 : 125} r={small ? 84 : 105} />
          <circle cx="160" cy={small ? 111 : 145} r={small ? 62 : 72} />
        </g>
        <circle cx="160" cy={small ? 131 : 162} r={small ? 38 : 34} style={{ fill: 'var(--kram)' }} />
        {!small && (
          <g fill="currentColor">
            <text x="160" y="70" textAnchor="middle">
              TAM
            </text>
            <text x="160" y="118" textAnchor="middle">
              SAM
            </text>
            <text x="160" y="170" textAnchor="middle" style={{ fill: 'var(--on-kram)' }}>
              SOM
            </text>
            {caption ? (
              <text x="160" y="248" textAnchor="middle">
                {caption}
              </text>
            ) : null}
          </g>
        )}
      </svg>
    );
  }

  if (name === 'five') {
    const y = small ? 54 : 70;
    const arrowY = small ? 74 : 90;
    return (
      <svg viewBox={`0 0 390 ${small ? 150 : 182}`} className={className} {...a11y}>
        {FIVE_APPS.map((app, i) => (
          <g key={app} transform={`translate(${20 + i * 52} ${y})`}>
            <rect width="40" height="40" rx="10" stroke="currentColor" strokeWidth={1.25} style={{ fill: 'var(--card)' }} />
            {!small && (
              <g transform="translate(8 8)" {...LINE} style={{ stroke: 'var(--ink-2)' }}>
                {TILE_PATHS[app]}
              </g>
            )}
          </g>
        ))}
        <path d={`M290 ${arrowY}h22m-6-6l6 6-6 6`} {...LINE} />
        {/* GoNai, the one app the five became -- its own green, through --gonai
            rather than a hard-coded hex, so dark mode swaps to the dark-mode
            green too (preflight A6: lineage counts as GoNai's own mark). */}
        <g transform={`translate(322 ${small ? 50 : 66})`}>
          <rect width="48" height="48" rx="12" style={{ fill: 'var(--gonai)' }} />
          {!small && (
            <g transform="translate(12 12)" {...LINE} stroke="#FFFFFF">
              {TILE_PATHS.pin}
            </g>
          )}
        </g>
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 160 64"
      className={['sk', className].filter(Boolean).join(' ')}
      fill="currentColor"
      fontSize={11}
      fontWeight={600}
      style={{ letterSpacing: 0 }}
      {...a11y}
    >
      {CHAPTER[name]}
    </svg>
  );
}

export default Sketch;
