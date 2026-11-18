import { closeSheet, go, openSheet } from '../actions.js'
import { buildLive, ensureHistory, isDemoLive, LIVE_SCENARIOS } from '../demo-sessions.js'
import { cur } from '../helpers.js'
import { render } from '../render.js'
import { calRef, calView } from '../screens/home.js'
import { draftFrom, sessionLink } from '../screens/setup.js'
import {
  freshState,
  isDark,
  migrateLevels,
  NAV_KEY,
  narrowScreen,
  navMin,
  S,
  save,
  setNavMin,
  setS,
  THEME_KEY,
} from '../state.js'
import { toast } from '../sync.js'

export const ACT_APP = {
  go: (d) => go(d.to, d.id),
  closeSheet,
  openDemo: () => openSheet({ type: 'demo' }),
  toggleTheme: () => {
    const t = isDark() ? 'light' : 'dark'
    document.documentElement.dataset.theme = t
    try {
      localStorage.setItem(THEME_KEY, t)
    } catch (e) {
      /* keep for this visit only */
    }
    render()
    const b = document.querySelector('.theme-btn')
    if (b) b.focus()
    toast(`${t === 'light' ? 'Light' : 'Dark'} mode`)
  },
  togglePass: () => {
    S.ui.login.show = !S.ui.login.show
    render()
  },
  togglePw: () => {
    S.ui.pw.show = !S.ui.pw.show
    render()
  },
  toggleOnline: () => {
    S.online = !S.online
    if (S.online && S.pending) {
      S.syncing = true
      render()
      setTimeout(() => {
        S.syncing = false
        const n = S.pending
        S.pending = 0
        S.lastSync = Date.now()
        ;(S.syncLog || []).forEach((x) => {
          if (!x.synced) x.synced = S.lastSync
        })
        save()
        render()
        toast(`Synced ${n} change${n > 1 ? 's' : ''}`)
      }, 1400)
    } else if (S.online) S.lastSync = Date.now()
    save()
    render()
  },
  toggleLicense: () => {
    S.licenseExpired = !S.licenseExpired
    save()
    render()
  },
  openSignOut: () => {
    S.ui.navOpen = false
    S.ui.setOpen = false
    openSheet({ type: 'signOut' })
  },
  toggleNav: () => {
    if (narrowScreen()) {
      S.ui.navOpen = !S.ui.navOpen
      if (S.ui.navOpen) S.ui.setOpen = false
      render()
      const t = S.ui.navOpen
        ? document.querySelector('.rail .rail-link')
        : document.querySelector('.burger')
      if (t) t.focus()
      return
    }
    setNavMin(!navMin)
    try {
      localStorage.setItem(NAV_KEY, navMin ? 'min' : 'open')
    } catch (e) {
      /* this visit only */
    }
    render()
    const b = document.querySelector('.burger')
    if (b) b.focus()
  },
  signOut: () => {
    S.screen = 'login'
    S.ui.sheet = null
    S.ui.login.pass = ''
    save()
    render()
  },
  reset: () => {
    setS(freshState())
    migrateLevels()
    ensureHistory()
    render()
    toast('Demo data reset')
  },
  openPast: (d) => openSheet({ type: 'past', id: d.id }),
  calDay: (d) => {
    S.ui.calDay = +d.k
    openSheet({ type: 'calDay', t: +d.k })
  },
  calMove: (d) => {
    const r = new Date(calRef()),
      n = +d.d,
      v = calView()
    S.ui.calRef =
      v === 'month'
        ? new Date(r.getFullYear(), r.getMonth() + n, 1).getTime()
        : new Date(
            r.getFullYear(),
            r.getMonth(),
            r.getDate() + n * (v === 'week' ? 7 : 1),
          ).getTime()
    render()
  },
  calToday: () => {
    S.ui.calRef = null
    S.ui.calDay = null
    render()
  },
  calPick: (d) => {
    S.ui.calRef = +d.k
    render()
    const b = document.querySelector(`.cal-sday[data-k="${d.k}"]`)
    if (b) b.focus()
  },
  goClub: (d) => {
    S.ui.clubTab = d.k === 'club' ? 'identity' : d.k
    go('club')
  },
  openSettingsMenu: () => {
    S.ui.navOpen = false
    S.ui.setOpen = true
    render()
    const b =
      document.querySelector('.settings-nav .side-link.on') ||
      document.querySelector('.settings-nav .side-link')
    if (b) b.focus()
  },
  closeSettingsMenu: () => {
    S.ui.setOpen = false
    render()
    const b = document.querySelector('.settings-trigger')
    if (b) b.focus()
  },
  clubTab: (d) => {
    const wasOpen = S.ui.setOpen
    S.ui.clubTab = d.k
    S.ui.setOpen = false
    render()
    if (wasOpen) {
      const t = document.querySelector('.settings-trigger')
      if (t) t.focus()
      window.scrollTo(0, 0)
      return
    }
    window.scrollTo(0, 0)
    const b = document.querySelector(`.settings-nav [data-k="${d.k}"]`)
    if (b) b.focus()
  },
  newSession: (d) => {
    S.ui.draft = draftFrom(null, d && d.k ? +d.k : null)
    S.ui.errors = {}
    go('setup')
  },
  editSetup: () => {
    S.ui.draft = draftFrom(cur())
    S.ui.errors = {}
    go('setup')
  },
  cancelSetup: () => go(S.ui.draft && S.ui.draft.id ? 'prepare' : 'home'),
  openSync: () => openSheet({ type: 'sync' }),
  openVenue: () => openSheet({ type: 'venue', mode: 'pick', q: '' }),
  openPost: () => openSheet({ type: 'post' }),
  copyLink: () => {
    const v = sessionLink(cur())
    try {
      navigator.clipboard.writeText(v)
    } catch (e) {
      /* clipboard unavailable */
    }
    toast('Session link copied')
  },
  openGuest: (d) => {
    go('public', d.id)
    S.ui.guest = true
    render()
  },
  toggleAcceptReq: () => {
    const s = cur()
    s.acceptReq = s.acceptReq === false
    save()
    render()
    toast(s.acceptReq ? 'Join requests are on' : 'Join requests are off')
  },
  openJoin: () => openSheet({ type: 'join', band: null }),
  sendJoin: () => {
    const sh = S.ui.sheet,
      s = cur(),
      err = {}
    if (!(sh.name || '').trim()) err.name = 'Enter your name.'
    if ((sh.phone || '').trim() && sh.phone.replace(/\D/g, '').length < 10)
      err.phone = 'Enter a full mobile number, or leave it empty.'
    if (!sh.band) err.band = 'Pick your level, or Not sure.'
    sh.err = err
    if (Object.keys(err).length) {
      render()
      const f = document.getElementById(
        err.name ? 'join-name' : err.phone ? 'join-phone' : 'join-name',
      )
      if (f) f.focus()
      return
    }
    const r = {
      id: `q${Date.now()}`,
      name: sh.name.trim(),
      nick: (sh.nick || '').trim(),
      phone: (sh.phone || '').trim(),
      band: sh.band,
      at: Date.now(),
      status: 'pending',
    }
    s.requests = [...(s.requests || []), r]
    S.ui.guestReq = { sid: s.id, id: r.id }
    S.ui.sheet = null
    save()
    render()
    toast('Request sent')
  },
  fakeReq: (d) => {
    const s = S.sessions.find((x) => x.id === d.id)
    const names = [
      ['Rico Santos', 'Rics', '0917 555 0142', 'Intermediate'],
      ['Mae Lagman', '', '', 'Beginner'],
      ['JP Uy', 'JP', '0928 555 0199', 'Advanced'],
      ['Tessa Ramos', '', '0905 555 0110', 'unsure'],
    ]
    const [name, nick, phone, band] = names[(s.requests || []).length % names.length]
    s.requests = [
      ...(s.requests || []),
      { id: `q${Date.now()}`, name, nick, phone, band, at: Date.now(), status: 'pending' },
    ]
    save()
    render()
    toast(`${name} sent a join request to ${s.title}`)
  },
  // Prototype › Demo scenarios: rebuild the chosen live example and make it the only live session.
  demoScenario: (d) => {
    const other = S.sessions.find((x) => x.status === 'active' && !isDemoLive(x))
    if (other || (d.k !== 'none' && !LIVE_SCENARIOS[d.k])) {
      render()
      return
    }
    S.sessions = S.sessions.filter((x) => !(x.status === 'active' && isDemoLive(x)))
    // "No live example" clears the demo so a planned session can be started by hand.
    if (d.k === 'none') {
      save()
      go('home')
      toast('No live example · you can start a planned session')
      return
    }
    const s = buildLive(d.k)
    S.sessions.push(s)
    S.ui.pane = d.k === 'admission' ? 'roster' : 'live'
    go('console', s.id)
    toast(`Demo scenario: ${LIVE_SCENARIOS[d.k].label}`)
  },
}
