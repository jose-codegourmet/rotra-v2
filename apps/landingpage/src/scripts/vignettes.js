// The four animated Queue stories in #c-get. Moved verbatim from the old index.html.
export function initVignettes() {
// vignettes: the four animated Queue stories in #c-get. A story plays only while its slide is the current one
// (.scene.cur) and the section is on screen; otherwise it stops and resets. With reduced motion it shows its end state.
(function(){
  var sec = document.getElementById('c-get');
  if (!sec || !sec.querySelector('.vg')) return;
  var rmq = window.matchMedia('(prefers-reduced-motion: reduce)');
  var inView = false;
  var FINAL = { courts: ['s1', 's2'], roster: ['s1', 's2'], pay: ['s1', 's2'], res: ['r1', 'r2', 'r3', 'r4', 'r5', 's1', 's2'] };
  // [ms, action, selector or step]; the last entry is the loop length (end state held, then a short fade and restart)
  var SCRIPTS = {
    courts: [[900, 'move', '.vg-put'], [1900, 'tap', '.vg-put'], [2050, 'step', 's1'], [3500, 'move', '.vg-start'], [4500, 'tap', '.vg-start'], [4650, 'step', 's2'], [5300, 'away'], [8000, 'end']],
    roster: [[900, 'move', '.vg-jo .vg-lvb'], [1900, 'tap', '.vg-jo .vg-lvb'], [2050, 'step', 's1'], [2900, 'move', '.vg-pick'], [3900, 'tap', '.vg-pick'], [4200, 'step', 's2'], [4800, 'away'], [8000, 'end']],
    pay: [[900, 'move', '.vg-andi .vg-sw'], [1900, 'tap', '.vg-andi .vg-sw'], [2050, 'step', 's1'], [2700, 'away'], [3300, 'step', 's2'], [7600, 'end']],
    res: [[500, 'step', 'r1'], [750, 'step', 'r2'], [1000, 'step', 'r3'], [1250, 'step', 'r4'], [1500, 'step', 'r5'], [2200, 'step', 's1'], [3000, 'move', '.vg-share'], [4000, 'tap', '.vg-share'], [4200, 'step', 's2'], [4800, 'away'], [8000, 'end']]
  };
  function fmt(n, f){
    var s = Math.round(n).toLocaleString('en-US');
    return f === 'peso' ? '₱' + s : f === 'neg' ? '−₱' + s : s;
  }
  function Vg(el){
    this.el = el; this.kind = el.getAttribute('data-vg'); this.scene = el.closest('.scene');
    this.cur = el.querySelector('.vg-cur'); this.timers = []; this.rafs = []; this.mode = 'idle';
    this.steps = []; FINAL[this.kind].forEach(function(c){ this.steps.push(c); }, this);
  }
  Vg.prototype.has = function(c){ return this.el.classList.contains(c); };
  Vg.prototype.at = function(ms, fn){ this.timers.push(setTimeout(fn.bind(this), ms)); };
  Vg.prototype.sync = function(anim){
    var self = this;
    this.el.querySelectorAll('[data-swap]').forEach(function(n){
      var t = self.has(n.getAttribute('data-swap')) ? n.getAttribute('data-b') : n.getAttribute('data-a');
      if (n.textContent !== t) n.textContent = t;
    });
    this.el.querySelectorAll('[data-on],[data-off]').forEach(function(n){
      var on = n.getAttribute('data-on'), off = n.getAttribute('data-off');
      n.classList.toggle('vg-hide', !((!on || self.has(on)) && (!off || !self.has(off))));
    });
    this.el.querySelectorAll('[data-count]').forEach(function(n){
      var a = +n.getAttribute('data-a'), b = +n.getAttribute('data-b'), f = n.getAttribute('data-fmt');
      var to = self.has(n.getAttribute('data-count')) ? b : a;
      if (n._v === to) return;
      var from = n._v == null ? a : n._v; n._v = to;
      if (!anim) { n.textContent = fmt(to, f); return; }
      var t0 = performance.now();
      (function tick(now){
        var k = Math.min(1, (now - t0) / 700), e = 1 - Math.pow(1 - k, 3);
        n.textContent = fmt(from + (to - from) * e, f);
        if (k < 1) self.rafs.push(requestAnimationFrame(tick));
      })(t0);
    });
    var grid = this.el.querySelector('[data-flip]');
    if (grid) this.order(grid, this.has(grid.getAttribute('data-flip')), anim);
  };
  // the paid card moves to its sorted place (unpaid first, then by name), with a FLIP slide
  Vg.prototype.order = function(grid, after, anim){
    var cards = Array.prototype.slice.call(grid.children), key = after ? 'data-o2' : 'data-o';
    if (grid._after === after) return; grid._after = after;
    var before = anim ? cards.map(function(c){ return c.getBoundingClientRect(); }) : null;
    cards.forEach(function(c){ c.style.order = c.getAttribute(key); c.style.transition = ''; c.style.transform = ''; });
    if (!anim) return;
    cards.forEach(function(c, i){
      var r = c.getBoundingClientRect(), dx = before[i].left - r.left, dy = before[i].top - r.top;
      if (!dx && !dy) return;
      c.style.transition = 'none'; c.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    });
    void grid.offsetWidth;
    cards.forEach(function(c){ if (c.style.transform) { c.style.transition = 'transform .6s cubic-bezier(.2,.9,.3,1),border-color .35s,background-color .35s'; c.style.transform = ''; } });
  };
  Vg.prototype.move = function(sel){
    var t = this.el.querySelector(sel); if (!t) return;
    var e = this.el.getBoundingClientRect(), r = t.getBoundingClientRect();
    var x = r.left - e.left + Math.min(r.width / 2, 40), y = r.top - e.top + r.height / 2;
    this.cur.style.transform = 'translate(' + (x - 4).toFixed(1) + 'px,' + (y - 3).toFixed(1) + 'px)';
    this.cur.classList.add('on');
  };
  Vg.prototype.tap = function(sel){
    var t = this.el.querySelector(sel), c = this.cur;
    c.classList.remove('tap'); void c.offsetWidth; c.classList.add('tap');
    if (t) t.classList.add('hit');
    this.at(450, function(){ c.classList.remove('tap'); if (t) t.classList.remove('hit'); });
  };
  Vg.prototype.rest = function(){
    var c = this.cur, w = this.el.clientWidth, h = this.el.clientHeight;
    c.classList.add('jump'); c.classList.remove('on', 'tap');
    c.style.transform = 'translate(' + Math.round(w * .62) + 'px,' + (h + 10) + 'px)';
    void c.offsetWidth; c.classList.remove('jump');
  };
  Vg.prototype.clear = function(){
    this.timers.forEach(clearTimeout); this.timers = [];
    this.rafs.forEach(cancelAnimationFrame); this.rafs = [];
    this.el.querySelectorAll('.hit').forEach(function(n){ n.classList.remove('hit'); });
  };
  Vg.prototype.reset = function(){
    this.clear();
    this.el.classList.remove('vg-out', 'vg-rm');
    this.steps.forEach(function(c){ this.el.classList.remove(c); }, this);
    this.sync(false); this.rest();
    // hold the start height so the slide's heading and caption don't shift when a story collapses a row
    this.el.style.minHeight = '';
    if (this.el.offsetHeight) this.el.style.minHeight = this.el.offsetHeight + 'px';
  };
  Vg.prototype.run = function(){
    var self = this;
    SCRIPTS[this.kind].forEach(function(s){
      self.at(s[0], function(){
        if (s[1] === 'move') this.move(s[2]);
        else if (s[1] === 'tap') this.tap(s[2]);
        else if (s[1] === 'step') { this.el.classList.add(s[2]); this.sync(true); }
        else if (s[1] === 'away') this.cur.classList.remove('on');
        else if (s[1] === 'end') {
          this.el.classList.add('vg-out');
          this.at(400, function(){ this.reset(); this.run(); });
        }
      });
    });
  };
  Vg.prototype.play = function(){ if (this.mode === 'play') return; this.mode = 'play'; this.reset(); this.run(); };
  Vg.prototype.stop = function(){ if (this.mode === 'idle') return; this.mode = 'idle'; this.reset(); };
  Vg.prototype.final = function(){
    if (this.mode === 'final') return; this.mode = 'final';
    this.clear();
    this.el.classList.remove('vg-out');
    this.el.classList.add('vg-rm'); this.el.style.minHeight = '';
    this.steps.forEach(function(c){ this.el.classList.add(c); }, this);
    this.sync(false); this.cur.classList.remove('on', 'tap');
  };
  var vgs = Array.prototype.map.call(sec.querySelectorAll('.vg'), function(el){ return new Vg(el); });
  function update(){
    vgs.forEach(function(v){
      if (rmq.matches) v.final();
      else if (inView && !document.hidden && v.scene && v.scene.classList.contains('cur')) v.play();
      else v.stop();
    });
  }
  vgs.forEach(function(v){ v.reset(); });
  if ('IntersectionObserver' in window) new IntersectionObserver(function(es){ inView = es[es.length - 1].isIntersecting; update(); }).observe(sec);
  else inView = true;
  var mo = new MutationObserver(update);
  vgs.forEach(function(v){ if (v.scene) mo.observe(v.scene, { attributes: true, attributeFilter: ['class'] }); });
  document.addEventListener('visibilitychange', update);
  if (rmq.addEventListener) rmq.addEventListener('change', update); else if (rmq.addListener) rmq.addListener(update);
  update();
})();
}
