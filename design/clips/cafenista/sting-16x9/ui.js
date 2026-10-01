/* Cafénista components rebuilt as HTML (same DOM order and class names as the React
   components on feat/m4-demo, prefixed t-/b-). Copy is verbatim from the real renders
   named next to each builder. Nothing here animates; index.html owns the timeline. */
window.CF = (function () {
  'use strict';

  /* ── Sparkline (components/telemetry/Sparkline.tsx + lib/telemetry/view.ts sparkGeometry)
     W 320 × H 72 viewBox, preserveAspectRatio none, pad 12 %, range at least 1 unit.
     The machine series is flat on its normal value, then steps down between 87.4 % and 88.9 %
     of the 15-minute window (measured on m1/dashboard-alert.light.png) and stays there.
     sparkGeometry saturates once the gap is 1 unit or more, so every gap from 1 °C up
     (the render shows 6.6 °C) draws the same picture; s = 0…1 walks the real autoscale
     from "flat, centred" (dashboard-normal) to that picture (dashboard-alert). */
  var W = 320, H = 72;
  function geometry(s) {
    // values: normal N, current N - s (s <= 1). lo/hi exactly as sparkGeometry.
    var N = 0, cur = -s;
    var lo = Math.min(N, cur), hi = Math.max(N, cur);
    if (hi - lo < 1) { var mid = (hi + lo) / 2; lo = mid - 0.5; hi = mid + 0.5; }
    var pad = (hi - lo) * 0.12; lo -= pad; hi += pad;
    var y = function (v) { return H - ((v - lo) / (hi - lo)) * H; };
    var r = function (n) { return Math.round(n * 100) / 100; };
    var xa = r(0.874 * W), xb = r(0.889 * W);
    return {
      line: '0,' + r(y(N)) + ' ' + xa + ',' + r(y(N)) + ' ' + xb + ',' + r(y(cur)) + ' ' + W + ',' + r(y(cur)),
      normalY: r(y(N)),
      dot: { x: W, y: r(y(cur)) },
    };
  }

  function spark(id, s) {
    var g = geometry(s);
    return (
      '<svg class="t-spark" id="' + id + '" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<line class="t-sparkNormal" x1="0" x2="' + W + '" y1="' + g.normalY + '" y2="' + g.normalY + '"/>' +
      '<polyline class="t-sparkLine" points="' + g.line + '"/>' +
      '<circle class="t-sparkDot" cx="' + g.dot.x + '" cy="' + g.dot.y + '" r="3.5"/>' +
      '</svg>'
    );
  }

  /* ── MachineCard (components/telemetry/MachineCard.tsx)
     before = m1/dashboard-normal.light.png · after = m1/dashboard-alert.light.png
     Both states are stacked in the same slots so the sting can cross between them. */
  function machineCard(pfx) {
    return (
      '<article class="t-card" id="' + pfx + 'machine">' +
        '<div class="t-cardHead">' +
          '<h3 class="t-cardTitle">เครื่องชง</h3>' +
          '<span class="pillSlot">' +
            '<span class="t-pill" data-tone="ok" id="' + pfx + 'pillOk" data-layout-allow-occlusion>ปกติ</span>' +
            '<span class="t-pill" data-tone="crit" id="' + pfx + 'pillCrit" data-layout-allow-occlusion>เย็นกว่าปกติ</span>' +
          '</span>' +
        '</div>' +
        '<div class="headSlot">' +
          '<p class="t-headline" id="' + pfx + 'headOk">ใกล้เคียงค่าปกติของเครื่องนี้</p>' +
          '<p class="t-headline" id="' + pfx + 'headCrit">ต่ำกว่าค่าปกติของเครื่องนี้ 6.6 °C</p>' +
        '</div>' +
        spark(pfx + 'spark', 0) +
        // the square cut lays the owner's alert over this foot on purpose
        '<div class="t-foot"><span data-layout-allow-occlusion data-layout-allow-overlap>จุดวัดผิวนอกเครื่องชง (เทียบกับค่าปกติของเครื่องนี้)</span><span data-layout-allow-occlusion data-layout-allow-overlap>ค่าล่าสุด 08:44</span></div>' +
      '</article>'
    );
  }

  /* ── AlertList row, open + not acknowledged (components/telemetry/AlertList.tsx)
     copy = m1/dashboard-alert.light.png */
  function ownerAlert(pfx) {
    return (
      '<div class="t-alert" id="' + pfx + 'ownerAlert" data-layout-allow-occlusion>' +
        '<span class="t-level"><span class="t-diamond"></span>ด่วน · ตั้งแต่ 08:43</span>' +
        '<span class="t-alertTitle">เครื่องชงเย็นกว่าปกติ</span>' +
        '<span class="t-alertDetail">ต่ำกว่าค่าปกติของเครื่องนี้ 6.6 °C · เพิ่งเริ่ม</span>' +
        '<div class="t-alertFoot"><button type="button" class="t-ack">รับทราบ</button></div>' +
      '</div>'
    );
  }

  /* ── Bar pieces (components/bar/*) · copy = m1/bar-alert-live.light.png */
  var CHEVRON =
    '<svg width="8" height="13" viewBox="0 0 8 13" aria-hidden="true"><path d="m1.5 1.5 5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var BEANS = [
    { name: 'เชียงใหม่ แม่แตง · Washed', color: 'var(--series-1)', grind: 20 },
    { name: 'น่าน · Natural', color: 'var(--series-2)', grind: 19 },
    { name: 'Ethiopia Guji · Washed', color: 'var(--series-3)', grind: 18 },
  ];

  function barHeader() {
    return (
      '<header class="b-header">' +
        '<div class="b-titleBlock"><h1 class="b-title">หน้าบาร์</h1><span class="b-subtitle">บาริสต้า A · 08:44</span></div>' +
        '<div class="b-headerActions"><button type="button" class="b-textButton">เปลี่ยนคน</button></div>' +
      '</header>'
    );
  }

  function barAlert(pfx) {
    return (
      '<section class="b-alertCard" id="' + pfx + 'barAlert">' +
        '<div class="b-alertText">' +
          '<span class="b-alertLevel"><span class="b-diamond"></span>ด่วน · ตั้งแต่ 08:44</span>' +
          '<span class="b-alertTitle">เครื่องชงเย็นกว่าปกติ</span>' +
        '</div>' +
        '<button type="button" class="b-primarySmall" id="' + pfx + 'checkShot">ชงช็อตตรวจ</button>' +
      '</section>'
    );
  }

  function beanCard(pfx, i) {
    var b = BEANS[i];
    var seg = ['เปรี้ยว', 'พอดี', 'ขม']
      .map(function (t, k) {
        return (
          '<button type="button" class="b-seg" id="' + pfx + 'seg' + i + '_' + k + '">' +
          '<span class="b-segOn" id="' + pfx + 'segOn' + i + '_' + k + '"></span>' +
          '<span class="b-segLabel">' + t + '</span></button>'
        );
      })
      .join('');
    return (
      '<article class="b-card" id="' + pfx + 'bean' + i + '">' +
        '<div class="b-cardTop">' +
          '<span class="b-beanName"><span class="b-swatch" style="background:' + b.color + '"></span>' + b.name + '</span>' +
          '<button type="button" class="b-chevronLink">จดละเอียด' + CHEVRON + '</button>' +
        '</div>' +
        '<span class="b-grindLine">Espresso · เบอร์ ' + b.grind + ' · ยังไม่ dial-in วันนี้</span>' +
        '<div class="b-segment">' + seg + '</div>' +
      '</article>'
    );
  }

  function barHome(pfx, beans) {
    var n = beans === undefined ? 3 : beans;
    var cards = '';
    for (var i = 0; i < n; i++) cards += beanCard(pfx, i);
    return (
      '<div class="b-app" id="' + pfx + 'home">' +
        barHeader() +
        barAlert(pfx) +
        '<section class="b-beansCol"><span class="b-hint">ชิมแล้วแตะรส บันทึกทันที</span>' + cards + '</section>' +
      '</div>'
    );
  }

  /* ── SavedScreen (components/bar/SavedScreen.tsx) · layout + copy = m2/bar-saved.light.png
     The detail line is "เบอร์ · clockHM(loggedAt) · barista". The render's fixture clock read
     14:04; here the tap happens on the 08:44 bar screen, so the app would print 08:44. */
  function savedScreen(pfx) {
    return (
      '<div class="b-overlay" id="' + pfx + 'saved" data-layout-allow-occlusion>' +
        '<div class="b-savedBody">' +
          '<span class="b-checkCircle" id="' + pfx + 'checkCircle"><svg width="48" height="48" viewBox="0 0 20 20" aria-hidden="true">' +
            '<path id="' + pfx + 'checkPath" d="m4.5 10.5 3.5 3.5 7.5-8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>' +
          '<h1 class="b-savedTitle" data-layout-allow-overlap>บันทึกแล้ว</h1>' +
          '<span class="b-savedWhat" data-layout-allow-overlap><span class="b-swatch" style="background:var(--series-1);width:12px;height:12px"></span>เชียงใหม่ แม่แตง · Washed · รสพอดี</span>' +
          '<span class="b-muted" data-layout-allow-overlap>เบอร์ 20 · 08:44 · บาริสต้า A</span>' +
        '</div>' +
        '<div class="b-savedActions">' +
          '<button type="button" class="b-primary" data-layout-allow-overlap>กลับหน้าบาร์</button>' +
          '<div class="b-savedFoot"><span data-layout-allow-overlap>กลับเองใน 3 วินาที</span><span aria-hidden="true">·</span><button type="button" class="b-linkButton" data-layout-allow-overlap>บันทึกผิด แก้</button></div>' +
        '</div>' +
      '</div>'
    );
  }

  return { geometry: geometry, machineCard: machineCard, ownerAlert: ownerAlert, barHome: barHome, barAlert: barAlert, beanCard: beanCard, savedScreen: savedScreen, W: W, H: H };
})();
