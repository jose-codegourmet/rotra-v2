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
  var pins = Array.prototype.slice.call(document.querySelectorAll('[data-pin]'));
  var chapters = Array.prototype.slice.call(document.querySelectorAll('[data-ch]'));
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
    // Hero: content holds, then leaves through the rings (x1 = exit progress)
    var ph = parseFloat(heroEl.style.getPropertyValue('--p')) || 0;
    function seg(a0, a1){ return Math.min(1, Math.max(0, (ph - a0) / (a1 - a0))); }
    // phones (mobile pass): a shorter hero (200vh) over chapter 01, so the drop, the dive and the veil come sooner and
    // the stage fades out (--hf) to show chapter 01, already pinned underneath
    var ph1 = PHONE.matches;
    heroEl.style.setProperty('--o1', (ph1 ? seg(.05, .3) : seg(.08, .36)).toFixed(4));  // plate sinks, camera tilts down
    heroEl.style.setProperty('--d', (Math.round((ph1 ? seg(.22, .5) : seg(.34, .62)) * 10) / 10).toFixed(2));   // Tara drops through
    heroEl.style.setProperty('--z', (ph1 ? seg(.5, .82) : seg(.6, .9)).toFixed(4));   // dive through the hole
    heroEl.style.setProperty('--hf', ph1 ? (1 - seg(.88, 1)).toFixed(4) : '1');
    // Chapter 01: cards fan out (a), hold, then merge into the rank card (m)
    // p1 = progress through the beats only (the first CH1_END of the span); the 70vh tail after it is the fade-out
    var p1 = Math.min(1, (parseFloat(ch1.style.getPropertyValue('--p')) || 0) / CH1_END);
    function s1(a0, a1){ return Math.min(1, Math.max(0, (p1 - a0) / (a1 - a0))); }
    // phones (mobile pass): the fall, the clones and the heading come within the first ~60vh, not ~150vh
    var tf = ph1 ? s1(0, .05) : s1(0, .14); tf = Math.round((1 - Math.pow(1 - tf, 3)) * 9) / 9;                // real Tara falls out of the hole
    ch1.style.setProperty('--t', tf.toFixed(4));
    ch1.style.setProperty('--a', (ph1 ? s1(.03, .13) : s1(.12, .36)).toFixed(4));            // clones slide in from the sides
    ch1.style.setProperty('--h', (ph1 ? s1(.1, .18) : s1(.34, .46)).toFixed(4));            // then the heading shows
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
    var cur = 0;
    chapters.forEach(function(c, i){ if (c.getBoundingClientRect().top < vh * 0.5) cur = i; });
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
  var PAGE_SKY = { ranking: 3, partners: 0, request: 6, assets: 0 };
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
      sec.querySelectorAll('.sdots i').forEach(function(d, i){ d.classList.toggle('on', i === idx); d.classList.toggle('done', i < idx); });
    });
  }
  var fadeIn = Array.prototype.slice.call(document.querySelectorAll('.fade-io'));
  var lineupWrap = ch1.querySelector('.lineup-wrap');
  // Line-up figures (CSS v18): the real one is 68vh tall (46vh at 700 px and below) and grows 10% on the reveal.
  // If that would reach the heading block, --fk shrinks every figure by the same factor.
  var ch1Head = ch1.querySelector('.ch1-head'), ch1Stage = ch1.querySelector('.stage');
  var ch1Hs = ch1.querySelector('.hs'), ch1Card = ch1.querySelector('.lineup-wrap .rcard');
  function fitLineup(){
    if (!ch1Stage.clientHeight) return; // home view hidden: refitted on the hash change that shows it
    var vh = window.innerHeight, phone = window.matchMedia('(max-width: 700px)').matches, real = (phone ? .46 : .68) * vh * 1.1;
    var room = ch1Stage.clientHeight + vh * .03 - (ch1Head.offsetTop + ch1Head.offsetHeight) - 16;
    var fk = Math.max(.4, Math.min(1, room / real));
    ch1.style.setProperty('--fk', fk.toFixed(4));
    // 700 px and below (CSS v18): the rank card's top sits 10 px under the answer heading (the sub line is gone
    // by then); it scales down, to .7 at most, when it would reach the top of the real figure's box
    if (phone && ch1Hs && ch1Card) {
      var top = ch1Head.offsetTop + ch1Hs.offsetTop + ch1Hs.offsetHeight + 10;
      var figTop = ch1Stage.clientHeight + vh * .03 - real * fk;
      ch1.style.setProperty('--rct', Math.round(top) + 'px');
      ch1.style.setProperty('--rcs', Math.max(.7, Math.min(1, (figTop - top) / (ch1Card.offsetHeight || 1))).toFixed(4));
    }
  }
  fitLineup();
  window.addEventListener('resize', fitLineup);
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

  // ---- Pages: #home (the story), #ranking, #partners, #request (#pricing redirects to #request) ----
  var PAGES = { home: 1, clubs: 1, partners: 1, ranking: 1, request: 1, assets: 1 };
  var ALIAS = { partners: 'clubs' };
  var REDIRECT = { pricing: 'request' };
  var TITLES = { home: 'ROTRA · Badminton player ranking', clubs: 'For clubs · ROTRA', ranking: 'How ranking works · ROTRA', request: 'Request a quotation · ROTRA', assets: 'Asset list · ROTRA' };
  var NAV_OF = { clubs: 'clubs', request: 'clubs', ranking: 'ranking' };
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
  function route(){
    var h = location.hash.slice(1);
    if (REDIRECT[h]) { h = REDIRECT[h]; try { history.replaceState(null, '', '#' + h); } catch (err) { location.replace('#' + h); return; } }
    var target = !PAGES[h] && h ? document.getElementById(h) : null;
    var next = PAGES[h] ? (ALIAS[h] || h) : ownerView(target);
    var changed = setView(next);
    if (target && h !== 'top') { if (lenis) lenis.scrollTo(target, { duration: 1.2 }); else target.scrollIntoView(); }
    else if (changed || PAGES[h] || h === 'top') toTop();
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
    if (switching) { setView(owner); toTop(); try { history.replaceState(null, '', '#' + owner); } catch (err) {} }
    setTimeout(function(){
      if (lenis) lenis.scrollTo(id === 'top' ? 0 : el, { duration: 1.4 });
      else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    }, switching ? 80 : 0);
  });
  route();


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
    riv: function(name){ return (/-idle$/.test(name) ? '/art/' : '/art/chars/') + name + '.riv?v=3'; },
    still: function(name){ return '/art/chars/' + name + '.webp'; },
    showStill: function(el){
      el.style.backgroundImage = 'url(' + CHR.still(el.getAttribute('data-char')) + ')';
      el.style.backgroundRepeat = 'no-repeat'; el.style.backgroundSize = 'contain'; el.style.backgroundPosition = '50% 100%';
    }
  };
  document.querySelectorAll('.chr[data-char]').forEach(CHR.showStill);

  // ---- Asset list page: built from every placeholder on the site ----
  (function(){
    var out = document.getElementById('assetLists');
    if (!out) return;
    var CH = 'Characters (one looping Rive file per pose, state machine Main, 900x1356; lineup-* 1600x2342)';
    var groups = { 'Background layers (stills, 3 per section; one tall still for phones)': [] };
    groups[CH] = []; groups['Other images and cut-outs'] = [];
    document.querySelectorAll('img.ly').forEach(function(l){ groups['Background layers (stills, 3 per section; one tall still for phones)'].push([l.getAttribute('data-layer'), 'Generated · ' + l.getAttribute('src')]); });
    var seen = {};
    function addChar(n){ if (seen['chr:' + n]) return; seen['chr:' + n] = 1; groups[CH].push([n, CHR.riv(n).replace(/\?.*$/, '') + ' · still ' + CHR.still(n)]); }
    document.querySelectorAll('.chr[data-char]').forEach(function(el){ addChar(el.getAttribute('data-char')); });
    document.querySelectorAll('.hx-ly').forEach(function(l){ groups['Background layers (stills, 3 per section; one tall still for phones)'].push([l.querySelector('b').textContent, l.querySelector('span').textContent]); });
    document.querySelectorAll('.slot:not(.sprite):not(.ly):not(.hx-ly)').forEach(function(el){
      var b = el.querySelector('b'); if (!b) return;
      var t = b.textContent; if (seen[t]) return; seen[t] = 1;
      var sp = el.querySelector('span');
      groups['Other images and cut-outs'].push([t, sp ? sp.textContent : el.textContent.trim()]);
    });
    Object.keys(groups).forEach(function(g){
      var card = document.createElement('div'); card.className = 'card asset-list';
      var h = document.createElement('h3'); h.textContent = g + ' · ' + groups[g].length; card.appendChild(h);
      var ol = document.createElement('ol');
      groups[g].forEach(function(it){ var li = document.createElement('li'); var b = document.createElement('b'); b.textContent = it[0]; var sp = document.createElement('span'); sp.textContent = it[1]; li.appendChild(b); li.appendChild(sp); ol.appendChild(li); });
      card.appendChild(ol); out.appendChild(card);
    });
  })();


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
  findForm.addEventListener('submit', function(e){
    e.preventDefault();
    var q = document.getElementById('findq').value.trim();
    document.getElementById('findMsg').textContent = q ? 'Wireframe: this would open the profile search for “' + q + '” in the Player Information app.' : 'Type a name or an RTR ID first.';
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
