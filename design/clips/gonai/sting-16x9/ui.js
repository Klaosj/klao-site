/* GoNai components rebuilt as HTML for the sting: same DOM order, class names and copy as the
   React components on GoNai main @5c30e78, filled with one real plan made on a local dev server
   (JSON store, nothing written to production; see tools/capture.mjs and BRIEF.md).
   ui.css is the app's own compiled CSS, so every class below resolves exactly as in the app.
   Nothing here animates; index.html owns the timeline. */
window.GN = (function () {
  'use strict';

  /* The plan (GET /api/plans/<id> on the local server, 1 Oct 2026): work day from Lat Phrao,
     budget 450, route R003 (cheapest) with R004 as the alternative, two catalog venues that the
     app itself labels "(sample)". est_total 410 is the app's own number (expandPlan). */
  var PLAN = {
    origin: 'Lat Phrao',
    budget: 450,
    est: 410,
    route: {
      kind: 'Cheapest', min: 64, mins: 33,
      legs: [
        { emoji: '🚶', mode: 'Walk', detail: 'Walk to BTS Ha Yaek Lat Phrao', price: '0฿', mins: 5 },
        { emoji: '🚈', mode: 'BTS', detail: 'BTS to Siam', price: '64฿', mins: 28 },
      ],
    },
    alt: { kind: 'Fastest', price: '150–180฿', mins: 30 },
    stops: [
      { emoji: '☕', name: 'Beans Bar Mezzanine (sample)', cost: 150, walk: 3, time: ['10:00', '11:30'] },
      { emoji: '🍜', name: "Grandma's Kitchen (sample)", cost: 150, walk: 5, time: ['11:38', '12:53'] },
    ],
    // share page timeline (lib/timeline buildTimeline, as rendered on /p/<id>)
    share: { title: '💻 Work session from Lat Phrao · 450฿', leave: '09:24', transitMin: 36, fare: 64, walkBetween: 8 },
  };

  /* app/app/plan/[id]/page.tsx · header (status draft → "Your plan") */
  function planHeader() {
    return (
      '<div class="flex items-center justify-between gap-3" id="gn-head">' +
        '<div>' +
          '<h1 class="o-serif text-[22px] font-medium text-ink">Your plan</h1>' +
          '<p class="text-sm text-mut">' + PLAN.origin + ' → Siam</p>' +
        '</div>' +
      '</div>'
    );
  }

  /* components/RouteLegs.tsx + components/BahtChip.tsx (one paid leg → "BTS 64฿") */
  function routeCard(id) {
    var r = PLAN.route, legs = '';
    for (var i = 0; i < r.legs.length; i++) {
      var l = r.legs[i];
      legs +=
        '<li class="flex items-baseline gap-2 py-1.5 text-sm first:pt-0 last:pb-0">' +
          '<span>' + l.emoji + '</span>' +
          '<span class="flex-1 text-ink"><b class="o-mono text-[11px] text-ink">' + l.mode + '</b> — ' + l.detail + '</span>' +
          '<span class="text-mut">' + l.price + ' · ' + l.mins + ' min</span>' +
        '</li>';
    }
    return (
      '<div class="gn-card-e p-4" id="' + id + '">' +
        '<div class="mb-2 flex items-center justify-between gap-2">' +
          '<span title="BTS 64฿" class="o-mono inline-flex items-center gap-x-1 whitespace-nowrap rounded-full border border-line bg-bg/70 px-2.5 py-1 text-[10.5px] text-accent backdrop-blur-sm ">' +
            '<span>BTS <b class="font-semibold">64฿</b></span>' +
          '</span>' +
          '<span class="text-xs text-mut">' + r.mins + ' min · one way</span>' +
        '</div>' +
        '<ol class="mb-3 divide-y divide-line">' + legs + '</ol>' +
        '<button class="gn-press o-pill-dark o-btn-label w-full px-3 py-1.5 text-[13px]">' +
          r.kind + ' ' + r.min + '฿ · ' + r.mins + ' min <span class="mx-1 text-accent">⇄</span> ' +
          PLAN.alt.kind + ' ' + PLAN.alt.price + ' · ' + PLAN.alt.mins + ' min' +
        '</button>' +
      '</div>'
    );
  }

  /* app/app/plan/[id]/plan-view.tsx · one stop row (CATEGORY_EMOJI: cafe ☕, restaurant 🍜) */
  function stopCard(i, id) {
    var s = PLAN.stops[i];
    return (
      '<li class="gn-card-e flex items-center gap-3 p-4" id="' + id + '">' +
        '<span class="o-mono flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-card-solid text-[15px]">' + s.emoji + '</span>' +
        '<div class="min-w-0 flex-1">' +
          '<p class="truncate font-medium text-ink">' + s.name + '</p>' +
          '<p class="text-xs text-mut">~' + s.cost + '฿/person · ' + s.walk + ' min walk from BTS Siam</p>' +
        '</div>' +
        '<div class="gn-num whitespace-nowrap font-semibold text-ink">~' + s.cost + '฿</div>' +
      '</li>'
    );
  }

  /* components/MoneyProgress.tsx (label "Estimated", value 410, target 450 → 91 %, tone ok).
     The fill starts empty: the sting fills it (the app's .gn-bar animates width). */
  function money(id, barId) {
    return (
      '<div class="gn-card-e p-4" id="' + id + '">' +
        '<div class="mb-2 flex items-center justify-between text-sm text-ink">' +
          '<span>Estimated <b class="gn-num text-ok">~' + PLAN.est + '฿</b> / budget <b class="gn-num">' + PLAN.budget + '฿</b></span>' +
          '<button class="gn-press text-accent underline underline-offset-2">✎ Edit budget</button>' +
        '</div>' +
        '<div class="h-1 overflow-hidden rounded-full bg-line w-full">' +
          '<div class="gn-bar h-full rounded-full bg-ok" id="' + barId + '" style="width: 0%;"></div>' +
        '</div>' +
      '</div>'
    );
  }
  var BAR_PCT = Math.min(100, Math.round((PLAN.est / PLAN.budget) * 100)); // 91, as MoneyProgress

  /* app/p/[id]/page.tsx card + components/StopTimelineList.tsx (variant "readonly") */
  function shareCard(id) {
    var sh = PLAN.share, rows = '';
    for (var i = 0; i < PLAN.stops.length; i++) {
      var s = PLAN.stops[i];
      rows +=
        '<div>' +
          (i > 0 ? '<p class="o-mono py-1 pl-9 text-mut text-[10px]">≤ ' + sh.walkBetween + ' min walk</p>' : '') +
          '<div class="flex gap-2.5 border-b border-dashed border-line py-2.5 last:border-b-0">' +
            '<div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line bg-card-solid text-[13px]">' + s.emoji + '</div>' +
            '<div class="min-w-0 flex-1">' +
              '<b class="text-[13.5px]">' + s.name + '</b>' +
              '<small class="block leading-relaxed text-mut">~' + s.time[0] + '–' + s.time[1] + ' · ' + s.walk + ' min from BTS Siam</small>' +
            '</div>' +
            '<div class="gn-num whitespace-nowrap font-semibold">~' + s.cost + '฿</div>' +
          '</div>' +
        '</div>';
    }
    return (
      '<div class="gn-card-e gn-rise p-5" id="' + id + '">' +
        '<p class="o-mono text-[10px] text-mut">SHARED PLAN · VIEW ONLY</p>' +
        '<h1 class="o-serif mt-1 text-[22px] font-medium leading-snug">' + sh.title + '</h1>' +
        '<div class="mt-3 flex flex-col">' +
          '<p class="mt-1.5 text-[13px] text-mut">Leave ' + PLAN.origin + ' ~<b class="text-ink">' + sh.leave + '</b> · ' + sh.transitMin + ' min to the first stop · ' + sh.fare + '฿ transport</p>' +
          rows +
        '</div>' +
        '<div class="mt-3 flex flex-col gap-1 rounded-xl border border-line bg-card-solid/60 px-3 py-2.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">' +
          '<span class="o-mono text-[10px] text-mut sm:shrink-0">EST. TOTAL INCL. TRANSPORT</span>' +
          '<span class="gn-num whitespace-nowrap text-[22px] font-semibold">~' + PLAN.est + '฿ <span class="text-[12px] font-normal text-mut">/ ' + PLAN.budget + '฿ budget</span></span>' +
        '</div>' +
      '</div>'
    );
  }

  /* Fonts: the faces are unicode-range subsets, so ask for every weight the screens use
     (with the baht sign, which lives in the Thai subset) before the timeline is built. */
  function fontsReady() {
    var faces = [
      '400 16px "IBM Plex Sans Thai"', '500 16px "IBM Plex Sans Thai"',
      '600 16px "IBM Plex Sans Thai"', '700 16px "IBM Plex Sans Thai"',
      '400 16px "IBM Plex Mono"', '500 16px "IBM Plex Mono"', '600 16px "IBM Plex Mono"', '700 16px "IBM Plex Mono"',
    ];
    return Promise.all(faces.map(function (f) { return document.fonts.load(f, 'Aa0~·—฿'); }))
      .then(function () { return document.fonts.ready; });
  }

  return { PLAN: PLAN, BAR_PCT: BAR_PCT, planHeader: planHeader, routeCard: routeCard, stopCard: stopCard, money: money, shareCard: shareCard, fontsReady: fontsReady };
})();
