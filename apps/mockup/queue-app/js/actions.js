import { ACT_APP } from './actions/app.js'
import { ACT_CLUB } from './actions/club.js'
import { ACT_CONSOLE } from './actions/console.js'
import { ACT_SETUP } from './actions/setup.js'
import { cur, lvLabel, R, short } from './helpers.js'
import { render } from './render.js'
import { peso } from './screens/financials.js'
import { S } from './state.js'
import { commit, flushPayments, flushPresence, toast } from './sync.js'
import { DT } from './time.js'

// ---------- Actions ----------
export function openSheet(sh) {
  S.ui.sheet = sh
  render()
}
// Adding a player keeps the Add player dialog open on the same tab, cleared and ready for the next one.
export function afterAdd(sh, msg) {
  commit(msg)
  S.ui.sheet = {
    type: 'add',
    tab: sh.tab || (sh.club ? 'global' : 'saved'),
    last: msg,
    added: (sh.added || 0) + 1,
    club: sh.club,
  }
  render()
}
// Picking a venue fills the session's venue, address and (when the venue has one) court fee, which stays editable.
export function applyVenue(v, msg) {
  const d = S.ui.draft
  d.venueId = v.id
  d.venue = v.name
  d.address = v.address || ''
  const fee = v.courtFee != null
  if (fee) d.courtFee = v.courtFee
  const entry = v.entranceFee != null
  if (entry) d.entryFee = v.entranceFee
  if (S.ui.errors) delete S.ui.errors.venue
  S.ui.sheet = null
  render()
  toast(
    msg ||
      (fee || entry
        ? `${v.name} · ${[fee && `court fee ${peso(v.courtFee)}/h`, entry && `entrance ${peso(v.entranceFee)}`].filter(Boolean).join(' and ')} filled in`
        : `${v.name} selected`),
  )
}
export function closeSheet() {
  flushPayments()
  S.ui.sheet = null
  render()
}
export function go(to, id) {
  if (id) S.currentId = id
  S.ui.sheet = null
  S.ui.guest = false
  S.ui.navOpen = false
  S.ui.setOpen = false
  if (to === 'results') S.ui.slide = 0
  if (to === 'prepare' && cur()?.status === 'active') S.ui.prepTab = 'overview'
  if (to === 'public') S.ui.pubTab = 'details'
  S.screen = to
  render()
  window.scrollTo(0, 0)
}
export const ACT = {
  ...ACT_APP,
  ...ACT_CLUB,
  ...ACT_SETUP,
  ...ACT_CONSOLE,
}
export const CHANGE = {
  dtTime: (el) => {
    const p = DT[el.dataset.k]
    if (!p) return
    p.set(el.value === '' ? null : +el.value)
    render()
  },
  autoSelect: (el) => ACT.autoSelect(el.dataset, el),
  draftShuttleItem: (el) => {
    S.ui.draft.shuttles[+el.dataset.i].itemId = el.value
    render()
  },
  plSet: (el) => {
    S.ui.pl = { ...(S.ui.pl || {}), [el.dataset.k]: el.value }
    render()
  },
  rvSet: (el) => {
    S.ui.rv = { ...(S.ui.rv || {}), [el.dataset.k]: el.value }
    render()
  },
  reqLevel: (el) => {
    const r = (cur().requests || []).find((x) => x.id === el.dataset.id)
    r.level = el.value === '' ? null : +el.value
    r.err = ''
    render()
  },
  spSet: (el) => {
    S.ui.spf = { ...(S.ui.spf || {}), [el.dataset.k]: el.value }
    render()
  },
  draftSel: (el) => {
    S.ui.draft[el.dataset.k] = el.value
    if (el.dataset.k === 'repeat' && !S.ui.draft.repeatCount) S.ui.draft.repeatCount = 4
    delete S.ui.errors.when
    render()
  },
  setLevel: (el) => {
    flushPresence()
    const s = cur()
    const r = R(s, el.dataset.pid)
    r.level = el.value === '' ? null : +el.value
    commit(`${short(el.dataset.pid)}: ${lvLabel(r.level)}`)
    render()
  },
  slot: (el) => {
    const sh = S.ui.sheet
    sh[el.dataset.team][+el.dataset.i] = el.value || null
    sh.err = ''
    render()
  },
  pubSlide: (el) => {
    const sh = S.ui.sheet
    const k = +el.dataset.k
    sh.slides = el.checked ? [...new Set([...sh.slides, k])] : sh.slides.filter((x) => x !== k)
    render()
  },
}
