import { ACT, afterAdd, go, openSheet } from '../actions.js'
import { estimateGames, perGameOf } from '../fragments.js'
import {
  capacityOf,
  cur,
  lvLabel,
  nm,
  openSlots,
  P,
  R,
  rebalanceSlots,
  waitOf,
} from '../helpers.js'
import { render } from '../render.js'
import { duePerHead } from '../screens/session-record.js'
import {
  draftAt,
  draftEndOk,
  draftTimes,
  markVisited,
  occurrences,
  WIZ_FIELD_STEP,
  whenError,
} from '../screens/setup.js'
import { DIRECTORY, S, save } from '../state.js'
import {
  commit,
  flushPayments,
  flushPresence,
  heldPresence,
  logSync,
  paymentPending,
  paymentTimer,
  presencePending,
  presenceTimer,
  setCurAct,
  setHeldPresence,
  setPaymentTimer,
  setPresenceTimer,
  toast,
} from '../sync.js'
import { atWhen, ceil15, startNeedsEnd } from '../time.js'

export const ACT_SETUP = {
  wizNext: () => {
    const d = S.ui.draft,
      e = {}
    if (d.step === 0) {
      if (!d.title.trim()) e.title = 'Give the session a title.'
      if (!d.venue.trim()) e.venue = 'Choose where you are playing.'
      const we = whenError(d)
      if (we) e.when = we
    }
    if (d.step === 2) {
      if (d.courtFee !== '' && !(+d.courtFee >= 0)) e.courtFee = 'Use 0 or more, or leave it empty.'
      if (d.entryFee !== '' && !(+d.entryFee >= 0)) e.entryFee = 'Use 0 or more, or leave it empty.'
      if (d.custom && (d.payFee === '' || !(+d.payFee >= 0)))
        e.payFee = 'Enter the amount per player, or switch to break-even.'
    }
    if (d.step === 1) {
      const rosterN = d.id
        ? (S.sessions.find((x) => x.id === d.id) || { roster: [] }).roster.length
        : 0
      if (!rosterN && d.expected !== '' && (!Number.isInteger(+d.expected) || +d.expected < 1))
        e.expected = 'Use a whole number, 1 or more, or leave it empty.'
      if (!d.minAuto && (d.minimum === '' || !Number.isInteger(+d.minimum) || +d.minimum < 0))
        e.minimum = 'Use a whole number, 0 or more.'
    }
    S.ui.errors = e
    if (!Object.keys(e).length) {
      markVisited(d)
      d.step += 1
    }
    render()
    window.scrollTo(0, 0)
  },
  wizBack: () => {
    const d = S.ui.draft
    markVisited(d)
    d.step = Math.max(0, d.step - 1)
    S.ui.errors = {}
    render()
    window.scrollTo(0, 0)
  },
  wizGo: (d) => {
    const dr = S.ui.draft
    const k = +d.k
    if (k === dr.step) return
    markVisited(dr)
    dr.step = k
    S.ui.errors = {}
    render()
    window.scrollTo(0, 0)
    const b = document.querySelector(`.wiz-steps [data-k="${k}"]`)
    if (b) b.focus()
  },
  manualMinimum: () => {
    const d = S.ui.draft
    const rosterN = d.id
      ? (S.sessions.find((x) => x.id === d.id) || { roster: [] }).roster.length
      : 0
    const mins = (t) => {
      const [h, m] = t.split(':').map(Number)
      return h * 60 + m
    }
    d.minimum = estimateGames(
      d.courts.length,
      (mins(d.end) - mins(d.start) + 1440) % 1440 || 1440,
      rosterN || +d.expected,
      perGameOf(d),
    ).low
    d.minAuto = false
    render()
    const el = document.getElementById('f-min')
    if (el) el.focus()
  },
  useEstimate: () => {
    S.ui.draft.minAuto = true
    render()
  },
  courtCount: (d) => {
    const x = S.ui.draft,
      c = x.courts
    if (+d.d > 0) {
      c.push(`Court ${c.length + 1}`)
      x.courtStarts.push('')
      x.courtEnds.push('')
      x.courtStartDays.push(0)
      x.courtEndDays.push(0)
    } else if (c.length > 1) {
      c.pop()
      x.courtStarts.pop()
      x.courtEnds.pop()
      x.courtStartDays.pop()
      x.courtEndDays.pop()
    }
    render()
  },
  saveSetup: () => {
    const d = S.ui.draft,
      e = {}
    if (!d.title.trim()) e.title = 'Give the session a title.'
    if (!d.venue.trim()) e.venue = 'Choose where you are playing.'
    const we = whenError(d)
    if (we) e.when = we
    if (!d.minAuto && (d.minimum === '' || !Number.isInteger(+d.minimum) || +d.minimum < 0))
      e.minimum = 'Use a whole number, 0 or more.'
    const existing = d.id ? S.sessions.find((x) => x.id === d.id) : null
    if (
      !(existing && existing.roster.length) &&
      d.expected !== '' &&
      (!Number.isInteger(+d.expected) || +d.expected < 1)
    )
      e.expected = 'Use a whole number, 1 or more, or leave it empty.'
    if (d.courtFee !== '' && !(+d.courtFee >= 0)) e.courtFee = 'Use 0 or more, or leave it empty.'
    if (d.entryFee !== '' && !(+d.entryFee >= 0)) e.entryFee = 'Use 0 or more, or leave it empty.'
    if (d.custom && (d.payFee === '' || !(+d.payFee >= 0)))
      e.payFee = 'Enter the amount per player, or switch to break-even.'
    const span = draftTimes(d)
    const when = (hm, day) => (hm ? draftAt(d, hm, day) : null)
    if (!draftEndOk(span)) e.end = 'Choose an end after the start.'
    else if (
      d.courts.some((_, i) => {
        const a = when(d.courtStarts[i], d.courtStartDays[i]) ?? span.start,
          b = when(d.courtEnds[i], d.courtEndDays[i]) ?? span.end
        return a < span.start || b > span.end || a >= b
      })
    )
      e.courts =
        'Each court window must start and end within the session, with its end after its start.'
    S.ui.errors = e
    if (Object.keys(e).length) {
      d.step = Math.min(...Object.keys(e).map((k) => WIZ_FIELD_STEP[k] ?? 0))
      render()
      return
    }
    const { start, end } = span
    const courts = d.courts.map((label, i) => ({
      id: `c${i + 1}`,
      label: label.trim() || `Court ${i + 1}`,
      startsAt: when(d.courtStarts[i], d.courtStartDays[i]),
      until: when(d.courtEnds[i], d.courtEndDays[i]),
    }))
    const finance = {
      courtFee: d.courtFee === '' ? null : +d.courtFee,
      entryFee: d.entryFee === '' ? null : +d.entryFee,
      custom: !!d.custom,
      payFee: d.custom ? +d.payFee : null,
      shuttles: (d.shuttles || [])
        .filter((x) => x.itemId && +x.tubes > 0)
        .map((x) => ({ itemId: x.itemId, tubes: +x.tubes })),
    }
    const est = estimateGames(
      courts.length,
      Math.round((end - start) / 60000),
      (existing && existing.roster.length) || +d.expected || courts.length * (+d.perCourt || 8),
      perGameOf(d),
    )
    const fields = {
      title: d.title.trim(),
      start,
      end,
      venue: d.venue.trim(),
      address: d.address.trim(),
      courts,
      singles: d.singles,
      doubles: d.doubles,
      mode: d.mode,
      minimum: d.minAuto ? est.low : +d.minimum,
      minAuto: d.minAuto,
      expected: d.expectedAuto ? null : +d.expected || null,
      perCourt: +d.perCourt || 8,
      notes: d.notes.trim(),
      finance,
    }
    let bal = { moved: 0, filled: 0 }
    if (d.id) {
      const s = S.sessions.find((x) => x.id === d.id)
      Object.assign(s, fields)
      if (s.status === 'prepared') bal = rebalanceSlots(s)
    }
    let made = 1,
      skipped = 0
    if (!d.id) {
      // One prepared session per free date; clashing dates are skipped, never created.
      const occ = occurrences(d),
        free = occ.filter((o) => !o.clash)
      const seriesId = free.length > 1 ? `r${Date.now()}` : null
      free.forEach((o, i) => {
        const id = `s${Date.now()}${i}`
        S.sessions.push({
          id,
          ...JSON.parse(JSON.stringify(fields)),
          courts: courts.map((c) => ({
            ...c,
            startsAt: c.startsAt ? c.startsAt + o.start - start : null,
            until: c.until ? c.until + o.start - start : null,
          })),
          start: o.start,
          end: o.end,
          seriesId,
          status: 'prepared',
          download: 'none',
          roster: [],
          matches: [],
          seq: 0,
          published: null,
        })
        if (i === 0) S.currentId = id
      })
      made = free.length
      skipped = occ.length - free.length
    }
    const pl = (n) => `${n} player${n === 1 ? '' : 's'}`
    const msg = d.id
      ? `Preparation saved${bal.moved ? ` · ${pl(bal.moved)} moved to the waitlist` : bal.filled ? ` · ${pl(bal.filled)} moved from the waitlist` : ''}`
      : made > 1
        ? `${made} sessions created${skipped ? ` · ${skipped} clashing date${skipped > 1 ? 's' : ''} skipped` : ''}`
        : 'Session created'
    S.lastSync = Date.now()
    logSync(d.id ? `${fields.title}: preparation saved` : `${fields.title}: ${msg.toLowerCase()}`)
    save()
    go('prepare')
    toast(msg)
  },
  download: () => {
    const s = cur()
    s.download = 'downloading'
    render()
    setTimeout(() => {
      s.download = 'ready'
      save()
      render()
      toast('Ready on this device')
    }, 1500)
  },
  allPresent: () => {
    cur().roster.forEach((r) => {
      r.present = true
    })
    commit('Everyone marked present')
    render()
  },
  allAbsent: () => {
    cur().roster.forEach((r) => {
      r.present = false
    })
    commit('Everyone marked absent')
    render()
  },
  togglePresent: (d) => {
    const s = cur(),
      r = R(s, d.pid)
    if (presencePending.size && [...presencePending.values()][0].sid !== s.id) flushPresence()
    const before = presencePending.get(d.pid) || {
      sid: s.id,
      pid: d.pid,
      before: r.present,
      beforeAt: r.presentAt,
    }
    if (!heldPresence)
      setHeldPresence({
        filter: S.ui.pl?.show || 'avail',
        ids: [...document.querySelectorAll('.pc3[data-pid]')].map((el) => el.dataset.pid),
      })
    r.present = !r.present
    if (r.present) r.presentAt = Date.now()
    if (r.present === before.before) {
      presencePending.delete(d.pid)
      r.presentAt = before.beforeAt
    } else presencePending.set(d.pid, before)
    clearTimeout(presenceTimer)
    setPresenceTimer(setTimeout(flushPresence, 800))
    render()
  },
  openPayments: () => openSheet({ type: 'payments' }),
  payFilter: (d) => {
    S.ui.payF = d.k
    render()
  },
  togglePaid: (d) => {
    const s = cur()
    s.payments = s.payments || {}
    if (paymentPending.size && [...paymentPending.values()][0].sid !== s.id) flushPayments()
    S.ui.paymentError = null
    const before = paymentPending.get(d.pid) || { sid: s.id, pid: d.pid, before: s.payments[d.pid] }
    if (s.payments[d.pid]) delete s.payments[d.pid]
    else s.payments[d.pid] = { at: Date.now(), amount: duePerHead(s) || 0 }
    if (!!s.payments[d.pid] === !!before.before) {
      if (before.before) s.payments[d.pid] = before.before
      paymentPending.delete(d.pid)
    } else paymentPending.set(d.pid, before)
    clearTimeout(paymentTimer)
    setPaymentTimer(setTimeout(flushPayments, 800))
    render()
  },
  markAllPaid: () => {
    flushPayments()
    const s = cur()
    s.payments = s.payments || {}
    s.roster.filter((r) => !s.payments[r.pid]).forEach((r) => ACT.togglePaid({ pid: r.pid }))
    flushPayments()
  },
  giveSlot: (d) => {
    const s = cur()
    const w = (s.waitlist || []).find((x) => x.pid === d.pid)
    if (!w) return
    const over = !openSlots(s)
    s.waitlist = s.waitlist.filter((x) => x.pid !== d.pid)
    s.roster.push({
      pid: w.pid,
      level: w.level,
      present: s.status === 'active',
      locked: s.status === 'active',
      presentAt: Date.now(),
    })
    commit(
      `${nm(w.pid)} got a slot${s.status === 'active' ? ' · level locked' : ''}${over ? ` · now ${s.roster.length} players for ${capacityOf(s)} slots` : ''}`,
    )
    render()
  },
  fillSlots: () => {
    const s = cur()
    const take = waitOf(s).slice(0, openSlots(s))
    take.forEach((w) => {
      s.roster.push({
        pid: w.pid,
        level: w.level,
        present: s.status === 'active',
        locked: s.status === 'active',
        presentAt: Date.now(),
      })
    })
    s.waitlist = (s.waitlist || []).filter((w) => !take.includes(w))
    commit(`${take.length} player${take.length > 1 ? 's' : ''} moved from the waitlist`)
    render()
  },
  removeWait: (d) => {
    const s = cur()
    s.waitlist = (s.waitlist || []).filter((x) => x.pid !== d.pid)
    commit(`${nm(d.pid)} removed from the waitlist`)
    render()
  },
  perCourt: (x) => {
    const d = S.ui.draft
    d.perCourt = Math.max(2, Math.min(20, (+d.perCourt || 8) + +x.d))
    render()
  },
  clubPerCourt: (x) => {
    S.club.perCourt = Math.max(2, Math.min(20, (S.club.perCourt || 8) + +x.d))
    save()
    render()
  },
  removeRoster: (d) => {
    const s = cur()
    s.roster = s.roster.filter((r) => r.pid !== d.pid)
    save()
    render()
    toast(`${nm(d.pid)} removed from the roster`)
  },
  openAdd: () => openSheet({ type: 'add', tab: 'saved', q: '' }),
  openAddSaved: () => openSheet({ type: 'add', tab: 'global', q: '', club: true }),
  sheetSet: (d, el) => {
    const sh = S.ui.sheet
    let v = d.v === '' ? null : d.v
    if (el.hasAttribute('data-num') && v != null) v = +v
    sh[d.k] = v
    if (d.k === 'tab') {
      sh.q = ''
      sh.pick = null
      sh.err = ''
      sh.level = null
    }
    if (d.k === 'mode') sh.err = ''
    render()
  },
  pickPlayer: (d) => {
    const sh = S.ui.sheet
    const p = d.dir ? DIRECTORY.find((x) => x.id === d.id) : P(d.id)
    sh.pick = { id: d.id, dir: !!d.dir }
    sh.level = p.sugg ?? null
    sh.verify = null
    sh.err = ''
    // Only unclaimed profiles need the identity check; anyone else with a level is added in one tap
    // at their Player Information level, which can still be changed in the roster before the session starts.
    if (p.identity !== 'unclaimed' && p.sugg != null) {
      setCurAct('confirmAdd')
      ACT.confirmAdd()
      return
    }
    render()
  },
  confirmAdd: () => {
    const sh = S.ui.sheet
    if (sh.club) {
      // Saved players › Add player: a Player Information profile joins the saved players; the level is optional.
      const g = DIRECTORY.find((x) => x.id === sh.pick.id)
      if (S.players.some((x) => x.rtr === g.rtr)) {
        sh.pick = null
        sh.err = `${g.name} is already in your saved players.`
        render()
        return
      }
      const level = sh.level == null || sh.level === '' ? null : +sh.level
      S.players.push({
        id: `p${Date.now()}`,
        name: g.name,
        nick: '',
        identity: g.identity,
        rtr: g.rtr,
        sugg: level,
        prior: 0,
        base: null,
        added: Date.now(),
      })
      afterAdd(sh, `${g.name.split(' ')[0]} saved${level != null ? ` · ${lvLabel(level)}` : ''}`)
      return
    }
    const s = cur()
    if (sh.level == null || sh.level === '') {
      sh.err = 'Choose a level for this club before adding.'
      render()
      return
    }
    let pid = sh.pick.id
    if (sh.pick.dir) {
      const g = DIRECTORY.find((x) => x.id === pid)
      pid = `p${Date.now()}`
      S.players.push({
        id: pid,
        name: g.name,
        nick: '',
        identity: g.identity,
        rtr: g.rtr,
        sugg: g.sugg,
        prior: 0,
        base: null,
        added: Date.now(),
      })
    }
    if (s.status !== 'active' && !openSlots(s)) {
      s.waitlist = [...(s.waitlist || []), { pid, level: +sh.level, at: Date.now() }]
      afterAdd(
        sh,
        `${nm(pid)} added to the waitlist as #${s.waitlist.length} · ${lvLabel(+sh.level)}`,
      )
      return
    }
    s.roster.push({
      pid,
      level: +sh.level,
      present: s.status === 'active',
      locked: s.status === 'active',
      presentAt: Date.now(),
    })
    afterAdd(
      sh,
      `${nm(pid)} added · ${lvLabel(+sh.level)}${s.status === 'active' ? ' · level locked' : ''}`,
    )
  },
  confirmNew: () => {
    const sh = S.ui.sheet
    if (!(sh.name || '').trim()) {
      sh.err = 'Enter a name.'
      render()
      return
    }
    if (sh.club) {
      // Saved players › Add player: a guest (no phone) or pending player (phone), with a level only if one was chosen.
      const hasPhone = !!(sh.phone || '').trim(),
        level = sh.level == null || sh.level === '' ? null : +sh.level
      S.players.push({
        id: `p${Date.now()}`,
        name: sh.name.trim(),
        nick: (sh.nick || '').trim(),
        identity: hasPhone ? 'pending' : 'guest',
        rtr: null,
        sugg: level,
        prior: 0,
        base: null,
        added: Date.now(),
      })
      afterAdd(
        sh,
        `${sh.name.trim()} saved${hasPhone ? ' · profile lookup after sync' : ' as a guest'}`,
      )
      return
    }
    const s = cur()
    if (sh.level == null || sh.level === '') {
      sh.err = 'Choose a level for this club.'
      render()
      return
    }
    const pid = `p${Date.now()}`
    const hasPhone = !!(sh.phone || '').trim()
    S.players.push({
      id: pid,
      name: sh.name.trim(),
      nick: (sh.nick || '').trim(),
      identity: hasPhone ? 'pending' : 'guest',
      rtr: null,
      sugg: null,
      prior: 0,
      base: null,
      added: Date.now(),
    })
    if (s.status !== 'active' && !openSlots(s)) {
      s.waitlist = [...(s.waitlist || []), { pid, level: +sh.level, at: Date.now() }]
      afterAdd(sh, `${sh.name.trim()} added to the waitlist as #${s.waitlist.length}`)
      return
    }
    s.roster.push({
      pid,
      level: +sh.level,
      present: s.status === 'active',
      locked: s.status === 'active',
      presentAt: Date.now(),
    })
    afterAdd(
      sh,
      `${sh.name.trim()} added${hasPhone ? ' · profile lookup after sync' : ' as a guest'}`,
    )
  },
  // Late or on another day: the new end is pre-filled with now plus the planned length, rounded up to the next 15 minutes.
  openStart: () => {
    const s = cur()
    openSheet({
      type: 'start',
      endAt: startNeedsEnd(s) ? ceil15(Date.now() + (s.end - s.start)) : null,
    })
  },
  confirmStart: () => {
    const s = cur(),
      sh = S.ui.sheet || {}
    const newEnd = startNeedsEnd(s)
    if (newEnd && !(sh.endAt > Date.now())) {
      if (sh.endAt == null) sh.endAt = ceil15(Date.now() + (s.end - s.start))
      toast('Set a new end time after now to start.')
      render()
      return
    }
    if (newEnd) s.end = sh.endAt
    s.status = 'active'
    s.startedAt = Date.now()
    s.courts.forEach((c) => {
      if (!c.startsAt || c.startsAt === s.start) c.startsAt = s.startedAt
    })
    s.roster.forEach((r) => {
      r.locked = true
      if (r.present) r.presentAt = s.startedAt
    })
    S.ui.sheet = null
    S.ui.pane = 'live'
    S.screen = 'console'
    commit(`Session started · levels locked${newEnd ? ` · ends ${atWhen(s.end)}` : ''}`)
    render()
    window.scrollTo(0, 0)
  },
}
