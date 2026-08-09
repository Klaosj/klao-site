/** Single source of truth for colour. `globals.css` mirrors these into
 *  Tailwind's `@theme`; the WebGL shader reads the float form. Changing a
 *  colour in one place and not the other is the failure this file prevents. */
export const HEX = {
  dark: '#17171a',
  deep: '#101013',
  light: '#ffffff',
  peri: '#a8aecb',
  periDeep: '#7d86ad',
} as const;

export type TokenName = keyof typeof HEX;

/** WebGL wants 0..1 per channel, CSS wants hex. Convert in exactly one place. */
export function rgbFloat(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) throw new Error(`rgbFloat expects #rrggbb, got "${hex}"`);
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
}

export const PARTICLE_COLORS = {
  pointA: rgbFloat(HEX.peri),
  pointB: rgbFloat(HEX.periDeep),
  line: rgbFloat('#3d4054'),
} as const;
