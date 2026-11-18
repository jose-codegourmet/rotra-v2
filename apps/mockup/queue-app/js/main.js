import './state.js'
import './helpers.js'
import './time.js'
import './rules/court-fill.js'
import './sync.js'
import './icons.js'
import './fragments.js'
import './screens/login.js'
import './screens/home.js'
import './screens/financials.js'
import './screens/club-settings.js'
import './screens/venues.js'
import './demo-sessions.js'
import './screens/session-record.js'
import './screens/saved-players.js'
import './screens/setup.js'
import './screens/prepare.js'
import './screens/console.js'
import './screens/console-auto.js'
import './screens/console-board.js'
import './screens/results.js'
import './screens/public.js'
import './sheets/player-picker.js'
import './sheets/sheets.js'
import './sheets/account.js'
import './sheets/calendar.js'
import './sheets/roster.js'
import './sheets/court.js'
import './sheets/session.js'
import './rules/matchmaking.js'
import './actions.js'
import './actions/app.js'
import './actions/club.js'
import './actions/setup.js'
import './actions/console.js'
import './events.js'
import './events-drag.js'
import './routes.js'
import './render.js'
import { ensureHistory } from './demo-sessions.js'
import { drag, pdrag } from './events-drag.js'
import { capacityOf, courtOpen, rebalanceSlots } from './helpers.js'
import { render } from './render.js'
import {
  applyPrototypeRoute,
  prototypePath,
  prototypeRouter,
  setPrototypeRouter,
} from './routes.js'
import { autoFill, autoNote } from './rules/court-fill.js'
import { seedInventory } from './screens/financials.js'
import { calView } from './screens/home.js'
import { liveSession } from './screens/saved-players.js'
import { S, save, seedVenues } from './state.js'
import { commit, curAct, setCurAct } from './sync.js'

if (!S.inventory) {
  S.inventory = seedInventory()
  save()
}
if (!S.venues) {
  S.venues = seedVenues()
  save()
}
ensureHistory()
// Re-draw the dashboard calendar when the screen crosses a month / week / day breakpoint.
let lastCalView = calView()
window.addEventListener('resize', () => {
  const v = calView()
  if (v !== lastCalView) {
    lastCalView = v
    if (S.screen === 'home' && !S.ui.sheet) render()
  }
})
// Sessions saved before the budget was enforced on edit may hold more slots than courts × players; settle them first come, first served.
S.sessions.forEach((x) => {
  if (x.status === 'prepared' && x.roster.length > capacityOf(x)) rebalanceSlots(x)
})
// Auto Queue also fills a court when it reaches its planned opening time (checked on the console's 30-second refresh).
let openSeen = null
function autoFillOpened() {
  const s = liveSession()
  if (!s) return
  const open = s.courts.filter((c) => courtOpen(s, c)).map((c) => c.id)
  const fresh =
    openSeen && openSeen.sid === s.id ? open.filter((id) => !openSeen.ids.includes(id)) : []
  openSeen = { sid: s.id, ids: open }
  const placed = fresh.length ? autoFill(s, { only: fresh }) : []
  if (placed.length) {
    const prev = curAct
    setCurAct('setCourtFill')
    commit(`Court open${autoNote(s, placed)}`)
    setCurAct(prev)
  }
}
setInterval(() => {
  if (
    S.screen === 'console' &&
    !S.ui.sheet &&
    !drag &&
    !pdrag &&
    !(document.activeElement && /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName))
  ) {
    autoFillOpened()
    render()
  }
}, 30000)
setPrototypeRouter(
  window.mountPrototypeRouter?.({
    read: prototypePath,
    apply: applyPrototypeRoute,
    render,
    home: '/queue',
  }),
)
if (!prototypeRouter) render()
