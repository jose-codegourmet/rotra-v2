import * as rive from '@rive-app/canvas'

// Boot: the loading screen (#boot, SiteBoot.tsx). Runs after initSite and initRive, in the same task as
// hydration, so the page under the screen is already wired.
//   1. The page is locked (html.booting; the main script holds Lenis until 'rotra:ready').
//   2. art/boot.riv replaces the still mark. Its view model: progress (0..1) fills the inner ring, out = 1 plays
//      the exit (the mark flies at the camera).
//   3. The art the visitor meets first is fetched into the HTTP cache (the same URLs the page and the Rive loaders
//      ask for later), six at a time: on desktop the whole view being opened, on phones and touch its first two
//      screens. Files that fail still count: the page has its own stills. The rest is fetched behind the shown page
//      (see "what to load").
//   5. ROTRA_PT (below) reuses the screen and the file as the transition between views.
//   4. When all are in (and at least MIN ms have passed, at most MAX), the exit plays and the screen is removed.
export function initBoot() {
  var el = document.getElementById('boot');
  if (!el) return;
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var PHONE = window.matchMedia('(max-width: 700px)').matches;
  var FLAT = window.matchMedia('(max-width: 700px), (hover: none), (pointer: coarse)').matches;
  var MIN = 1400, MAX = 25000, t0 = performance.now();
  var pctEl = document.getElementById('boot-pct'), mark = el.querySelector('.boot-mark');
  root.classList.add('booting');
  // nothing scrolls under the screen (Lenis is held by the main script; this covers native wheel and touch)
  function block(e){ e.preventDefault(); }
  window.addEventListener('wheel', block, { passive: false, capture: true });
  window.addEventListener('touchmove', block, { passive: false, capture: true });

  // ---- what to load
  // Light first. The screen waits only for what the visitor meets first; the rest arrives behind the shown page.
  //   Desktop: all the art of the view being opened (the screen is there anyway, so it buys that time).
  //   Phones and touch: the stills within two screens of the top of that view and the Rive files within one.
  // Scene layers count as their light copies (art/lite/), or as the originals where the scene file does not play
  // (reduced motion, touch above 700 px). After 'rotra:ready' the rest of the view, the footer and (desktop only)
  // the other views are fetched two at a time at low priority; pointing at, touching or focusing a link to another
  // view moves that view's art to the front. Nothing is prefetched for a visitor on data saver or a 2G connection.
  var CHR = window.ROTRA_CHR, SCN = window.ROTRA_SCN;
  var STILLS = reduce || FLAT;
  var CONN = navigator.connection || {};
  var SAVE = !!CONN.saveData || /(^|-)2g$/.test(CONN.effectiveType || '');
  var VH = window.innerHeight;
  function near(el, riv){ var b = el.getBoundingClientRect(); return (b.width || b.height) ? b.top < VH * (riv ? 1 : 2) : false; }
  function assets(root, pick){
    var out = [];
    function add(u, el, riv){ if (!u || /^data:/.test(u) || (pick && !pick(el, riv))) return; out.push(u); }
    Array.prototype.forEach.call(root.querySelectorAll('img'), function(img){
      if (!img.classList.contains('ly')) { add(img.getAttribute('src'), img); return; }
      if (img.classList.contains('m') !== PHONE) return;   // one tall still on phones, three layers otherwise
      add((STILLS && !PHONE && img.getAttribute('data-full')) || img.getAttribute('src'), img);
    });
    Array.prototype.forEach.call(root.querySelectorAll('.hx-bg'), function(c){ add('/hero-a/still.webp', c); });
    Array.prototype.forEach.call(root.querySelectorAll('.has-av'), function(c){
      var m = /url\(["']?([^"')]+)/.exec(c.style.backgroundImage || '');
      if (m) add(m[1], c);
    });
    if (CHR) Array.prototype.forEach.call(root.querySelectorAll('.chr[data-char]'), function(c){
      var name = c.getAttribute('data-char');
      add(CHR.still(name), c);
      if (!reduce) add(CHR.riv(name), c, true);
    });
    if (!reduce) {
      Array.prototype.forEach.call(root.querySelectorAll('[data-riv]'), function(c){ add(c.getAttribute('data-riv'), c, true); });
      if (!FLAT && SCN) Array.prototype.forEach.call(root.querySelectorAll('.bgl[data-bg-scene]'), function(c){
        add('/art/scenes/' + c.getAttribute('data-bg-scene') + '.riv?v=' + SCN.v, c, true);
      });
    }
    return out;
  }
  var started = {};
  function fresh(list){ return list.filter(function(u){ if (started[u]) return false; started[u] = 1; return true; }); }
  var cur = document.querySelector('.view:not([hidden])') || document.body;
  var urls = fresh(assets(cur, FLAT ? near : null));
  // behind the shown page, in this order: the rest of this view, what is outside the views (footer), the other views
  window.ROTRA_BOOT = { first: urls.slice() };   // what the screen waits for (for checks in the console)
  var rest = assets(cur, null).concat(assets(document, function(el){ return !el.closest('.view'); }));
  if (!FLAT) Array.prototype.forEach.call(document.querySelectorAll('.view'), function(v){ if (v !== cur) rest = rest.concat(assets(v, null)); });

  // ---- the Rive mark
  var vmP = null, vmOut = null, shown = 0, target = 0, live = true;
  if (!reduce) (function(){
    var cv = document.createElement('canvas');
    cv.className = 'boot-riv'; cv.style.visibility = 'hidden';
    mark.appendChild(cv);
    var d = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(cv.clientWidth * d); cv.height = Math.round(cv.clientHeight * d);
    var r = new rive.Rive({
      src: '/art/boot.riv', canvas: cv, autoplay: true, stateMachine: 'Main', autoBind: true,
      layout: new rive.Layout({ fit: rive.Fit.Contain, alignment: rive.Alignment.Center }),
      onLoad: function(){
        r.resizeToCanvas();
        var vm = r.viewModelInstance;
        vmP = vm && vm.number('progress'); vmOut = vm && vm.number('out');
        if (vmP) vmP.value = shown;
        function first(){ r.off(rive.EventType.Advance, first); cv.style.visibility = ''; el.classList.add('boot-live'); }
        r.on(rive.EventType.Advance, first);
      },
      onLoadError: function(){ cv.remove(); }
    });
    el._rive = r;
  })();

  // ---- progress: the number and the ring ease toward what has loaded
  function tick(){
    if (!live) return;
    shown += (target - shown) * .14;
    if (target - shown < .002) shown = target;
    if (pctEl) pctEl.textContent = String(Math.round(shown * 100));
    if (vmP) vmP.value = shown;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  var total = urls.length + 1, done = 0, finished = false;
  function step(){ done++; target = Math.min(1, done / total); if (done >= total) finish(); }
  function finish(){
    if (finished) return;
    finished = true; target = 1;
    var wait = Math.max(0, MIN - (performance.now() - t0)) + 320;   // + the ring's last stretch
    setTimeout(function(){
      shown = 1; if (pctEl) pctEl.textContent = '100'; if (vmP) vmP.value = 1;
      if (vmOut) vmOut.value = 1;
      el.classList.add('boot-out');
      window.removeEventListener('wheel', block, { capture: true });
      window.removeEventListener('touchmove', block, { capture: true });
      root.classList.remove('booting');
      window.dispatchEvent(new Event('rotra:ready'));
      setTimeout(function(){
        live = false;
        try { if (el._rive) el._rive.cleanup(); } catch (e) {}
        el.remove();
      }, 900);
    }, wait);
  }
  // ---- Page transition (ROTRA_PT.run(swap), called by the main script's router on a change of view): the same mark
  // on the same dark screen. 0 ms the screen fades in and the mark lands from the camera (the file's Intro, intro = 1);
  // PT_SWAP ms the view is swapped behind it; PT_OUT ms the mark flies out (out = 1) and the screen fades.
  var PT_SWAP = 360, PT_OUT = 760, ptBusy = false, ptBuf = null;
  fetch('/art/boot.riv').then(function(res){ return res.arrayBuffer(); }).then(function(b){ ptBuf = b; }).catch(function(){});
  window.ROTRA_PT = { run: function(swap){
    if (ptBusy || reduce || !document.body.contains(document.querySelector('.view'))) { swap(); return; }
    ptBusy = true;
    var pt = document.createElement('div');
    pt.className = 'boot pt'; pt.setAttribute('aria-hidden', 'true');
    pt.innerHTML = '<div class="boot-in"><div class="boot-mark"></div><svg class="boot-wm" viewBox="140 28 187 58"><use href="#logo-full" width="324.21" height="120.56"/></svg></div>';
    document.body.appendChild(pt);
    var r = null, out = null;
    if (ptBuf) {
      var cv = document.createElement('canvas');
      cv.className = 'boot-riv';
      pt.querySelector('.boot-mark').appendChild(cv);
      var d = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(cv.clientWidth * d); cv.height = Math.round(cv.clientHeight * d);
      try {
        r = new rive.Rive({
          buffer: ptBuf.slice(0), canvas: cv, autoplay: false, stateMachine: 'Main', autoBind: true,
          layout: new rive.Layout({ fit: rive.Fit.Contain, alignment: rive.Alignment.Center }),
          onLoad: function(){
            r.resizeToCanvas();
            var vm = r.viewModelInstance, a = vm && vm.number('intro'), b = vm && vm.number('progress');
            if (a) a.value = 1;
            if (b) b.value = 1;
            out = vm && vm.number('out');
            r.play();
          }
        });
      } catch (e) { r = null; }
    }
    window.addEventListener('wheel', block, { passive: false, capture: true });
    window.addEventListener('touchmove', block, { passive: false, capture: true });
    void pt.offsetWidth; pt.classList.add('on');
    setTimeout(swap, PT_SWAP);
    setTimeout(function(){
      if (out) out.value = 1;
      pt.classList.add('boot-out');
      window.removeEventListener('wheel', block, { capture: true });
      window.removeEventListener('touchmove', block, { capture: true });
    }, PT_OUT);
    setTimeout(function(){
      try { if (r) r.cleanup(); } catch (e) {}
      pt.remove(); ptBusy = false;
    }, PT_OUT + 650);
  } };

  function get(u, low){
    return fetch(u, low ? { credentials: 'same-origin', priority: 'low' } : { credentials: 'same-origin' })
      .then(function(res){ return res.ok ? res.blob() : null; }).catch(function(){});
  }
  var queue = urls.slice(), running = 0;
  function pump(){
    while (running < 6 && queue.length) (function(u){
      running++;
      get(u).then(function(){ running--; step(); pump(); });
    })(queue.shift());
  }
  pump();

  // ---- behind the shown page
  var bg = [], bgRun = 0, bgMax = 2, bgOn = false;
  function bgPump(){
    if (!bgOn) return;
    while (bgRun < bgMax && bg.length) {
      var u = bg.shift();
      if (started[u]) continue;
      started[u] = 1; bgRun++;
      get(u, true).then(function(){ bgRun--; bgPump(); });
    }
  }
  if (!SAVE) {
    bg = rest.filter(function(u){ return !started[u]; });
    window.addEventListener('rotra:ready', function(){
      var go = function(){ bgOn = true; bgPump(); };
      if (window.requestIdleCallback) window.requestIdleCallback(go, { timeout: 2500 }); else setTimeout(go, 1200);
    });
    // a link to another view, pointed at, touched or focused: that view's art goes first
    var VIEW_OF = { partners: 'clubs', pricing: 'request' };
    var intent = function(e){
      var a = e.target && e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      var h = a.getAttribute('href').slice(1);
      var v = document.querySelector('.view[data-view="' + (VIEW_OF[h] || h).replace(/[^\w-]/g, '') + '"]');
      if (!v && h) { var t = document.getElementById(h); v = t && t.closest('.view'); }
      if (!v || !v.hidden || v._pf) return;
      v._pf = true;
      var first = assets(v, null).filter(function(u){ return !started[u]; });
      bg = first.concat(bg);
      bgMax = 4; bgOn = true; bgPump();
    };
    document.addEventListener('pointerover', intent, { passive: true });
    document.addEventListener('touchstart', intent, { passive: true });
    document.addEventListener('focusin', intent);
  }
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).catch(function(){}).then(step);
  setTimeout(finish, MAX);
}
