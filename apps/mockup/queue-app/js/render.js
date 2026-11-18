import { lastTrigger } from './events.js'
import { hasShell, topBar } from './fragments.js'
import { prototypeRouter } from './routes.js'
import { viewConsole } from './screens/console.js'
import { viewInventory } from './screens/financials.js'
import { mobileDock, navRail, viewHome } from './screens/home.js'
import { viewLogin } from './screens/login.js'
import { viewPrepare } from './screens/prepare.js'
import { viewPublic } from './screens/public.js'
import { viewFinalizing, viewResults } from './screens/results.js'
import { setupSavedPlayerStats, viewPlayers } from './screens/saved-players.js'
import { replayTo, viewHistory } from './screens/session-record.js'
import { viewSetup } from './screens/setup.js'
import { viewClub, viewVenues } from './screens/venues.js'
import { SHEETS } from './sheets/sheets.js'
import { navMin, S, save } from './state.js'

// ---------- Render ----------
let lastSheetKey = null
export function render() {
  if (prototypeRouter?.unavailable) return
  const a = document.activeElement
  const focusId = a && a.id && a !== document.body ? a.id : null
  let selStart = null
  try {
    selStart = a && typeof a.selectionStart === 'number' ? a.selectionStart : null
  } catch (e) {
    selStart = null
  }
  const views = {
    login: viewLogin,
    home: viewHome,
    venues: viewVenues,
    club: viewClub,
    inventory: viewInventory,
    history: viewHistory,
    players: viewPlayers,
    setup: viewSetup,
    prepare: viewPrepare,
    console: viewConsole,
    finalizing: viewFinalizing,
    results: viewResults,
    public: viewPublic,
  }
  const sh = S.ui.sheet
  const page = (views[S.screen] || viewHome)()
  const html =
    topBar() +
    (hasShell()
      ? `<div class="shell ${navMin ? 'rail-min' : ''} ${S.ui.navOpen ? 'nav-open' : ''}">${navRail()}<div class="nav-scrim" data-act="toggleNav" aria-hidden="true"></div><div class="shell-main">${page}</div>${mobileDock()}</div>`
      : page) +
    (sh ? SHEETS[sh.type](sh) : '')
  document.getElementById('app').innerHTML = html
  setupSavedPlayerStats()
  document.body.style.overflow = sh ? 'hidden' : ''
  const key = sh
    ? `${sh.type}|${sh.step || ''}|${sh.pick ? 'p' : ''}|${sh.tab || ''}|${sh.picking ? 'k' : ''}`
    : null
  if (sh && key !== lastSheetKey) {
    const t =
      document.querySelector('.sheet [data-autofocus]') || document.getElementById('sheet-title')
    if (t) t.focus()
  } else if (focusId && document.getElementById(focusId)) {
    const el = document.getElementById(focusId)
    el.focus()
    if (selStart != null && el.setSelectionRange) {
      try {
        el.setSelectionRange(selStart, selStart)
      } catch (e) {
        /* not a text field */
      }
    }
    // Number fields can't report or set the caret, and a fresh one puts it at the start, so typing "450" came out "054".
    // Re-assigning the value moves the caret to the end, where the person was typing.
    else if (el.type === 'number') {
      const v = el.value
      el.value = ''
      el.value = v
    }
  } else if (!sh && lastSheetKey && lastTrigger) {
    const sel =
      `[data-act="${lastTrigger.act}"]` + (lastTrigger.id ? `[data-id="${lastTrigger.id}"]` : '')
    const t =
      document.querySelector(sel) || document.querySelector(`[data-act="${lastTrigger.act}"]`)
    if (t) t.focus()
  }
  lastSheetKey = key
  const rp = document.getElementById('rp-range')
  if (rp) replayTo(+rp.value)
  save()
  prototypeRouter?.sync()
}
