// vp.mjs — turn a capture (tools/capture.mjs) into the "viewport box" markup the compositions embed.
// The box stands in for the browser viewport: the body's sky gradient and the fixed glow layer become the box's
// own backgrounds (same px as the live page), the page scroll becomes a translate on .vp-scroller, and the sticky
// header is held at the top by the same amount.
import fs from 'node:fs';
import path from 'node:path';

export function vpMarkup(captureDir, cut, { scroll = 0, headerOnly = false, idPrefix = '' } = {}) {
  const vp = JSON.parse(fs.readFileSync(path.join(captureDir, cut, 'vp.json'), 'utf8'));
  let app = fs.readFileSync(path.join(captureDir, cut, 'app.html'), 'utf8');
  if (idPrefix) app = app.replace(/(\sid=")/g, `$1${idPrefix}`).replace(/(\s(?:aria-labelledby|aria-describedby|aria-controls|for)=")([^"]*)"/g, (m, a, v) => a + v.split(/\s+/).map((x) => (x.startsWith(cut + '-') ? idPrefix + x : x)).join(' ') + '"');
  if (headerOnly) {
    const m = app.match(/^<div class="app">([\s\S]*?<\/header>)/);
    if (!m) throw new Error('header not found');
    app = '<div class="app">' + m[1] + '</div>';
  }
  const g = vp.glow, b = vp.body;
  const style = [
    `width:${vp.width}px`, `height:${vp.height}px`, 'position:relative', 'overflow:hidden',
    `background-color:${b.backgroundColor}`,
    `background-image:${g.backgroundImage}, ${b.backgroundImage}`,
    `background-size:${g.backgroundSize}, ${vp.width}px ${vp.height}px`,
    `background-position:${g.backgroundPosition}, 0px 0px`,
    `background-repeat:${g.backgroundRepeat}, no-repeat`,
    'background-attachment:scroll',
  ].join(';');
  return `<div class="vp-${cut}" lang="${vp.lang}" data-tab="${vp.tab}" style="${style}"><div class="vp-scroller" data-scroll="${scroll}">${app}</div></div>`;
}

// Runtime CSS shared by every page that embeds a box: no CSS animation or transition inside the app (the sting's
// one GSAP timeline owns all motion), and the sticky header pinned through the scroll translate.
export const VP_RUNTIME_CSS = `
.vp-d, .vp-p { text-align: left; }
.vp-d *, .vp-d *::before, .vp-d *::after, .vp-p *, .vp-p *::before, .vp-p *::after { animation: none !important; transition: none !important; }
.vp-scroller { position: absolute; left: 0; top: 0; width: 100%; }
.vp-scroller > .app { min-height: 0; }
`;
