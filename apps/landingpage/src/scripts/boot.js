import * as rive from '@rive-app/canvas'

// Boot: the loading screen (#boot, SiteBoot.tsx). Runs after initSite and initRive, in the same task as
// hydration, so the page under the screen is already wired.
//   1. The page is locked (html.booting; the main script holds Lenis until 'rotra:ready').
//   2. art/boot.riv replaces the still mark. Its view model: progress (0..1) fills the inner ring, out = 1 plays
//      the exit (the mark flies at the camera).
//   3. Every art file this device will use, on every view, is fetched into the HTTP cache (the same URLs the page
//      and the Rive loaders ask for later), six at a time. Files that fail still count: the page has its own stills.
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
  var urls = [], seen = {};
  function add(u){ if (!u || /^data:/.test(u) || seen[u]) return; seen[u] = 1; urls.push(u); }
  Array.prototype.forEach.call(document.images, function(img){
    var layer = img.classList.contains('ly');
    if (layer && img.classList.contains('m') !== PHONE) return;   // one tall still on phones, three layers otherwise
    add(img.getAttribute('src'));
  });
  add('/hero-a/still.webp');
  var CHR = window.ROTRA_CHR, SCN = window.ROTRA_SCN;
  Array.prototype.forEach.call(document.querySelectorAll('.chr[data-char]'), function(c){
    var name = c.getAttribute('data-char');
    if (!CHR) return;
    add(CHR.still(name));
    if (!reduce) add(CHR.riv(name));
  });
  if (window.ROTRA_AV) window.ROTRA_AV.list.forEach(function(k){ add(window.ROTRA_AV.url(k)); });
  if (!reduce) {
    Array.prototype.forEach.call(document.querySelectorAll('[data-riv]'), function(c){ add(c.getAttribute('data-riv')); });
    if (!FLAT && SCN) Array.prototype.forEach.call(document.querySelectorAll('.bgl[data-bg-scene]'), function(c){
      add('/art/scenes/' + c.getAttribute('data-bg-scene') + '.riv?v=' + SCN.v);
    });
  }

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

  var queue = urls.slice(), running = 0;
  function pump(){
    while (running < 6 && queue.length) (function(u){
      running++;
      fetch(u, { credentials: 'same-origin' }).then(function(res){ return res.ok ? res.blob() : null; }).catch(function(){})
        .then(function(){ running--; step(); pump(); });
    })(queue.shift());
  }
  pump();
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).catch(function(){}).then(step);
  setTimeout(finish, MAX);
}
