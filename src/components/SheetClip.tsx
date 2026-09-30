'use client';

import { useEffect, useRef, useState } from 'react';
import ReplayGlyph from '@/components/ReplayGlyph';
import { dict } from '@/lib/dictionary';
import type { Locale } from '@/lib/models';
import { motionAllowed, saveDataOn } from '@/lib/motion';
import type { ProjectClip } from '@/lib/project-clips';

// A product clip that plays once over a screenshot
// (spec: docs/superpowers/specs/2026-09-30-sheet-clips.md). The parent renders this inside the
// screenshot's own `.win` box, right after the <img>; the <img> stays the poster and the still
// in every case.
//
// - Server and first client render: nothing. The markup is exactly the screenshot as before, so
//   there is no hydration mismatch and a visitor without JavaScript sees the still.
// - After mount, only when motion is allowed and Save-Data is off: a muted <video> laid over the
//   <img>. It stays invisible until its `playing` event (clip frame 0 == the screenshot), so no
//   blank or black frame ever shows, and a browser that refuses to play just keeps the still.
// - It starts from JS once `startAfter` resolves (the sheet: its open animation has finished),
//   plays once, holds the last frame, and offers Replay. Never loop / controls / autoplay.
// - A hidden tab pauses it; coming back resumes it. Unmount (the sheet closing) pauses it and
//   drops its buffered media.

type Props = {
  clip: ProjectClip;
  locale: Locale;
  /** Resolves when the clip may start. Stable (module-level) on purpose: it is an effect dep. */
  startAfter: () => Promise<unknown>;
};

// play() returns a promise that rejects when the browser declines (Low Power Mode, a detached
// element). Nothing to do then: the video only shows itself on `playing`, so the still stays.
function playQuietly(video: HTMLVideoElement) {
  const started = video.play() as Promise<void> | undefined;
  started?.catch(() => {});
}

export default function SheetClip({ clip, locale, startAfter }: Props) {
  const t = dict[locale];
  const [on, setOn] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  // "Should be playing": from the start (or a Replay) until `ended`. A hidden tab pauses without
  // clearing it, so coming back knows whether to resume.
  const wanted = useRef(false);

  useEffect(() => {
    if (!motionAllowed() || saveDataOn()) return;
    setOn(true);
    // Switching to reduced motion mid-clip removes the video; the still is underneath.
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setOn(false);
    };
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!on || !video) return;
    let alive = true;
    // React sets `muted` as a property only; set it again here so play() is never refused for
    // sound, whatever the browser read from the markup.
    video.muted = true;
    startAfter().then(
      () => {
        if (!alive) return;
        wanted.current = true;
        if (!document.hidden) playQuietly(video);
      },
      () => {},
    );
    const onVisibility = () => {
      if (document.hidden) video.pause();
      else if (wanted.current && video.paused && !video.ended) playQuietly(video);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      alive = false;
      wanted.current = false;
      document.removeEventListener('visibilitychange', onVisibility);
      video.pause();
      // load() on a paused, preload="none" element aborts any fetch and drops what was
      // buffered now, instead of whenever the detached element is garbage-collected.
      video.load();
    };
  }, [on, startAfter]);

  const replay = () => {
    const video = videoRef.current;
    if (!video) return;
    wanted.current = true;
    video.currentTime = 0;
    playQuietly(video);
  };

  if (!on) return null;
  return (
    <>
      <video
        ref={videoRef}
        className="sheet-clip"
        muted
        playsInline
        preload="none"
        disablePictureInPicture
        width={1580}
        height={900}
        aria-label={clip.label[locale]}
        data-playing={playing ? '' : undefined}
        onPlaying={() => setPlaying(true)}
        onEnded={() => {
          wanted.current = false;
          setEnded(true);
        }}
      >
        <source src={clip.webm} type="video/webm" />
        <source src={clip.mp4} type="video/mp4" />
      </video>
      {/* Stays once shown, also during a replay: removing the button a keyboard user just
          pressed would drop their focus to the page. Pressing it again restarts the clip. */}
      {ended && (
        <button type="button" className="btn ctl sheet-replay" onClick={replay}>
          <ReplayGlyph />
          <span className="sheet-replay-label">{t.sheetClipReplay}</span>
        </button>
      )}
    </>
  );
}
