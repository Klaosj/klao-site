/** Replay glyph (prototype, inline: not part of the Phosphor subset). Shared by the hero
 *  tour's Replay control and the project sheet's clip Replay button, so both read the same. */
export default function ReplayGlyph() {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4v4h4"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
