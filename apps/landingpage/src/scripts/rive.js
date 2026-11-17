import * as rive from '@rive-app/canvas'

// Rive: the hero hall, the section scenes and every character. Moved verbatim from the old index.html.
export function initRive() {
  // The code checks window.rive, the old CDN global
  window.rive = rive;
// ---- Rive: the hero hall (data-riv), the section scenes (.bgl[data-bg-scene]) and every character (.chr[data-char]).
// If the runtime or a file fails, the still (or the section's three layers) stays ----
// data-riv-fit="fill" fills the element (the hero hall); data-riv-parallax feeds the file's view model (see heroParallax)
(function(){
  if (!window.rive) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Depth parallax, shared by the hero hall and the section scenes: every frame the page writes the file's view
  // model numbers px, py (pointer, -1..1, eased over .18 s) and scroll (0..1, from the caller); in the file each
  // element's group moves by depth x those inputs. Desktop only (owner's decision): on touch devices and at 700 px
  // and below the file gets zeros and its rest scroll, so it is a still stacked picture with its idle animation.
  // Checked every frame, so a resize applies.
  var FLAT = window.matchMedia('(max-width: 700px), (hover: none), (pointer: coarse)');
  var PTR = { x: 0, y: 0 };
  if (!reduce && window.matchMedia('(hover: hover) and (pointer: fine)').matches) window.addEventListener('pointermove', function(e){
    if (e.pointerType && e.pointerType !== 'mouse') return;
    PTR.x = Math.max(-1, Math.min(1, e.clientX / window.innerWidth * 2 - 1));
    PTR.y = Math.max(-1, Math.min(1, e.clientY / window.innerHeight * 2 - 1));
  }, { passive: true });
  // scroll(): 0..1; rest: the scroll written when flat; frame(cx, cy, s, now): after each write. False if the file
  // has no px/py/scroll view model.
  function depthParallax(r, scroll, rest, frame){
    var vm = r.viewModelInstance;
    var pX = vm && vm.number('px'), pY = vm && vm.number('py'), pS = vm && vm.number('scroll');
    if (!pX || !pY || !pS) return false;
    var cx = 0, cy = 0, last = 0;
    r.on(rive.EventType.Advance, function(){
      var now = performance.now(), dt = last ? Math.min(.1, (now - last) / 1000) : 0;
      last = now;
      var k = 1 - Math.exp(-dt / .18);
      cx += (PTR.x - cx) * k; cy += (PTR.y - cy) * k;
      var s = scroll();
      if (FLAT.matches) { cx = cy = PTR.x = PTR.y = 0; s = rest; }
      pX.value = cx; pY.value = cy; pS.value = s;
      if (frame) frame(cx, cy, s, now);
    });
    return true;
  }

  document.querySelectorAll('[data-riv]').forEach(function(el){
    var fill = el.getAttribute('data-riv-fit') === 'fill';
    var parallax = el.hasAttribute('data-riv-parallax');
    var cv = document.createElement('canvas'); cv.className = 'riv'; cv.style.visibility = 'hidden';
    el.appendChild(cv);
    function reveal(){ el.classList.remove('sheet'); el.style.backgroundImage = 'none'; cv.style.visibility = ''; }
    var r = new rive.Rive({
      src: el.getAttribute('data-riv'), canvas: cv, autoplay: true, stateMachine: 'Main', autoBind: parallax,
      layout: new rive.Layout(fill ? { fit: rive.Fit.Fill, alignment: rive.Alignment.Center }
                                   : { fit: rive.Fit.Contain, alignment: rive.Alignment.BottomCenter }),
      onLoad: function(){
        r.resizeDrawingSurfaceToCanvas();
        if (parallax) heroParallax(el, cv, r, reveal); else reveal();
      },
      onLoadError: function(){ cv.remove(); }
    });
    window.addEventListener('resize', function(){ if (cv.isConnected) r.resizeDrawingSurfaceToCanvas(); });
  });

  // Characters: one looping Rive file per pose (CHR.riv) over its .webp still (CHR.still), Contain, bottom centre.
  // An instance exists only while its element is within one screen of the viewport (beyond that it is destroyed and
  // the still shows), and it plays only while the element is on screen and not faded out (story scenes).
  // The canvas appears on its first drawn frame (the file's images are decoded before onLoad), so the still never
  // gives way to an empty box; pages never read pixels from these canvases. Backing store: layout px x min(2, dpr).
  var CHR = window.ROTRA_CHR;
  if (CHR && !reduce) (function(){
    var els = Array.prototype.slice.call(document.querySelectorAll('.chr[data-char]'));
    var live = [];
    function fit(el){
      var cv = el._cv, d = Math.min(2, window.devicePixelRatio || 1);
      var w = Math.max(1, Math.round(el.clientWidth * d)), h = Math.max(1, Math.round(el.clientHeight * d));
      if (cv.width === w && cv.height === h) return false;
      cv.width = w; cv.height = h; return true;
    }
    function onScreen(el){
      if (!el._in) return false;
      for (var n = el; n && n !== document.body; n = n.parentElement) {
        var cs = getComputedStyle(n);
        if (+cs.opacity < 0.02 || cs.visibility === 'hidden' || cs.display === 'none') return false;
      }
      return true;
    }
    function sync(el){
      if (!el._r || !el._ready) return;
      var on = onScreen(el);
      if (on && !el._playing) { el._r.play(); el._playing = true; }
      else if (!on && el._playing) { el._r.pause(); el._playing = false; }
    }
    function destroy(el){
      var r = el._r;
      if (!r) return;
      el._r = null; el._ready = el._playing = el._chrShown = false;
      CHR.showStill(el);
      try { r.cleanup(); } catch (e) {}
      if (el._cv) { el._cv.remove(); el._cv = null; }
      var i = live.indexOf(el); if (i >= 0) live.splice(i, 1);
    }
    function create(el){
      if (el._r || !el.clientWidth || !el.clientHeight) return;
      var name = el.getAttribute('data-char');
      if (el._fail && el._fail[name]) return;
      var cv = el._cv = document.createElement('canvas');
      cv.className = 'riv'; cv.style.visibility = 'hidden';
      el.appendChild(cv); fit(el);
      live.push(el);
      var r = el._r = new rive.Rive({
        src: CHR.riv(name), canvas: cv, autoplay: true, stateMachine: 'Main',
        layout: new rive.Layout({ fit: rive.Fit.Contain, alignment: rive.Alignment.BottomCenter }),
        onLoad: function(){
          if (el._r !== r) return;
          fit(el); r.resizeToCanvas();
          el._ready = el._playing = true;
          sync(el);
        },
        onLoadError: function(){ if (el._r !== r) return; (el._fail = el._fail || {})[name] = 1; destroy(el); }
      });
      function first(){
        if (el._r !== r) return;
        r.off(rive.EventType.Advance, first);
        el._chrShown = true; cv.style.visibility = ''; el.style.backgroundImage = 'none';
      }
      r.on(rive.EventType.Advance, first);
    }
    CHR.live = function(){ return live.map(function(el){ return { pose: el.getAttribute('data-char'), playing: !!el._playing, shown: !!el._chrShown, w: el._cv && el._cv.width, h: el._cv && el._cv.height }; }); };
    if (!('IntersectionObserver' in window)) return;
    var nearIO = new IntersectionObserver(function(es){
      es.forEach(function(e){ var el = e.target; el._near = e.isIntersecting; if (el._near) create(el); else destroy(el); });
    }, { rootMargin: '100% 0px 100% 0px' });
    var visIO = new IntersectionObserver(function(es){
      es.forEach(function(e){ e.target._in = e.isIntersecting; sync(e.target); });
    });
    els.forEach(function(el){ nearIO.observe(el); visIO.observe(el); });
    // fades (scenes) and size changes do not fire the observers: check the live few four times a second
    setInterval(function(){
      live.slice().forEach(function(el){
        if (el._near && !el._r) return;
        if (!el.clientWidth || !el.clientHeight) { sync(el); return; }
        if (el._ready && fit(el)) { el._r.resizeToCanvas(); if (el._playing) el._r.drawFrame(); }
        sync(el);
      });
      // an element that had no size when it came near (hidden view, collapsed) gets its instance once it has one
      els.forEach(function(el){ if (el._near && !el._r && el.clientWidth) create(el); });
    }, 250);
  })();

  // Hero hall (art/hero.riv, built by rive/hero_split.py): every frame the page writes the view model's
  // px, py (pointer, -1..1, eased) and scroll (the hero's --o1, 0..1); in the file each depth group moves by
  //   x = -40 * depth * px,  y = -20 * depth * py + 324 * (0.4 - depth) * scroll   (artboard px, 2880x1620)
  // Tara's spot and Rion's side get the court's offset (depth 0.85) in CSS px through --hx-nx/--hx-ny.
  // Values written in one advance are drawn on the next, so the CSS takes the previous values: same frame.
  function heroParallax(el, cv, r, reveal){
    var DEPTH = 0.85, MAX_X = 40, MAX_Y = 20, SCROLL = 324, D0 = 0.4, ART_H = 1620;
    var host = el.closest('[data-pin]') || document.documentElement;
    // Flat (touch, 700 px and below; see depthParallax): the spot/side get no offset either; the scroll story
    // (hole, Tara's drop, the CSS camera move) runs on its own.
    var prev = null, shown = false, frames = 0, born = performance.now();
    // show the canvas only once its images are drawn, so the still never gives way to an empty hall.
    // Sample through a 1x1 copy: reading the big canvas itself makes Chrome drop it to software drawing.
    var probe = document.createElement('canvas'); probe.width = probe.height = 1;
    var pctx = probe.getContext('2d', { willReadFrequently: true });
    function drawn(){
      if (!pctx) return true;
      var w = cv.width, h = cv.height, pts = [[.5, .95], [.5, .012], [.04, .6]];
      for (var i = 0; i < pts.length; i++) {
        pctx.clearRect(0, 0, 1, 1);
        pctx.drawImage(cv, Math.floor(w * pts[i][0]), Math.floor(h * pts[i][1]), 1, 1, 0, 0, 1, 1);
        if (pctx.getImageData(0, 0, 1, 1).data[3] < 200) return false;
      }
      return true;
    }
    var ok = depthParallax(r, function(){ return parseFloat(host.style.getPropertyValue('--o1')) || 0; }, 0, function(cx, cy, s, now){
      if (prev) { host.style.setProperty('--hx-nx', prev[0].toFixed(2) + 'px'); host.style.setProperty('--hx-ny', prev[1].toFixed(2) + 'px'); }
      var scale = el.offsetHeight / ART_H;
      prev = [-MAX_X * DEPTH * cx * scale, (-MAX_Y * DEPTH * cy + SCROLL * (D0 - DEPTH) * s) * scale];
      if (!shown && (++frames % 6 === 0) && (drawn() || now - born > 4000)) { shown = true; reveal(); }
    });
    if (!ok) { reveal(); return; }
    // the hall only plays while the hero is on screen
    if ('IntersectionObserver' in window) new IntersectionObserver(function(es){
      es.forEach(function(e){ if (e.isIntersecting) r.play(); else r.pause(); });
    }).observe(host);
  }

  // Section scenes: <div class="bgl" data-bg-scene="<scene>"> plays art/scenes/<scene>.riv (built from
  // rive/scenes/<scene>/ by rive/scene.py) over its three layers, through depthParallax with scroll = the section's
  // progress (0 when its top reaches the bottom of the screen, 1 when its bottom leaves the top; 0.5 is the file's
  // rest pose). Desktop only: on touch, at 700 px and below and with reduced motion no instance is made and the
  // three layers stay as they are; they also stay if the file is missing or fails. An instance exists while the .bgl
  // is within one screen of the viewport and is destroyed beyond two; it plays only while on screen. The canvas has
  // the layers' box (top -8%, 116% high) and Fit Cover, so the crop equals their object-fit: cover. It replaces
  // the layers on its second drawn frame (the images are decoded before onLoad; the first frame still has the
  // default view model values); pages never read pixels from these canvases. Backing store: layout px x min(SCN.dpr, dpr).
  var SCN = window.ROTRA_SCN = { v: 3, dpr: 2 };   // bump v with a new art/scenes/*.riv
  if (!reduce && 'IntersectionObserver' in window) (function(){
    var els = Array.prototype.slice.call(document.querySelectorAll('.bgl[data-bg-scene]'));
    if (!els.length) return;
    var live = [];
    function progress(sec){
      var b = sec.getBoundingClientRect(), vh = window.innerHeight;
      return Math.min(1, Math.max(0, (vh - b.top) / (b.height + vh)));
    }
    function fit(el){
      var cv = el._cv, d = Math.min(SCN.dpr, window.devicePixelRatio || 1);
      var w = Math.max(1, Math.round(cv.clientWidth * d)), h = Math.max(1, Math.round(cv.clientHeight * d));
      if (cv.width === w && cv.height === h) return false;
      cv.width = w; cv.height = h; return true;
    }
    function sync(el){
      if (!el._r || !el._ready) return;
      if (el._in && !el._playing) { el._r.play(); el._playing = true; }
      else if (!el._in && el._playing) { el._r.pause(); el._playing = false; }
    }
    function destroy(el){
      var r = el._r;
      if (!r) return;
      el._r = null; el._ready = el._playing = false;
      el.classList.remove('rv');
      try { r.cleanup(); } catch (e) {}
      if (el._cv) { el._cv.remove(); el._cv = null; }
      var i = live.indexOf(el); if (i >= 0) live.splice(i, 1);
    }
    function create(el){
      if (el._r || el._fail || FLAT.matches || !el.clientWidth || !el.clientHeight) return;
      var sec = el.closest('section') || el.parentElement;
      var cv = el._cv = document.createElement('canvas');
      cv.className = 'riv'; cv.style.visibility = 'hidden';
      el.appendChild(cv); fit(el);
      live.push(el);
      var r = el._r = new rive.Rive({
        src: '/art/scenes/' + el.getAttribute('data-bg-scene') + '.riv?v=' + SCN.v, canvas: cv, autoplay: true,
        stateMachine: 'Main', autoBind: true, shouldDisableRiveListeners: true,
        layout: new rive.Layout({ fit: rive.Fit.Cover, alignment: rive.Alignment.Center }),
        onLoad: function(){
          if (el._r !== r) return;
          fit(el); r.resizeToCanvas();
          var frames = 0;
          function shown(){
            if (el._r !== r || ++frames !== 2) return;
            cv.style.visibility = ''; el.classList.add('rv');
          }
          if (!depthParallax(r, function(){ return progress(sec); }, .5, shown)) r.on(rive.EventType.Advance, shown);
          el._ready = el._playing = true;
          sync(el);
        },
        onLoadError: function(){ if (el._r !== r) return; el._fail = true; destroy(el); }
      });
    }
    SCN.live = function(){ return live.map(function(el){ return { scene: el.getAttribute('data-bg-scene'), playing: !!el._playing, shown: el.classList.contains('rv'), w: el._cv && el._cv.width, h: el._cv && el._cv.height }; }); };
    var nearIO = new IntersectionObserver(function(es){
      es.forEach(function(e){ var el = e.target; el._near = e.isIntersecting; if (el._near) create(el); });
    }, { rootMargin: '100% 0px 100% 0px' });
    var farIO = new IntersectionObserver(function(es){
      es.forEach(function(e){ if (!e.isIntersecting) destroy(e.target); });
    }, { rootMargin: '200% 0px 200% 0px' });
    var visIO = new IntersectionObserver(function(es){
      es.forEach(function(e){ e.target._in = e.isIntersecting; sync(e.target); });
    });
    els.forEach(function(el){ nearIO.observe(el); farIO.observe(el); visIO.observe(el); });
    window.addEventListener('resize', function(){
      live.forEach(function(el){ if (el._ready && fit(el)) { el._r.resizeToCanvas(); if (el._playing) el._r.drawFrame(); } });
    });
    function onFlat(){
      if (FLAT.matches) live.slice().forEach(destroy);
      else els.forEach(function(el){ if (el._near) create(el); });
    }
    if (FLAT.addEventListener) FLAT.addEventListener('change', onFlat); else if (FLAT.addListener) FLAT.addListener(onFlat);
  })();
})();
}
