import { cur, short, waiting } from './helpers.js'
import { render } from './render.js'
import { S } from './state.js'
import { commit, setCurAct, toast } from './sync.js'

export let drag = null
function moveTo(id, targetId) {
  const s = cur()
  const w = waiting(s)
  const from = w.findIndex((m) => m.id === id),
    to = w.findIndex((m) => m.id === targetId)
  if (from < 0 || to < 0 || from === to) return
  const [item] = w.splice(from, 1)
  w.splice(to, 0, item)
  w.forEach((m, i) => {
    m.pos = i + 1
  })
  setCurAct('moveTo')
  commit(`Match ${item.seq} moved to #${to + 1}`)
  render()
}
document.addEventListener('pointerdown', (e) => {
  const h = e.target.closest('[data-drag-handle]')
  if (!h) return
  const card = h.closest('[data-qid]')
  e.preventDefault()
  drag = { id: card.dataset.qid, card, target: null, x: e.clientX, y: e.clientY }
  card.classList.add('dragging')
  try {
    h.setPointerCapture(e.pointerId)
  } catch (err) {
    /* capture unsupported */
  }
})
document.addEventListener('pointermove', (e) => {
  if (!drag) return
  drag.card.style.transform = `translate(${e.clientX - drag.x}px, ${e.clientY - drag.y}px)`
  const el = document.elementFromPoint(e.clientX, e.clientY)
  const t = el && el.closest('[data-qid]')
  document.querySelectorAll('.qtile.drop').forEach((x) => x.classList.remove('drop'))
  drag.target = t && t.dataset.qid !== drag.id ? t.dataset.qid : null
  if (drag.target) t.classList.add('drop')
})
function endDrag(apply) {
  if (!drag) return
  const { id, target, card } = drag
  drag = null
  card.classList.remove('dragging')
  card.style.transform = ''
  document.querySelectorAll('.qtile.drop').forEach((x) => x.classList.remove('drop'))
  if (apply && target) moveTo(id, target)
}
document.addEventListener('pointerup', () => endDrag(true))
document.addEventListener('pointercancel', () => endDrag(false))

// Drag a player onto someone on the other team to switch sides: queue tiles, Start match, Suggested match and Edit lineup.
// A mouse or pen drag starts after a few pixels; on touch, press and hold first so the page still scrolls.
export let pdrag = null,
  swallowClick = false
const swapEl = (el) => (el && el.closest ? el.closest('[data-swap]') : null)
export const slotOf = (el) => ({ team: el.dataset.team, i: +el.dataset.i })
export function swapObj(scope) {
  const sh = S.ui.sheet
  return scope === 'sg'
    ? sh.lineup
    : scope === 'ed'
      ? sh
      : cur().matches.find((m) => m.id === scope.slice(2))
}
export function swapSides(scope, a, b) {
  const o = swapObj(scope)
  if (!o || a.team === b.team) return
  const x = o[a.team][a.i],
    y = o[b.team][b.i]
  o[a.team][a.i] = y
  o[b.team][b.i] = x
  const what = y
    ? `${short(x)} and ${short(y)} switched sides`
    : `${short(x)} moved to Team ${b.team === 'teamA' ? 'A' : 'B'}`
  setCurAct('swapSides')
  if (scope.startsWith('m:')) {
    o.protected = true
    commit(`Match ${o.seq}: ${what} · protected from regeneration`)
  } else {
    if (scope === 'sg') S.ui.sheet.edited = true
    toast(what)
  }
  render()
}
function pdLift() {
  const d = pdrag,
    r = d.el.getBoundingClientRect(),
    g = d.el.cloneNode(true)
  g.classList.add('swap-ghost')
  g.removeAttribute('id')
  g.setAttribute('aria-hidden', 'true')
  Object.assign(g.style, {
    left: `${r.left}px`,
    top: `${r.top}px`,
    width: `${r.width}px`,
    height: `${r.height}px`,
  })
  document.body.appendChild(g)
  d.g = g
  d.on = true
  d.el.classList.add('swap-src')
  document.body.classList.add('swapping')
  if (d.touch && navigator.vibrate) navigator.vibrate(10)
}
function pdMove(x, y) {
  const d = pdrag
  d.g.style.transform = `translate(${x - d.x}px, ${y - d.y}px)`
  const t = swapEl(document.elementFromPoint(x, y))
  const ok = t && t.dataset.swap === d.el.dataset.swap && t.dataset.team !== d.el.dataset.team
  if (d.over && d.over !== t) d.over.classList.remove('swap-over')
  d.over = ok ? t : null
  if (d.over) d.over.classList.add('swap-over')
}
function pdEnd(apply) {
  const d = pdrag
  if (!d) return
  pdrag = null
  clearTimeout(d.timer)
  if (!d.on) return
  d.g.remove()
  d.el.classList.remove('swap-src')
  document.body.classList.remove('swapping')
  if (d.over) d.over.classList.remove('swap-over')
  swallowClick = true
  setTimeout(() => {
    swallowClick = false
  }, 400)
  if (apply && d.over) swapSides(d.el.dataset.swap, slotOf(d.el), slotOf(d.over))
}
// The click that ends a drag must not open the profile or the slot picker.
window.addEventListener(
  'click',
  (e) => {
    if (swallowClick) {
      swallowClick = false
      e.preventDefault()
      e.stopPropagation()
    }
  },
  true,
)
document.addEventListener('dragstart', (e) => {
  if (swapEl(e.target)) e.preventDefault()
})
document.addEventListener('contextmenu', (e) => {
  if (pdrag) e.preventDefault()
})
document.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'touch' || e.button !== 0) return
  const el = swapEl(e.target)
  if (el && el.dataset.pid) pdrag = { el, x: e.clientX, y: e.clientY, on: false }
})
document.addEventListener('pointermove', (e) => {
  if (!pdrag || pdrag.touch) return
  if (!pdrag.on) {
    if (Math.hypot(e.clientX - pdrag.x, e.clientY - pdrag.y) < 6) return
    pdLift()
  }
  pdMove(e.clientX, e.clientY)
})
document.addEventListener('pointerup', () => {
  if (pdrag && !pdrag.touch) pdEnd(true)
})
document.addEventListener('pointercancel', () => {
  if (pdrag && !pdrag.touch) pdEnd(false)
})
document.addEventListener(
  'touchstart',
  (e) => {
    const el = swapEl(e.target)
    if (!el || !el.dataset.pid || e.touches.length > 1) return
    const p = e.touches[0]
    pdrag = { el, x: p.clientX, y: p.clientY, on: false, touch: true }
    pdrag.timer = setTimeout(() => {
      if (pdrag && pdrag.el === el) pdLift()
    }, 280)
  },
  { passive: true },
)
document.addEventListener(
  'touchmove',
  (e) => {
    if (!pdrag || !pdrag.touch) return
    const p = e.touches[0]
    if (!pdrag.on) {
      if (Math.hypot(p.clientX - pdrag.x, p.clientY - pdrag.y) > 8) pdEnd(false)
      return
    }
    e.preventDefault()
    pdMove(p.clientX, p.clientY)
  },
  { passive: false },
)
document.addEventListener('touchend', () => {
  if (pdrag && pdrag.touch) pdEnd(true)
})
document.addEventListener('touchcancel', () => {
  if (pdrag && pdrag.touch) pdEnd(false)
})
let resizeTimer
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    if (S.screen === 'console' && S.ui.pane !== 'roster' && !drag && !pdrag && !S.ui.sheet) render()
  }, 150)
})
