import Lenis from 'lenis'

// The page script: routes, pinned chapters, parallax, sign-in links, forms. Moved verbatim from the old
// index.html; it runs once after hydration and mutates the server-rendered DOM directly.
export function initSite() {
  // The code checks window.Lenis, the old CDN global
  window.Lenis = Lenis;
// Sign-in links (a[data-app="player|queue"]) are built from these origins; the static hrefs are the same values.
var PLAYER_APP_URL = 'https://player.rotra.club';
var QUEUE_APP_URL = 'https://queue.rotra.club';
(function(){
  var APP_URL = { player: PLAYER_APP_URL, queue: QUEUE_APP_URL };
  document.querySelectorAll('a[data-app]').forEach(function(a){
    var base = APP_URL[a.getAttribute('data-app')];
    if (base) a.href = base.replace(/\/$/, '') + '/login';
  });
})();
(function(){
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var PHONE = window.matchMedia('(max-width: 700px)');
  var lenis = null;
  if (!reduce && window.Lenis) {
    try { lenis = new Lenis({ lerp: 0.09, smoothWheel: true }); } catch (e) { lenis = null; }
  }
  // the loading screen (boot.js) owns the page until everything is in: no scrolling under it
  if (lenis && document.getElementById('boot')) {
    lenis.stop();
    window.addEventListener('rotra:ready', function(){ lenis.start(); }, { once: true });
  }
  var pins = Array.prototype.slice.call(document.querySelectorAll('[data-pin]'));
  var chapters = Array.prototype.slice.call(document.querySelectorAll('[data-ch]'));
  var footEl = null;
  var railLinks = Array.prototype.slice.call(document.querySelectorAll('.rail a'));
  var tracks = pins.filter(function(s){ return s.hasAttribute('data-track'); });

  function measureTracks(){
    tracks.forEach(function(s){
      var t = s.querySelector('.track');
      s.style.setProperty('--max', Math.max(0, t.scrollWidth - window.innerWidth + 40));
    });
  }
  function update(){
    var vh = window.innerHeight;
    pins.forEach(function(s){
      var r = s.getBoundingClientRect();
      var span = r.height - vh;
      var p = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
      s.style.setProperty('--p', p.toFixed(4));
      var items = s.querySelectorAll('[data-at]');
      for (var i = 0; i < items.length; i++) items[i].classList.toggle('on', p >= parseFloat(items[i].getAttribute('data-at')));
    });
    // Hero: the title lifts and the camera pushes in with the scroll (--o1), Tara winds up (.sm-wind) and a shuttle
    // drops to her racket (--sd). At SM_T the smash plays on its own clock (smashPlay) and hands over to chapter 01,
    // which is already pinned under the hero stage (CSS: hero smash). Same timings on phones (shorter hero, 200vh).
    var ph = parseFloat(heroEl.style.getPropertyValue('--p')) || 0;
    function seg(a0, a1){ return Math.min(1, Math.max(0, (ph - a0) / (a1 - a0))); }
    var ph1 = PHONE.matches;
    heroEl.style.setProperty('--o1', (ph1 ? seg(.04, .3) : seg(.06, .34)).toFixed(4));  // title lifts, camera pushes in
    heroEl.style.setProperty('--sd', seg(SM_WIND, SM_T - .02).toFixed(4));              // the shuttle drops in
    windSet(ph >= SM_WIND);
    smashTick(ph);
    // Chapter 01: the real Tara is already standing there; cards fan out (a), hold, then merge into the rank card (m)
    // p1 = progress through the beats only (the first CH1_END of the span); the 70vh tail after it is the fade-out
    var p1 = Math.min(1, (parseFloat(ch1.style.getPropertyValue('--p')) || 0) / CH1_END);
    function s1(a0, a1){ return Math.min(1, Math.max(0, (p1 - a0) / (a1 - a0))); }
    // phones (mobile pass): the clones and the heading come within the first ~60vh, not ~120vh
    ch1.style.setProperty('--t', '1');
    ch1.style.setProperty('--a', (ph1 ? s1(.02, .12) : s1(.04, .28)).toFixed(4));            // clones slide in from the sides
    ch1.style.setProperty('--h', (ph1 ? s1(.09, .17) : s1(.26, .38)).toFixed(4));            // then the heading shows
    var m1 = Math.min(1, Math.max(0, (p1 - 0.55) / 0.3));
    ch1.style.setProperty('--m', m1.toFixed(4));
    lineupWrap.classList.toggle('revealed', m1 > 0.5);

    // Scenes: one idea per screen in every story chapter
    scenes();
    var ld = document.getElementById('s-ladder');
    if (ld && ld._idx >= 1) showBoard(Math.min(2, ld._idx - 1), parseFloat(ld.style.getPropertyValue('--sp')) || 0);
    // Section handoffs: --out at the end of each pin, --in as the next section arrives
    // Story sections fade out only in their tail (after the last slide's full dwell); other pins over their last 24%
    pins.forEach(function(sec){ if (sec.classList.contains('hero')) return; var pp = parseFloat(sec.style.getPropertyValue('--p')) || 0, f0 = sec.classList.contains('story') ? storyEnd(sec) : sec === ch1 ? CH1_END : .76; sec.style.setProperty('--out', Math.min(1, Math.max(0, (pp - f0) / (1 - f0))).toFixed(4)); });
    fadeIn.forEach(function(sec){ var t = sec.getBoundingClientRect().top; var v = Math.min(1, Math.max(0, 1 - t / (vh * .75))); sec.style.setProperty('--in', (v * v * (3 - 2 * v)).toFixed(4)); });
    var need = document.querySelectorAll('#s-assessors .lvm-btn:not(.on)').length;
    if (needEl && needEl.dataset.n !== String(need)) {
      needEl.dataset.n = need;
      needEl.className = 'qnotice ' + (need ? 'warn' : 'ok');
      needEl.textContent = need ? need + ' player' + (need > 1 ? 's need' : ' needs') + ' a level before the session can start.' : 'Everyone has a level. Ready to start the session.';
    }
    // the top bar leaves as the footer arrives (the footer slides over it), instead of being cut in half
    var ft = footEl || (footEl = document.getElementById('siteFooter'));
    if (ft) document.body.classList.toggle('at-foot', ft.getBoundingClientRect().top < 96);
    var cur = 0;
    chapters.forEach(function(c, i){ if (c.getBoundingClientRect().top < vh * 0.5) cur = i; });
    if (chapters[cur] === ch1 && smash.state !== 'done') cur = Math.max(0, cur - 1);   // still under the hero
    railLinks.forEach(function(a, i){ a.classList.toggle('on', i === cur); });
    curCh = cur;
    if (chapters.length) {
      var next = chapters[cur + 1], t = 0;
      if (next) {
        // start blending when the next chapter is 0.9 screens below the middle; finish as it reaches the middle
        var d = next.getBoundingClientRect().top - vh * 0.5;
        t = Math.min(1, Math.max(0, 1 - d / (vh * 0.9)));
        t = t * t * (3 - 2 * t); // smoothstep
      }
      var a = +chapters[cur].getAttribute('data-sky');
      sky(a, next ? +next.getAttribute('data-sky') : a, t);
    } else {
      var ps = PAGE_SKY[view] || 0;
      sky(ps, ps, 0);
    }
  }
  var curCh = 0;

  // ---- Gradient sky: one palette per chapter, blended as the next chapter rises ----
  // Each: base rgb, then three glows [r,g,b,alpha, x%, y%]. Glow 3 drifts slowly on its own.
  var SKY = {
    dark: [
      { base:[11,11,12],  g:[[0,255,136,.12,78,30],[20,96,63,.35,8,92],[0,204,106,.06,50,60]] },   // 00 hero: green rings glow
      { base:[17,15,24],  g:[[130,90,255,.16,18,18],[0,255,136,.14,50,100],[255,90,95,.07,85,40]] }, // 01 lineup: odd violet, spotlight below
      { base:[12,58,38],  g:[[0,255,136,.20,82,28],[8,40,26,.75,10,85],[255,255,255,.04,50,50]] },   // 02 assessors: on the court
      { base:[11,11,12],  g:[[0,255,136,.14,14,30],[255,77,77,.12,90,82],[0,255,136,.05,60,60]] },   // 03 rank moves: win green vs loss red
      { base:[10,20,15],  g:[[0,255,136,.26,88,10],[61,155,255,.12,8,92],[255,210,63,.06,50,50]] },  // 04 ladder: glow at the top
      { base:[14,13,10],  g:[[255,210,63,.13,82,18],[0,255,136,.12,10,72],[255,184,0,.05,50,50]] },  // 05 pricing: warm gold
      { base:[10,22,16],  g:[[0,255,136,.18,50,0],[20,96,63,.45,50,105],[0,255,136,.05,20,50]] }     // 06 request: green dawn
    ],
    light: [
      { base:[244,245,242], g:[[10,125,68,.12,78,30],[46,139,87,.14,8,92],[10,125,68,.05,50,60]] },
      { base:[240,238,247], g:[[120,80,255,.12,18,18],[10,125,68,.12,50,100],[214,41,58,.06,85,40]] },
      { base:[46,139,87],   g:[[255,255,255,.18,82,28],[20,96,63,.55,10,85],[255,255,255,.05,50,50]] },
      { base:[244,245,242], g:[[10,125,68,.12,14,30],[198,40,40,.09,90,82],[10,125,68,.04,60,60]] },
      { base:[234,243,237], g:[[10,125,68,.20,88,10],[29,111,209,.10,8,92],[209,154,0,.06,50,50]] },
      { base:[248,245,234], g:[[209,154,0,.14,82,18],[10,125,68,.10,10,72],[163,86,0,.05,50,50]] },
      { base:[236,244,239], g:[[10,125,68,.16,50,0],[46,139,87,.20,50,105],[10,125,68,.05,20,50]] }
    ]
  };
  var bgfx = document.getElementById('bgfx');
  var root = document.documentElement;
  function isLight(){
    var t = root.getAttribute('data-theme');
    if (t) return t === 'light';
    return window.matchMedia('(prefers-color-scheme: light)').matches;
  }
  function mix(a, b, t){ return a + (b - a) * t; }
  var PAGE_SKY = { ranking: 3, partners: 0, request: 6 };
  function sky(ai, bi, t){
    var set = SKY[isLight() ? 'light' : 'dark'];
    var A = set[ai], B = set[bi];
    var base = A.base.map(function(v, i){ return Math.round(mix(v, B.base[i], t)); });
    var css = 'rgb(' + base.join(',') + ')';
    bgfx.style.setProperty('--base', css);
    root.style.setProperty('--base', css);
    var now = reduce ? 0 : performance.now() / 1000;
    for (var k = 0; k < 3; k++) {
      var a = A.g[k], b = B.g[k];
      var c = [0,1,2].map(function(i){ return Math.round(mix(a[i], b[i], t)); });
      var al = mix(a[3], b[3], t);
      var x = mix(a[4], b[4], t) + (k === 2 ? Math.sin(now * .25) * 18 : Math.sin(now * .12 + k) * 4);
      var y = mix(a[5], b[5], t) + (k === 2 ? Math.cos(now * .2) * 14 : Math.cos(now * .1 + k) * 3);
      bgfx.style.setProperty('--b' + (k + 1), 'rgba(' + c.join(',') + ',' + al.toFixed(3) + ')');
      bgfx.style.setProperty('--x' + (k + 1), x.toFixed(2) + '%');
      bgfx.style.setProperty('--y' + (k + 1), y.toFixed(2) + '%');
    }
  }
  var needEl = document.getElementById('needLvl');
  var ch1 = document.getElementById('s-real');
  var heroEl = document.getElementById('top');
  var storyPins = Array.prototype.slice.call(document.querySelectorAll('.story'));
  // A story section scrolls n x 85vh of slides plus a 70vh tail (CSS final fixes: .story height) in which it fades
  // out, so the last slide gets the same sharp dwell as the others. storyEnd = the share of the span the slides use.
  var STORY_SLIDE = 85, STORY_TAIL = 70;
  // Chapter 01 (#s-real): the beats keep their old 320vh span (reveal done at 85%, then a ~48vh sharp dwell); a 70vh
  // tail follows (CSS final fixes: .ch1 height 420vh + 70vh) and the section fades out only inside it
  var CH1_BEATS = 320, CH1_TAIL = 70, CH1_END = CH1_BEATS / (CH1_BEATS + CH1_TAIL);
  function storyEnd(sec){ var n = +sec.getAttribute('data-n') || 1; return n * STORY_SLIDE / (n * STORY_SLIDE + STORY_TAIL); }
  function scenes(){
    storyPins.forEach(function(sec){
      var n = +sec.getAttribute('data-n') || 1;
      var pr = Math.min(1, (parseFloat(sec.style.getPropertyValue('--p')) || 0) / storyEnd(sec));
      var idx = Math.min(n - 1, Math.floor(pr * n));
      sec.style.setProperty('--sp', Math.min(1, pr * n - idx).toFixed(3));
      if (sec._idx === idx) return;
      sec._idx = idx;
      if (!sec._sc) sec._sc = Array.prototype.slice.call(sec.querySelectorAll('[data-scene]'));
      sec._sc.forEach(function(el){
        var r = el.getAttribute('data-scene').split('-'), a = +r[0], b = +(r[1] || r[0]);
        el.classList.toggle('cur', idx >= a && idx <= b);
        el.classList.toggle('past', idx > b);
      });
      sec.querySelectorAll('.sdots i').forEach(function(d, i){ d.classList.toggle('on', i === idx); d.classList.toggle('sd-done', i < idx); });
    });
  }
  // ---- Hero smash: Tara hits the shuttle at the camera and the page goes through it into chapter 01 ----
  // Scroll only arms it: once the hero's progress reaches SM_T the sequence runs on its own clock (about 1.1 s),
  // because a smash scrubbed by the wheel has no weight. Classes on #top drive the CSS (hero smash block):
  //   .sm-hit   0 ms    follow-through pose, smear, burst and a dark impact frame (hit-stop, SM.stop ms)
  //   .sm-smash 110 ms  the shuttle (.hx-fly) flies from her racket to the camera, speed lines, the hall pushes back
  //   .sm-flash 570 ms  the cork fills the screen: the mint flash is on
  //   .sm-thru  630 ms  everything but the flash is hidden; chapter 01 (.arrived) settles in as the flash fades
  //   .sm-done  1080 ms the hero stage is hidden; chapter 01 is the page
  // Scrolling back above SM_BACK brings the hero back (.sm-back: a short fade). A jump past the hero (a rail link, a
  // reload further down) and reduced motion skip straight to .sm-done.
  var SM_WIND = .2, SM_T = .46, SM_BACK = .38;
  var SM = { stop: 110, fly: 460, hold: 60, fade: 450 };
  var smash = { state: 'idle', last: 0, timers: [], anim: null };
  var hxFly = heroEl.querySelector('.hx-fly'), hxDrop = heroEl.querySelector('.hx-drop img'), hxFx = heroEl.querySelector('.hx-fx');
  // The wind-up: crossing SM_WIND plays standing -> crouch -> take-off -> wind-up on a clock (.sm-wup, CSS hx-w0..3),
  // so every drawing is seen however fast the wheel turns; crossing back plays the short way down (.sm-unw).
  var wind = { on: false, t: 0 };
  function windSet(on){
    if (on === wind.on) return;
    wind.on = on;
    heroEl.classList.toggle('sm-wind', on);
    clearTimeout(wind.t); heroEl.classList.remove('sm-wup', 'sm-unw');
    if (reduce || smash.state !== 'idle') return;
    var c = on ? 'sm-wup' : 'sm-unw';
    heroEl.classList.add(c);
    wind.t = setTimeout(function(){ heroEl.classList.remove(c); }, on ? 500 : 280);
  }
  function smashClear(){
    smash.timers.forEach(clearTimeout); smash.timers = [];
    if (smash.anim) { try { smash.anim.cancel(); } catch (e) {} smash.anim = null; }
    heroEl.classList.remove('sm-hit', 'sm-smash', 'sm-flash', 'sm-thru', 'sm-back');
  }
  function smashDone(){
    smashClear();
    heroEl.classList.add('sm-done'); ch1.classList.add('arrived');
    smash.state = 'done';
  }
  function smashReset(){
    smashClear();
    heroEl.classList.remove('sm-done'); ch1.classList.remove('arrived');
    smash.state = 'idle';
    heroEl.classList.add('sm-back');
    smash.timers.push(setTimeout(function(){ heroEl.classList.remove('sm-back'); }, 400));
  }
  function smashPlay(){
    smashClear();
    clearTimeout(wind.t); heroEl.classList.remove('sm-wup', 'sm-unw');
    smash.state = 'playing';
    var st = hxFx.getBoundingClientRect(), d = hxDrop.getBoundingClientRect();
    // the hit point (centre of the dropped shuttle) and the stage centre, in stage px
    var x0 = d.left + d.width / 2 - st.left, y0 = d.top + d.height / 2 - st.top, x1 = st.width / 2, y1 = st.height / 2;
    heroEl.style.setProperty('--bx', x0.toFixed(1) + 'px'); heroEl.style.setProperty('--by', y0.toFixed(1) + 'px');
    heroEl.classList.add('sm-hit');
    function at(ms, fn){ smash.timers.push(setTimeout(fn, ms)); }
    at(SM.stop, function(){
      heroEl.classList.add('sm-smash');
      // .hx-fly turns about its cork (CSS transform-origin = the cork's centre in the image, CORK), so the cork
      // travels from the hit point to the middle of the screen and ends wider than the screen's diagonal
      var w = hxFly.offsetWidth, h = hxFly.offsetHeight, CORK = [.209, .813, .40];
      var cx = w * CORK[0], cy = h * CORK[1];
      var s0 = Math.max(.01, d.width * .8 / w), s2 = 1.2 * Math.sqrt(st.width * st.width + st.height * st.height) / (w * CORK[2]);
      function tf(x, y, sc, rot){ return 'translate(' + (x - cx).toFixed(1) + 'px,' + (y - cy).toFixed(1) + 'px) scale(' + sc.toFixed(4) + ') rotate(' + rot + 'deg)'; }
      if (hxFly.animate) smash.anim = hxFly.animate([
        { transform: tf(x0, y0, s0, 20), offset: 0 },
        { transform: tf(x0 + (x1 - x0) * .7, y0 + (y1 - y0) * .7, Math.sqrt(s0 * s2) * .5, 12), offset: .62 },
        { transform: tf(x1, y1, s2, 6), offset: 1 }
      ], { duration: SM.fly, easing: 'cubic-bezier(.5,0,.9,.5)', fill: 'forwards' });
    });
    at(SM.stop + SM.fly, function(){ heroEl.classList.add('sm-flash'); });
    at(SM.stop + SM.fly + SM.hold, function(){ heroEl.classList.add('sm-thru'); ch1.classList.add('arrived'); });
    at(SM.stop + SM.fly + SM.hold + SM.fade, smashDone);
  }
  function smashTick(ph){
    var jump = ph - smash.last > .3;
    smash.last = ph;
    if (smash.state === 'idle' && ph >= SM_T) { if (reduce || jump || ph >= .98) smashDone(); else smashPlay(); }
    else if (smash.state === 'done' && ph < SM_BACK) smashReset();
  }
  // The scene dots are buttons: a click glides to the middle of that scene's stretch of the section's scroll.
  // So is the leaderboard's Weekly / Monthly / Annual switch: board b is scene b + 1 of its section.
  function gotoScene(sec, i){
    var n = +sec.getAttribute('data-n') || 1;
    var y = sec.getBoundingClientRect().top + window.scrollY + (sec.offsetHeight - window.innerHeight) * storyEnd(sec) * (i + .5) / n;
    if (lenis) lenis.scrollTo(y, { duration: 1 }); else window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
  }
  function sceneTarget(t){
    var d = t.closest && t.closest('.sdots i');
    if (d) return [d.closest('.story'), Array.prototype.indexOf.call(d.parentNode.children, d)];
    var b = t.closest && t.closest('.story .lb-seg [data-b]');
    return b ? [b.closest('.story'), +b.getAttribute('data-b') + 1] : null;
  }
  document.addEventListener('click', function(e){ var g = sceneTarget(e.target); if (g) gotoScene(g[0], g[1]); });
  document.addEventListener('keydown', function(e){
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var g = e.target.matches && e.target.matches('.lb-seg [data-b]') ? sceneTarget(e.target) : null;
    if (g) { e.preventDefault(); gotoScene(g[0], g[1]); }
  });
  var fadeIn = Array.prototype.slice.call(document.querySelectorAll('.fade-io'));
  var lineupWrap = ch1.querySelector('.lineup-wrap');
  // Line-up figures (CSS v18): the real one is 68vh tall and grows 10% on the reveal. If that would reach the
  // heading block, --fk shrinks every figure by the same factor.
  var ch1Head = ch1.querySelector('.ch1-head'), ch1Stage = ch1.querySelector('.stage');
  var ch1Hs = ch1.querySelector('.hs'), ch1Card = ch1.querySelector('.lineup-wrap .rcard');
  var ch1Lineup = ch1.querySelector('.lineup'), ch1RealBody = ch1.querySelector('.clone.real .cbody');
  function fitLineup(){
    if (!ch1Stage.clientHeight) return; // home view hidden: refitted on the hash change that shows it
    var vh = window.innerHeight, phone = window.matchMedia('(max-width: 700px)').matches;
    var headBottom = ch1Head.offsetTop + ch1Head.offsetHeight, fk, figTop;
    if (phone && ch1Lineup && ch1RealBody) {
      // 700 px and below (CSS: phone line-up): the five stand on the captions row, which sits a fixed gap above the
      // stage's bottom (the line-up's computed bottom). The art is contain, bottom centre, 1600x2342, so it is at
      // most the box's width / .6832 tall; the real one is scaled 1.08 for depth and 1.1 on the reveal.
      var rc = ch1RealBody.parentNode, cap = rc.querySelector('figcaption');
      var boxBottom = ch1Stage.clientHeight - (parseFloat(getComputedStyle(ch1Lineup).bottom) || 0)
        - (cap ? cap.offsetHeight : 0) - (parseFloat(getComputedStyle(rc).rowGap) || 0);
      var art = Math.min(ch1RealBody.offsetHeight, ch1RealBody.offsetWidth / .6832) * 1.08 * 1.1;
      // the real one also stands clear of the rank card (placed under the answer heading, see below), so the card
      // never covers her face on the reveal
      var clearTop = headBottom;
      // the heading block rises 28px while it fades in (CSS: --h), so measure it as if it had landed
      var stTop = ch1Stage.getBoundingClientRect().top - (1 - (parseFloat(getComputedStyle(ch1Head).opacity) || 0)) * 28;
      if (ch1Hs && ch1Card) clearTop = Math.max(clearTop, ch1Hs.getBoundingClientRect().bottom - stTop + 10 + ch1Card.offsetHeight);
      fk = Math.max(.4, Math.min(1, (boxBottom - clearTop - 12) / (art || 1)));
      figTop = boxBottom - art * fk;
    } else {
      var real = .68 * vh * 1.1;
      fk = Math.max(.4, Math.min(1, (ch1Stage.clientHeight + vh * .03 - headBottom - 16) / real));
    }
    ch1.style.setProperty('--fk', fk.toFixed(4));
    // 700 px and below: the rank card's top sits 10 px under the answer heading (the sub line is gone by then); it
    // scales down, to .7 at most, when it would reach the top of the real figure
    if (phone && ch1Hs && ch1Card && figTop != null) {
      // measured on screen (stage coordinates); the card's top is relative to the line-up box, not the stage
      var stTop2 = stTop;
      var top = ch1Hs.getBoundingClientRect().bottom - stTop2 + 10;
      var wrapTop = ch1Card.offsetParent ? ch1Card.offsetParent.getBoundingClientRect().top - ch1Stage.getBoundingClientRect().top : 0;
      ch1.style.setProperty('--rct', Math.round(top - wrapTop) + 'px');
      ch1.style.setProperty('--rcs', Math.max(.7, Math.min(1, (figTop - top) / (ch1Card.offsetHeight || 1))).toFixed(4));
    }
  }
  fitLineup();
  window.addEventListener('resize', fitLineup);
  // the measures are only right once the chapter is laid out on screen (not during the loading screen): refit as it
  // comes into view and once the page is ready
  window.addEventListener('rotra:ready', function(){ requestAnimationFrame(fitLineup); });
  if ('IntersectionObserver' in window) new IntersectionObserver(function(es){
    if (es.some(function(x){ return x.isIntersecting; })) requestAnimationFrame(fitLineup);
  }).observe(ch1Stage);
  window.addEventListener('hashchange', function(){ requestAnimationFrame(fitLineup); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitLineup);
  // Chapter 02 match-up (CSS bigchars): figures 50vh tall (30vh at 700 px and below, teams stacked). If the heading,
  // names and bars would not fit the scene, or a pair (1.55 figure widths) would outgrow its team column, --rk
  // shrinks all four alike. Skipped while the home view is hidden; refitted when the view changes.
  var vsEl = document.querySelector('#s-ranking .vs');
  function fitTeams(){
    if (!vsEl || !vsEl.offsetParent) return;
    var sc = vsEl.parentNode, cs = getComputedStyle(sc), rows = window.matchMedia('(max-width: 700px)').matches ? 2 : 1;
    vsEl.style.setProperty('--rk', 1);
    // phones (mobile pass): the shrinkable height is the cropped pair block (27vh), the pair is 1.6 figure widths
    var fig = vsEl.querySelector('.mfig'), fh = rows > 1 ? fig.parentNode.offsetHeight : fig.offsetHeight;
    var used = vsEl.offsetTop + vsEl.offsetHeight - sc.firstElementChild.offsetTop;
    var room = sc.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    var k = Math.min(1, (rows * fh - Math.max(0, used - room)) / (rows * fh), vsEl.querySelector('.team').clientWidth / (fig.offsetWidth * (rows > 1 ? 1.6 : 1.55)));
    vsEl.style.setProperty('--rk', Math.max(.4, k).toFixed(4));
  }
  fitTeams();
  window.addEventListener('resize', fitTeams);
  window.addEventListener('hashchange', function(){ requestAnimationFrame(fitTeams); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitTeams);
  // Pointer parallax, eased, mouse only; off for reduced motion and touch. Line-up figures drift opposite the pointer
  // (front row 14 x 6 px, back row half, via --dp); the big figures (.bigc, CSS bigchars) get --bx/--by for up to 12 px.
  var bigFigs = Array.prototype.slice.call(document.querySelectorAll('.bigc'));
  var lpOn = !reduce && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var lpT = [0, 0], lpC = [0, 0], lpLast = 0;
  if (lpOn) window.addEventListener('pointermove', function(e){
    if (e.pointerType && e.pointerType !== 'mouse') return;
    lpT[0] = -Math.max(-1, Math.min(1, e.clientX / window.innerWidth * 2 - 1));
    lpT[1] = -Math.max(-1, Math.min(1, e.clientY / window.innerHeight * 2 - 1));
  }, { passive: true });
  function lineupParallax(now){
    if (!lpOn) return;
    var dt = lpLast ? Math.min(.1, (now - lpLast) / 1000) : 0, k = 1 - Math.exp(-dt / .25), moved = false;
    lpLast = now;
    for (var i = 0; i < 2; i++) { var d = lpT[i] - lpC[i]; if (Math.abs(d) > .001) { lpC[i] += d * k; moved = true; } }
    if (!moved) return;
    var x = lpC[0].toFixed(3), y = lpC[1].toFixed(3);
    lineupWrap.style.setProperty('--lpx', x); lineupWrap.style.setProperty('--lpy', y);
    bigFigs.forEach(function(el){ el.style.setProperty('--bx', x); el.style.setProperty('--by', y); });
  }
  function raf(t){ if (lenis) lenis.raf(t); update(); lineupParallax(t); if (typeof flowParallax === "function" && flowBgl) flowParallax(window.innerHeight); requestAnimationFrame(raf); }
  measureTracks(); update(); requestAnimationFrame(raf);
  window.addEventListener('resize', function(){ measureTracks(); update(); });

  // ---- Pages: #home (the story), #clubs (#partners is an alias), #ranking, #request (#pricing redirects to
  // #request), #find. The legal pages are pages of their own (/privacy, /terms): an old #privacy or #terms link,
  // or one to a section of theirs (#privacy-your-rights), is sent there. ----
  var PAGES = { home: 1, clubs: 1, partners: 1, ranking: 1, request: 1, find: 1 };
  var LEGAL = /^(privacy|terms)(-|$)/;
  var ALIAS = { partners: 'clubs' };
  var REDIRECT = { pricing: 'request' };
  var TITLES = { home: 'ROTRA · Badminton player ranking', clubs: 'For clubs · ROTRA', ranking: 'How ranking works · ROTRA', request: 'Request a quotation · ROTRA', find: 'Find your profile · ROTRA' };
  var NAV_OF = { clubs: 'clubs', request: 'clubs', ranking: 'ranking', find: 'find' };
  var views = Array.prototype.slice.call(document.querySelectorAll('.view'));
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('[data-nav]'));
  var view = 'home';
  function toTop(){ if (lenis) lenis.scrollTo(0, { immediate: true }); window.scrollTo(0, 0); }
  function ownerView(el){ var v = el && el.closest ? el.closest('.view') : null; return v ? v.getAttribute('data-view') : 'home'; }
  function setView(next){
    var changed = next !== view;
    view = next;
    document.body.setAttribute('data-view', view);
    views.forEach(function(v){ v.hidden = v.getAttribute('data-view') !== view; });
    chapters = Array.prototype.slice.call(document.querySelectorAll('.view[data-view="' + view + '"] [data-ch]'));
    var navKey = NAV_OF[view];
    navLinks.forEach(function(a){ if (a.getAttribute('data-nav') === navKey) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    document.title = TITLES[view];
    if (lenis) lenis.resize();
    measureTracks();
    return changed;
  }
  // Chapter 01 starts under the hero (its top is still the hero's wind-up), and its heading and line-up come in with
  // the scroll, so a link to it lands where all five figures and the heading are in and the reveal has not begun
  // (42% of its beats; 22% on phones, where they come in sooner).
  function landing(el){
    if (el === ch1) return Math.round((ch1.offsetHeight - window.innerHeight) * CH1_END * (PHONE.matches ? .22 : .42));
    return 0;
  }
  function route(){
    var h = location.hash.slice(1);
    var legal = LEGAL.exec(h);
    if (legal) { location.replace('/' + legal[1] + (h === legal[1] ? '' : '#' + h)); return; }
    if (REDIRECT[h]) { h = REDIRECT[h]; try { history.replaceState(null, '', '#' + h); } catch (err) { location.replace('#' + h); return; } }
    var target = !PAGES[h] && h ? document.getElementById(h) : null;
    var next = PAGES[h] ? (ALIAS[h] || h) : ownerView(target);
    cover(next, function(){
      var changed = setView(next);
      if (target && h !== 'top') { if (lenis) lenis.scrollTo(target, { duration: 1.2, offset: landing(target) }); else { target.scrollIntoView(); window.scrollBy(0, landing(target)); } }
      else if (changed || PAGES[h] || h === 'top') toTop();
    });
  }
  // A change of view happens under the page transition (ROTRA_PT, boot.js): the mark covers the screen, the view
  // is swapped behind it, the mark flies out. The first route of a load, and a route to the same view, swap at once.
  var routed = false;
  function cover(next, swap){
    var PT = window.ROTRA_PT;
    if (!routed || next === view || !PT) { routed = true; swap(); return; }
    PT.run(swap);
  }
  window.addEventListener('hashchange', route);

  document.addEventListener('click', function(e){
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href').slice(1);
    var plan = a.getAttribute('data-plan');
    if (plan) { var r = document.querySelector('input[name="plan"][value="' + plan + '"]'); if (r) r.checked = true; }
    if (PAGES[id]) {
      // A page link: let the hash change; if it's already the current hash, just go to the top.
      if (location.hash.slice(1) === id) { e.preventDefault(); toTop(); }
      return;
    }
    // An anchor inside a landing (chapter rail, "Start the story"): switch landing if needed, then glide there
    var el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    var owner = ownerView(el), switching = owner !== view;
    cover(owner, function(){
      if (switching) { setView(owner); toTop(); try { history.replaceState(null, '', '#' + owner); } catch (err) {} }
      setTimeout(function(){
        if (lenis) lenis.scrollTo(id === 'top' ? 0 : el, { duration: 1.4, offset: id === 'top' ? 0 : landing(el) });
        else { el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); if (landing(el)) window.scrollBy(0, landing(el)); }
      }, switching ? 80 : 0);
    });
  });
  route();

  // ---- Phone menu (760 px and below): the bar's menu button opens a fullscreen sheet. Any link in it, Escape, a
  // route change or a wider screen closes it; while it is open the page does not scroll (html.menu-open, Lenis
  // stopped). Its links carry data-nav, so setView marks the current one with aria-current like the bar's. ----
  (function(){
    var menu = document.getElementById('siteMenu');
    var openBtn = document.getElementById('menuOpen');
    var closeBtn = document.getElementById('menuClose');
    if (!menu || !openBtn) return;
    var WIDE = window.matchMedia('(min-width: 761px)');
    function isOpen(){ return !menu.hidden; }
    function setOpen(on, refocus){
      if (on === isOpen()) return;
      menu.hidden = !on;
      document.documentElement.classList.toggle('menu-open', on);
      openBtn.setAttribute('aria-expanded', on ? 'true' : 'false');
      openBtn.setAttribute('aria-label', on ? 'Close menu' : 'Open menu');
      if (lenis) { if (on) lenis.stop(); else lenis.start(); }
      if (on) { var first = menu.querySelector('.menu-links a'); if (first) first.focus(); }
      else if (refocus) openBtn.focus();
    }
    openBtn.addEventListener('click', function(){ setOpen(!isOpen(), true); });
    if (closeBtn) closeBtn.addEventListener('click', function(){ setOpen(false, true); });
    // closes before the page's own click handler runs (it is on document), so Lenis is running again for its scroll
    menu.addEventListener('click', function(e){ if (e.target.closest && e.target.closest('a')) setOpen(false, true); });
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && isOpen()) setOpen(false, true); });
    window.addEventListener('hashchange', function(){ setOpen(false, false); });
    function onWide(){ if (WIDE.matches) setOpen(false, false); }
    if (WIDE.addEventListener) WIDE.addEventListener('change', onWide); else if (WIDE.addListener) WIDE.addListener(onWide);
  })();


  // ---- Footer: back to top; the two arena figures shift up to 10px opposite a desktop mouse, eased ----
  var foot = document.getElementById('siteFooter');
  document.getElementById('backTop').addEventListener('click', toTop);
  (function(){
    var fine = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 701px)');
    if (reduce) return;
    var tx = 0, cx = 0, run = 0, last = 0;
    function step(t){
      var dt = last ? Math.min(.1, (t - last) / 1000) : .016;
      last = t; cx += (tx - cx) * (1 - Math.exp(-dt / .25));
      if (Math.abs(tx - cx) < .05) cx = tx;
      foot.style.setProperty('--fpx', cx.toFixed(2) + 'px');
      if (cx !== tx) run = requestAnimationFrame(step); else run = last = 0;
    }
    window.addEventListener('pointermove', function(e){
      if (e.pointerType !== 'mouse' || !fine.matches) tx = 0;
      else {
        var r = foot.getBoundingClientRect();
        if (r.top > window.innerHeight || r.bottom < 0) return;
        tx = -Math.max(-1, Math.min(1, e.clientX / window.innerWidth * 2 - 1)) * 10;
      }
      if (!run && tx !== cx) run = requestAnimationFrame(step);
    }, { passive: true });
  })();


  // ---- Parallax progress for flow sections with background layers ----
  var flowBgl = Array.prototype.slice.call(document.querySelectorAll('.has-bgl'));
  function flowParallax(vh){
    flowBgl.forEach(function(sec){
      var r = sec.getBoundingClientRect();
      if (!r.height) return;
      sec.style.setProperty('--pp', Math.min(1, Math.max(0, (vh - r.top) / (r.height + vh))).toFixed(4));
    });
  }

  // ---- Frame-by-frame sprites: ~10 fps, small pose jitter per frame, held on twos ----
  var sprites = Array.prototype.slice.call(document.querySelectorAll('.sprite'));
  var JIT = [[0,0,0],[0,-3,-1],[2,-5,0],[0,-3,1],[0,0,0],[-2,-2,-1],[0,-4,0],[1,-1,1]];
  var tick = 0;
  function frames(){
    tick++;
    sprites.forEach(function(el, i){
      if (!el.offsetParent) return;
      var n = +el.getAttribute('data-frames') || 8;
      var f = Math.floor((tick + i * 3) / 1) % n;           // one step per tick = 10 fps
      var fr = el.querySelector('.fr');
      if (!fr) { fr = document.createElement('i'); fr.className = 'fr'; el.appendChild(fr); }
      fr.textContent = el.getAttribute('data-anim') + ' · ' + (f + 1) + '/' + n;
      if (!reduce) {
        var j = JIT[f % JIT.length];
        el.style.setProperty('--jx', j[0] + 'px'); el.style.setProperty('--jy', j[1] + 'px'); el.style.setProperty('--jr', j[2] + 'deg');
      }
    });
  }
  setInterval(frames, 100); frames();
  // Characters: every .chr[data-char] element shows one pose. Each pose is a looping Rive file
  // (art/<pose>.riv for the two idles, art/chars/<pose>.riv for the rest) drawn over its .webp still,
  // which stays visible until Rive has drawn and whenever Rive is off (far away, failed, reduced motion).
  // The character script at the end of the page owns the Rive instances.
  var CHR = window.ROTRA_CHR = {
    riv: function(name){ return (/-idle$/.test(name) ? '/art/' : '/art/chars/') + name + '.riv?v=4'; },
    still: function(name){ return '/art/chars/' + name + '.webp'; },
    showStill: function(el){
      el.style.backgroundImage = 'url(' + CHR.still(el.getAttribute('data-char')) + ')';
      el.style.backgroundRepeat = 'no-repeat'; el.style.backgroundSize = 'contain'; el.style.backgroundPosition = '50% 100%';
    }
  };
  // A still is painted when its element comes within two screens of the viewport (and at once in the view being
  // opened, for the ones near the top), so a view does not fetch every still it has at load.
  (function(){
    var els = document.querySelectorAll('.chr[data-char]');
    if (!('IntersectionObserver' in window)) { els.forEach(CHR.showStill); return; }
    var io = new IntersectionObserver(function(es){
      es.forEach(function(e){
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        if (!e.target._chrShown) CHR.showStill(e.target);
      });
    }, { rootMargin: '200% 0px 200% 0px' });
    var vh = window.innerHeight;
    els.forEach(function(el){
      var b = el.getBoundingClientRect();
      if ((b.width || b.height) && b.top < vh * 2) CHR.showStill(el); else io.observe(el);
    });
  })();

  // Sample-player avatars: every initials circle (.vg-av, .qav, .avatar) whose initials have a portrait in
  // art/avatars/<initials>.webp shows it (.has-av); the initials stay in the markup as the fallback.
  var AV = window.ROTRA_AV = {
    list: 'jt ra lb cm ac en no yf bc br dr tr ms kl ml ks sv gt be ta pa ju ma'.split(' '),
    url: function(k){ return '/art/avatars/' + k + '.webp'; },
    paint: function(el){
      var t = '';
      for (var n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 3) t += n.nodeValue;
      var k = t.trim().toLowerCase(), has = AV.list.indexOf(k) >= 0;
      el.style.backgroundImage = has ? 'url(' + AV.url(k) + ')' : '';
      el.classList.toggle('has-av', has);
    }
  };
  document.querySelectorAll('.vg-av, .qav, .avatar').forEach(AV.paint);

  // ---- Chapter 03 podium (same design as the player app's leaderboard) ----
  var BOARDS = [
    { sub: 'Weekly ROTRA leaderboard · resets Monday', top: [['PA','Paolo M.','Advanced Low'],['BE','Bea S.','Intermediate High'],['JU','Jun R.','Intermediate Mid']], pos: [41,28,17,9,4] },
    { sub: 'Monthly ROTRA leaderboard · resets on the 1st', top: [['JU','Jun R.','Intermediate High'],['PA','Paolo M.','Advanced Low'],['MA','Mara L.','Advanced Mid']], pos: [96,71,48,30,18] },
    { sub: 'Annual ROTRA leaderboard · resets January 1', top: [['MA','Mara L.','Advanced Mid'],['JU','Jun R.','Intermediate High'],['PA','Paolo M.','Advanced Low']], pos: [412,377,341,302,266] }
  ];
  var curBoard = -1, curStep = -1;
  var lbBoard = document.querySelector('.lbx-board');
  function showBoard(bi, sub){
    if (!lbBoard) return;
    var B = BOARDS[bi];
    if (bi !== curBoard) {
      curBoard = bi;
      lbBoard.querySelectorAll('.lb-seg span, .bl span').forEach(function(t){ t.classList.toggle('on', +t.getAttribute('data-b') === bi); });
      document.getElementById('lbSub').textContent = B.sub;
      B.top.forEach(function(e, i){
        lbBoard.querySelector('[data-k="i' + i + '"]').textContent = e[0];
        if (window.ROTRA_AV) window.ROTRA_AV.paint(lbBoard.querySelector('[data-k="i' + i + '"]'));
        lbBoard.querySelector('[data-k="n' + i + '"]').textContent = e[1];
        lbBoard.querySelector('[data-k="l' + i + '"]').textContent = e[2];
      });
      var stage = lbBoard.querySelector('.pod-stage');
      stage.classList.remove('rise'); void stage.offsetWidth; stage.classList.add('rise');
      curStep = -1;
    }
    var k = Math.min(B.pos.length - 1, Math.floor(sub * B.pos.length));
    if (k !== curStep) {
      curStep = k;
      document.getElementById('lbPos').textContent = B.pos[k];
      var gained = B.pos[0] - B.pos[k];
      document.getElementById('lbDelta').textContent = gained ? '▲ ' + gained : 'new';
      var row = lbBoard.querySelector('.lb-row.me');
      row.classList.remove('bump'); void row.offsetWidth; row.classList.add('bump');
    }
  }
  // Pixel fire over first place: the player app's flame effect in the brand green
  var FIRE = { w: 48, h: 40, buf: null, last: 0, key: '', pal: [] };
  function firePalette(){
    var acc = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    var dark = !isLight(), key = acc + dark;
    if (key === FIRE.key) return FIRE.pal;
    var hex = /^#([0-9a-f]{6})$/i.exec(acc);
    var rgb = hex ? [0, 2, 4].map(function(k){ return parseInt(hex[1].slice(k, k + 2), 16); }) : [0, 255, 136];
    function mx(c, t, to){ return Math.round(c + (to - c) * t); }
    FIRE.pal = [];
    for (var i = 0; i < 37; i++) {
      var t = i / 36;
      if (!i) { FIRE.pal.push([0,0,0,0]); continue; }
      var base = t < .55 ? rgb.map(function(c){ return mx(c * .35, t / .55, c); }) : rgb.map(function(c){ return mx(c, (t - .55) / .45 * (dark ? .75 : .35), 255); });
      FIRE.pal.push(base.concat([t < .12 ? 0 : Math.round(255 * Math.min(1, (t - .12) * 2.2))]));
    }
    FIRE.key = key; return FIRE.pal;
  }
  function fireStep(){
    var w = FIRE.w, h = FIRE.h;
    if (!FIRE.buf) {
      FIRE.buf = new Uint8Array(w * h);
      for (var x0 = 0; x0 < w; x0++) { var d = Math.abs(x0 - w / 2) / (w / 2); FIRE.buf[(h - 1) * w + x0] = d < .3 ? 36 : d < .62 ? Math.round(36 * (1 - (d - .3) / .32)) : 0; }
    }
    var buf = FIRE.buf;
    for (var x = 0; x < w; x++) for (var y = 1; y < h; y++) {
      var src = y * w + x, v = buf[src];
      if (!v) { buf[src - w] = 0; continue; }
      var rnd = Math.floor(Math.random() * 4), dst = src - rnd + 1 - w;
      if (dst >= 0) buf[dst] = Math.max(0, v - (rnd & 1) - (Math.random() < .55 ? 1 : 0));
    }
  }
  function fireDraw(c){
    var ctx = c.getContext('2d'), pal = firePalette(), w = FIRE.w, h = FIRE.h, img = ctx.createImageData(w, h);
    for (var i = 0; i < FIRE.buf.length; i++) {
      var pp = pal[FIRE.buf[i]] || pal[0], x = i % w, side = Math.max(0, 1 - Math.pow((x - w / 2) / (w * .42), 2));
      img.data[i * 4] = pp[0]; img.data[i * 4 + 1] = pp[1]; img.data[i * 4 + 2] = pp[2]; img.data[i * 4 + 3] = Math.round(pp[3] * side);
    }
    ctx.putImageData(img, 0, 0);
  }
  (function(){
    var c = document.getElementById('lbFire'); if (!c) return;
    for (var i = 0; i < 40; i++) fireStep();
    fireDraw(c);
    if (reduce) return;
    (function tickFire(ts){ if (ts - FIRE.last > 60 && c.offsetParent) { fireStep(); fireDraw(c); FIRE.last = ts; } requestAnimationFrame(tickFire); })(0);
  })();

  var findForm = document.getElementById('findForm');
  // Find your profile. An RTR ID opens that player's profile card here, in a frame over the page: the Player
  // Information app serves the card alone at /card/<ID> and tells this page when it is ready, closed or has no such
  // profile (messages from that origin only). Anything else opens the app's leaderboard with the name search filled
  // in (/?q=<name>). On a local dev host the app is the local one (port 9001).
  var findMsg = document.getElementById('findMsg'), FIND_NOTE = findMsg.textContent, card = null;
  function playerBase(){ return /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? 'http://localhost:9001' : PLAYER_APP_URL.replace(/\/$/, ''); }
  function closeCard(){
    if (!card) return;
    clearTimeout(card.t); window.removeEventListener('message', card.onMsg); document.removeEventListener('keydown', card.onKey);
    card.el.remove(); card = null;
    if (lenis) lenis.start();
    document.getElementById('findq').focus();
  }
  function openCard(id){
    closeCard();
    var base = playerBase(), el = document.createElement('div'), fr = document.createElement('iframe');
    el.className = 'pcard'; el.innerHTML = '<p class="pcard-wait">Looking up ' + id.replace(/[<>&]/g, '') + '…</p>';
    fr.title = 'ROTRA profile'; fr.src = base + '/card/' + encodeURIComponent(id);
    el.appendChild(fr); document.body.appendChild(el);
    if (lenis) lenis.stop();
    card = { el: el, t: 0,
      onMsg: function(e){
        if (e.origin !== base || !e.data || !card) return;
        if (e.data.type === 'rotra:card-ready') { clearTimeout(card.t); el.classList.add('on'); fr.focus(); }
        else if (e.data.type === 'rotra:card-close') closeCard();
        else if (e.data.type === 'rotra:card-missing') { closeCard(); findMsg.textContent = 'No ROTRA profile has the RTR ID ' + id + '. Check it and try again.'; }
      },
      onKey: function(e){ if (e.key === 'Escape') closeCard(); } };
    window.addEventListener('message', card.onMsg); document.addEventListener('keydown', card.onKey);
    el.addEventListener('click', function(e){ if (e.target === el) closeCard(); });
    // the frame never answered (blocked, or the app is down): fall back to the app's own lookup page
    card.t = setTimeout(function(){ if (card && !el.classList.contains('on')) window.location.assign(base + '/find/' + encodeURIComponent(id)); }, 9000);
  }
  findForm.addEventListener('submit', function(e){
    e.preventDefault();
    var q = document.getElementById('findq').value.trim();
    if (!q) { findMsg.textContent = 'Type a name or an RTR ID first.'; return; }
    findMsg.textContent = FIND_NOTE;
    if (/^RTR-/i.test(q)) openCard(q.toUpperCase());
    else window.location.assign(playerBase() + '/?q=' + encodeURIComponent(q));
  });

  var form = document.getElementById('partnerForm');
  var done = document.getElementById('done');
  var err = document.getElementById('formErr');
  form.addEventListener('submit', function(e){
    e.preventDefault();
    var missing = Array.prototype.filter.call(form.querySelectorAll('[required]'), function(f){
      return f.type === 'checkbox' ? !f.checked : !f.value.trim();
    });
    if (missing.length) {
      err.textContent = 'Fill in the ' + missing.length + ' required field' + (missing.length > 1 ? 's' : '') + ' and tick the agreement.';
      missing[0].focus();
      return;
    }
    err.textContent = '';
    done.hidden = false;
  });
  document.getElementById('editReq').addEventListener('click', function(){ done.hidden = true; });
})();
}
