import { HIST_TABS } from './screens/session-record.js'
import { draftFrom } from './screens/setup.js'
import { S } from './state.js'
import { flushPayments, flushPresence } from './sync.js'

// ---------- Prototype routes (same paths as apps/queue, under /queue) ----------
export let prototypeRouter
export function setPrototypeRouter(v) {
  prototypeRouter = v
}
const queuePaths = {
  home: '',
  login: '/login',
  venues: '/venues',
  inventory: '/inventory',
  players: '/saved-players',
}
const settingsSlugs = {
  identity: 'club-identity',
  defaults: 'session-defaults',
  post: 'facebook-post',
  license: 'license',
  payments: 'license',
  device: 'this-device',
  account: 'account',
}
const sessionSuffixes = {
  prepare: '/preparation',
  console: '',
  history: '/record',
  finalizing: '/finishing',
  results: '/results',
}
export function prototypePath() {
  let path = queuePaths[S.screen]
  let tab
  if (S.screen === 'club') path = `/club-settings/${settingsSlugs[S.ui.clubTab] || 'club-identity'}`
  if (S.screen === 'setup')
    path = S.ui.draft?.id ? `/sessions/${encodeURIComponent(S.ui.draft.id)}/edit` : '/sessions/new'
  if (S.screen in sessionSuffixes)
    path = `/sessions/${encodeURIComponent(S.currentId)}${sessionSuffixes[S.screen]}`
  if (S.screen === 'prepare')
    tab = S.ui.prepTab && S.ui.prepTab !== 'overview' ? S.ui.prepTab : null
  if (S.screen === 'console')
    tab = ['queue', 'roster', 'board'].includes(S.ui.pane) ? S.ui.pane : null
  if (S.screen === 'history') tab = S.ui.histTab && S.ui.histTab !== 'results' ? S.ui.histTab : null
  if (S.screen === 'results') tab = S.ui.slide ? String(S.ui.slide) : null
  if (S.screen === 'public') {
    path = S.ui.guest
      ? `/s/${encodeURIComponent(S.currentId)}`
      : `/sessions/${encodeURIComponent(S.currentId)}/public-page`
    tab = S.ui.pubTab === 'participants' ? 'participants' : null
  }
  return `/queue${path ?? ''}${tab ? `?tab=${encodeURIComponent(tab)}` : ''}`
}
export function applyPrototypeRoute(url) {
  flushPresence()
  flushPayments()
  const path = url.pathname.slice('/queue'.length)
  let screen = Object.entries(queuePaths).find(([, value]) => value === path)?.[0]
  let session = null
  const setting = path.match(/^\/club-settings(?:\/([^/]+))?$/)
  const match = path.match(
    /^\/sessions\/([^/]+)(?:\/(preparation|edit|record|finishing|results|public-page|recovery))?$/,
  )
  const guest = path.match(/^\/s\/([^/]+)$/)
  const tab = url.searchParams.get('tab')
  if (setting) {
    const entry = Object.entries(settingsSlugs).find(
      ([, slug]) => slug === (setting[1] || 'club-identity'),
    )
    if (!entry) return false
    screen = 'club'
    S.ui.clubTab = entry[0]
  }
  if (path === '/sessions/new') {
    screen = 'setup'
    if (S.screen !== 'setup' || !S.ui.draft || S.ui.draft.id) S.ui.draft = draftFrom(null)
    S.ui.errors = {}
  } else if (match || guest) {
    const id = decodeURIComponent((match || guest)[1])
    session = S.sessions.find((s) => s.id === id)
    if (!session) return false
    S.currentId = session.id
    if (guest || match[2] === 'public-page') {
      screen = 'public'
      S.ui.guest = !!guest
    } else if (match[2] === 'edit') {
      screen = 'setup'
      if (S.screen !== 'setup' || S.ui.draft?.id !== session.id) S.ui.draft = draftFrom(session)
      S.ui.errors = {}
    } else
      screen = Object.entries(sessionSuffixes).find(
        ([, suffix]) => suffix === (match[2] ? `/${match[2]}` : ''),
      )?.[0]
    // Re-entry only selects an available view; it must never restart finalization.
    if (
      match?.[2] === 'recovery' ||
      screen === 'finalizing' ||
      (screen === 'console' && session.status !== 'active')
    )
      screen =
        session.status === 'active'
          ? 'console'
          : session.status === 'prepared'
            ? 'prepare'
            : 'history'
    if (screen === 'setup' && session.status !== 'prepared')
      screen = session.status === 'active' ? 'console' : 'history'
    if (screen === 'prepare' && !['prepared', 'active'].includes(session.status)) screen = 'history'
    if (screen === 'results' && session.status !== 'finalized')
      screen =
        session.status === 'prepared'
          ? 'prepare'
          : session.status === 'active'
            ? 'console'
            : 'history'
  }
  if (!screen) return false
  S.screen = screen
  S.ui.sheet = null
  S.ui.navOpen = false
  S.ui.setOpen = false
  if (screen !== 'public') S.ui.guest = false
  S.ui.prepTab = ['roster', 'waitlist', 'payments'].includes(tab) ? tab : 'overview'
  S.ui.pane = ['queue', 'roster', 'board'].includes(tab) ? tab : 'live'
  S.ui.histTab = HIST_TABS.some(([key]) => key === tab) ? tab : 'results'
  S.ui.slide = ['1', '2'].includes(tab) ? Number(tab) : 0
  S.ui.pubTab = tab === 'participants' ? tab : 'details'
  return true
}
