import { ACT, closeSheet, go, openSheet } from '../actions.js'
import {
  all,
  busyOf,
  courtFill,
  courtMatches,
  courtOpen,
  courtStart,
  courtsNeeded,
  courtsOf,
  cur,
  freeCourts,
  onCourt,
  openedEarly,
  R,
  sessionCourtStart,
  short,
  waiting,
} from '../helpers.js'
import { render } from '../render.js'
import { autoFill, autoNote, blockOf, placeMatch, swapCandidate } from '../rules/court-fill.js'
import { addMatch, generate } from '../rules/matchmaking.js'
import { autoState, generateDrafts, queueFingerprint } from '../screens/console-auto.js'
import { balancedTeams, matchPlan } from '../screens/console-board.js'
import { FORMAT_LABEL, FORMATS, S, save } from '../state.js'
import { commit, logSync, setCurAct, toast } from '../sync.js'
import { addCourtWindow, atWhen, ceil15, dtPickDay, fmtWhen } from '../time.js'

export const ACT_CONSOLE = {
  pane: (d) => {
    S.ui.pane = d.k
    render()
  },
  prepTab: (d) => {
    S.ui.prepTab = d.k
    render()
    const b = document.getElementById(`ptb-${d.k}`)
    if (b) b.focus()
  },
  rvSet: (d) => {
    S.ui.rv = { ...(S.ui.rv || {}), [d.k]: d.v }
    render()
  },
  plSet: (d) => {
    S.ui.pl = { ...(S.ui.pl || {}), [d.k]: d.v }
    render()
  },
  selPlayer: (d) => {
    const cur_ = S.ui.sel || []
    S.ui.sel = cur_.includes(d.pid) ? cur_.filter((x) => x !== d.pid) : [...cur_, d.pid]
    render()
    const el = document.querySelector(`.pc3[data-pid="${d.pid}"]`)
    if (el) el.focus()
  },
  selClear: () => {
    S.ui.sel = []
    render()
  },
  makeMatch: () => {
    const s = cur()
    const sel = (S.ui.sel || []).filter((pid) => R(s, pid))
    const plan = matchPlan(s, sel)
    if (!plan.ok) return
    const m = addMatch(s, { format: plan.fmt, ...balancedTeams(s, sel, plan.fmt) }, 'manual', true)
    const pos = waiting(s).findIndex((x) => x.id === m.id) + 1
    S.ui.sel = []
    commit(`${FORMAT_LABEL[plan.fmt]} added to the queue at #${pos}${autoNote(s, autoFill(s))}`)
    render()
  },
  openDispatch: (d) => {
    const s = cur()
    const m = s.matches.find((x) => x.id === d.id)
    const free = freeCourts(s).map((c) => c.id)
    const first = d.court && free.includes(d.court) ? d.court : free[0]
    const courts =
      courtsNeeded(m) === 2 ? [first, ...free.filter((c) => c !== first)].slice(0, 2) : [first]
    openSheet({ type: 'dispatch', id: d.id, courts: courts.filter(Boolean) })
  },
  pickCourt: (d) => {
    const s = cur(),
      sh = S.ui.sheet,
      m = s.matches.find((x) => x.id === sh.id)
    if (courtsNeeded(m) === 1) sh.courts = [d.id]
    else
      sh.courts = sh.courts.includes(d.id)
        ? sh.courts.filter((c) => c !== d.id)
        : [...sh.courts, d.id].slice(-2)
    render()
  },
  confirmDispatch: () => {
    const s = cur(),
      sh = S.ui.sheet,
      m = s.matches.find((x) => x.id === sh.id)
    if (
      !m ||
      m.status !== 'waiting' ||
      blockOf(s, m) ||
      sh.courts.length !== courtsNeeded(m) ||
      sh.courts.some((c) => !freeCourts(s).some((f) => f.id === c))
    ) {
      toast('Something changed. Review the match again.')
      render()
      return
    }
    placeMatch(m, sh.courts)
    S.ui.sheet = null
    commit(`Match ${m.seq} on ${courtsOf(s, m)} · getting ready`)
    render()
  },
  // Put on court straight from a free court card or Pick another (one-court matches).
  placeOnCourt: (d) => {
    const s = cur(),
      m = s.matches.find((x) => x.id === d.id)
    if (
      !m ||
      m.status !== 'waiting' ||
      courtsNeeded(m) !== 1 ||
      blockOf(s, m) ||
      !freeCourts(s).some((c) => c.id === d.court)
    ) {
      S.ui.sheet = null
      toast('Something changed. Review the match again.')
      render()
      return
    }
    placeMatch(m, [d.court])
    S.ui.sheet = null
    commit(`Match ${m.seq} on ${courtsOf(s, m)} · getting ready`)
    render()
  },
  // Start match on an On court match: one tap, rechecked. The minutes timer starts now.
  startOnCourt: (d) => {
    const s = cur(),
      m = s.matches.find((x) => x.id === d.id)
    const courtsOk =
      m &&
      m.courts.length === courtsNeeded(m) &&
      m.courts.every((id) => {
        const c = s.courts.find((x) => x.id === id)
        return (
          c && courtOpen(s, c) && !courtMatches(s).some((o) => o !== m && o.courts.includes(id))
        )
      })
    if (!m || m.status !== 'oncourt' || blockOf(s, m) || !courtsOk) {
      toast('Something changed. Review the match again.')
      render()
      return
    }
    m.status = 'active'
    m.startedAt = Date.now()
    S.ui.sheet = null
    commit(`Match ${m.seq} started on ${courtsOf(s, m)}`)
    render()
  },
  // Send back to queue: to the top of the queue; the court frees. In Auto Queue the court refills with another match.
  sendBack: (d) => {
    const s = cur(),
      m = s.matches.find((x) => x.id === d.id)
    if (!m || m.status !== 'oncourt') {
      S.ui.sheet = null
      toast('Something changed. Review the match again.')
      render()
      return
    }
    const where = courtsOf(s, m)
    m.status = 'waiting'
    m.courts = []
    delete m.placedAt
    m.pos =
      Math.min(
        1,
        ...waiting(s)
          .filter((x) => x !== m)
          .map((x) => x.pos || 0),
      ) - 1
    S.ui.sheet = null
    commit(
      `Match ${m.seq} back to #1 in the queue · ${where} free${autoNote(s, autoFill(s, { except: m.id }))}`,
    )
    render()
  },
  // Swap with the queue goes through a confirmation that shows the court and the queue slot before and after.
  openSwap: (d) => {
    const s = cur(),
      m = s.matches.find(
        (x) => x.id === d.id || (x.status === 'oncourt' && x.courts.includes(d.id)),
      )
    const n = swapCandidate(s, m)
    S.ui.courtMenu = null
    if (!n) {
      toast('Something changed. Review the match again.')
      render()
      return
    }
    openSheet({
      type: 'swap',
      id: m.id,
      with: n.id,
      back: S.ui.sheet && S.ui.sheet.type === 'onCourt',
    })
  },
  confirmSwap: () => {
    const s = cur(),
      sh = S.ui.sheet,
      m = s.matches.find((x) => x.id === sh.id),
      n = swapCandidate(s, m)
    if (!n || n.id !== sh.with) {
      toast('Something changed. Review the match again.')
      render()
      return
    }
    const where = courtsOf(s, m),
      pos = n.pos
    placeMatch(n, m.courts)
    m.status = 'waiting'
    m.courts = []
    delete m.placedAt
    m.pos = pos
    S.ui.sheet = null
    commit(
      `Match ${n.seq} swapped onto ${where} · getting ready · Match ${m.seq} back to #${waiting(s).indexOf(m) + 1} in the queue`,
    )
    render()
  },
  openReplace: (d) => openSheet({ type: 'replace', id: d.id, out: null, in: null }),
  confirmReplace: () => {
    const s = cur(),
      sh = S.ui.sheet,
      m = s.matches.find((x) => x.id === sh.id)
    const r = m && R(s, sh.in)
    if (
      !m ||
      m.status !== 'oncourt' ||
      !all(m).includes(sh.out) ||
      all(m).includes(sh.in) ||
      !r ||
      !r.present ||
      busyOf(s, sh.in)
    ) {
      toast('Something changed. Review the match again.')
      render()
      return
    }
    const team = m.teamA.includes(sh.out) ? 'teamA' : 'teamB'
    m[team] = m[team].map((p) => (p === sh.out ? sh.in : p))
    m.protected = true
    S.ui.sheet = { type: 'onCourt', id: m.id }
    commit(`Match ${m.seq}: ${short(sh.in)} in for ${short(sh.out)} · lineup changed`)
    render()
  },
  openMoveCourt: (d) => openSheet({ type: 'moveCourt', id: d.id, courts: [] }),
  confirmMove: () => {
    const s = cur(),
      sh = S.ui.sheet,
      m = s.matches.find((x) => x.id === sh.id)
    if (
      !m ||
      m.status !== 'oncourt' ||
      sh.courts.length !== courtsNeeded(m) ||
      sh.courts.some((c) => !freeCourts(s).some((f) => f.id === c))
    ) {
      toast('Something changed. Review the match again.')
      render()
      return
    }
    const from = courtsOf(s, m)
    m.courts = sh.courts.slice()
    S.ui.sheet = { type: 'onCourt', id: m.id }
    commit(
      `Match ${m.seq} moved from ${from} to ${courtsOf(s, m)} · getting ready${autoNote(s, autoFill(s))}`,
    )
    render()
  },
  // Manual Queue | Auto Queue, per session. Switching Auto on fills every free open court now, in court order.
  setCourtFill: (d) => {
    const s = cur()
    if (courtFill(s) === d.k) return
    s.courtFill = d.k === 'auto' ? 'auto' : 'manual'
    commit(
      s.courtFill === 'auto'
        ? `Auto Queue on${autoNote(s, autoFill(s))}`
        : 'Manual Queue on · matches already on court stay where they are',
    )
    render()
  },
  openMatch: (d) => {
    const m = cur().matches.find((x) => x.id === d.id)
    openSheet({ type: m && m.status === 'oncourt' ? 'onCourt' : 'match', id: d.id })
  },
  openChooseMatch: (d) => openSheet({ type: 'chooseMatch', court: d.court }),
  openResult: (d) =>
    openSheet({ type: 'result', id: d.id, mode: 'winner', winner: null, a: '', b: '' }),
  reviewResult: () => {
    const sh = S.ui.sheet
    const filled = (v) => v !== '' && v != null
    const ok = (v) => filled(v) && Number.isInteger(+v) && +v >= 0
    if (filled(sh.a) || filled(sh.b)) {
      if (!ok(sh.a) || !ok(sh.b)) {
        sh.err = 'Enter both scores as whole numbers, or clear them.'
        render()
        return
      }
      if (+sh.a === +sh.b) {
        sh.err = 'A tie can’t decide a winner. Correct the score, or clear it and pick a winner.'
        render()
        return
      }
      const byScore = +sh.a > +sh.b ? 'A' : 'B'
      if (sh.winner && sh.winner !== byScore) {
        sh.err = `The score says Team ${byScore} won, but Team ${sh.winner} is picked. Fix one of them.`
        render()
        return
      }
      sh.winner = byScore
      sh.mode = 'scores'
    } else {
      if (!sh.winner) {
        sh.err = 'Pick a winner or enter the final score.'
        render()
        return
      }
      sh.mode = 'winner'
    }
    sh.err = ''
    sh.step = 'review'
    render()
  },
  clearScores: () => {
    const sh = S.ui.sheet
    sh.a = ''
    sh.b = ''
    sh.err = ''
    render()
  },
  confirmResult: () => {
    const s = cur(),
      sh = S.ui.sheet,
      m = s.matches.find((x) => x.id === sh.id)
    if (m.status !== 'active') {
      closeSheet()
      return
    }
    m.status = 'done'
    m.winner = sh.winner
    m.endedAt = Date.now()
    if (sh.mode === 'scores') {
      m.scoreA = +sh.a
      m.scoreB = +sh.b
    }
    S.ui.sheet = null
    commit(
      `Team ${sh.winner} wins match ${m.seq} · ${courtsOf(s, m)} free${autoNote(s, autoFill(s))}`,
    )
    render()
  },
  openSub: (d) =>
    openSheet({ type: 'sub', id: d.id, out: null, in: null, credit: 'none', step: '' }),
  confirmSub: () => {
    const s = cur(),
      sh = S.ui.sheet,
      m = s.matches.find((x) => x.id === sh.id)
    if (!m || m.status !== 'active') {
      closeSheet()
      return
    }
    const team = m.teamA.includes(sh.out) ? 'teamA' : 'teamB',
      slot = m[team].indexOf(sh.out)
    const credit = ['in', 'out'].includes(sh.credit) ? sh.credit : 'none'
    m[team] = m[team].map((p) => (p === sh.out ? sh.in : p))
    m.subs = m.subs || []
    // At most one person per team slot gets the game: a new person choice clears an earlier one for that slot.
    if (credit !== 'none')
      m.subs.forEach((x) => {
        if (x.team === (team === 'teamA' ? 'A' : 'B') && x.slot === slot) x.credit = 'none'
      })
    m.subs.push({
      out: sh.out,
      in: sh.in,
      team: team === 'teamA' ? 'A' : 'B',
      slot,
      credit,
      at: Date.now(),
    })
    const who = credit === 'in' ? sh.in : credit === 'out' ? sh.out : null
    S.ui.sheet = { type: 'match', id: m.id }
    commit(`${short(sh.in)} in for ${short(sh.out)}${who ? ` · ${short(who)} gets the game` : ''}`)
    render()
  },
  openInvalid: (d) => openSheet({ type: 'invalid', id: d.id }),
  confirmInvalid: () => {
    const s = cur(),
      sh = S.ui.sheet,
      m = s.matches.find((x) => x.id === sh.id)
    m.status = 'invalid'
    m.endedAt = Date.now()
    S.ui.sheet = null
    commit(`Match ${m.seq} marked invalid · ${courtsOf(s, m)} free${autoNote(s, autoFill(s))}`)
    render()
  },
  openEditor: (d) => {
    const s = cur()
    if (d && d.id) {
      const m = s.matches.find((x) => x.id === d.id)
      openSheet({
        type: 'editor',
        id: m.id,
        format: m.format,
        teamA: m.teamA.slice(),
        teamB: m.teamB.slice(),
      })
      return
    }
    openSheet({
      type: 'editor',
      id: null,
      format: s.doubles ? 'doubles' : s.singles ? 'singles' : '3v3',
      teamA: [],
      teamB: [],
    })
  },
  pickSlot: (d) => {
    const sh = S.ui.sheet
    sh.picking = { team: d.team, i: +d.i }
    sh.pq = ''
    sh.pf = sh.pf || 'avail'
    render()
  },
  clearSlot: (d) => {
    const sh = S.ui.sheet
    sh[d.team][+d.i] = null
    render()
  },
  choosePick: (d) => {
    const sh = S.ui.sheet
    const { team, i } = sh.picking
    sh[team][i] = d.id
    sh.picking = null
    sh.err = ''
    render()
    const b = document.getElementById(`slot-${team}-${i}`)
    if (b) b.focus()
  },
  pickBack: () => {
    const sh = S.ui.sheet
    const { team, i } = sh.picking
    sh.picking = null
    render()
    const b = document.getElementById(`slot-${team}-${i}`)
    if (b) b.focus()
  },
  editorFormat: (d) => {
    const sh = S.ui.sheet
    sh.format = d.v
    const [a, b] = FORMATS[d.v]
    sh.teamA = sh.teamA.slice(0, a)
    sh.teamB = sh.teamB.slice(0, b)
    sh.err = ''
    render()
  },
  saveEditor: () => {
    const s = cur(),
      sh = S.ui.sheet
    const [na, nb] = FORMATS[sh.format]
    const A = Array.from({ length: na }, (_, i) => sh.teamA[i]),
      B = Array.from({ length: nb }, (_, i) => sh.teamB[i])
    const used = A.concat(B)
    if (used.some((p) => !p)) {
      sh.err = 'Fill every slot. Team sizes are fixed by the format.'
      render()
      return
    }
    if (new Set(used).size !== used.length) {
      sh.err = 'Each player can only take one slot in a match.'
      render()
      return
    }
    if (sh.id) {
      const m = s.matches.find((x) => x.id === sh.id)
      Object.assign(m, { format: sh.format, teamA: A, teamB: B, protected: true })
    } else addMatch(s, { format: sh.format, teamA: A, teamB: B }, 'manual', true)
    S.ui.sheet = null
    S.ui.pane = 'queue'
    commit(
      sh.id
        ? 'Lineup saved · protected from regeneration'
        : `Match added to the queue${autoNote(s, autoFill(s))}`,
    )
    render()
  },
  openSuggest: () => {
    const r = generate(cur(), 1)
    openSheet({ type: 'suggest', lineup: r.matches ? r.matches[0] : null, error: r.error })
  },
  skipSuggest: () => {
    const r = generate(cur(), 1)
    S.ui.sheet.lineup = r.matches ? r.matches[0] : null
    S.ui.sheet.error = r.error
    render()
  },
  editSuggest: () => {
    const m = S.ui.sheet.lineup
    openSheet({
      type: 'editor',
      id: null,
      format: m.format,
      teamA: m.teamA.slice(),
      teamB: m.teamB.slice(),
    })
  },
  addSuggest: () => {
    const s = cur()
    addMatch(s, S.ui.sheet.lineup, 'suggested', !!S.ui.sheet.edited)
    S.ui.sheet = null
    S.ui.pane = 'queue'
    commit(`Suggestion added to the queue${autoNote(s, autoFill(s))}`)
    render()
  },
  queueWorkspace: (d) => {
    S.ui.queueWorkspace = d.k
    S.ui.pane = 'queue'
    render()
  },
  autoTab: (d) => {
    autoState(cur()).tab = d.k
    autoState(cur()).error = ''
    render()
  },
  autoCount: (d) => {
    autoState(cur()).count = +d.n
    render()
  },
  autoSelect: (d, el) => {
    const a = autoState(cur())
    a.selected = a.selected.filter((id) => id !== d.id)
    if (el.checked) a.selected.push(d.id)
    render()
  },
  autoToggle: (d) => {
    const a = autoState(cur())
    a.selected = a.selected.includes(d.id)
      ? a.selected.filter((id) => id !== d.id)
      : [...a.selected, d.id]
    render()
    const t = document.querySelector(`[data-act="autoToggle"][data-id="${d.id}"]`)
    if (t) t.focus()
  },
  autoUnselect: () => {
    autoState(cur()).selected = []
    render()
  },
  autoClear: () => {
    S.ui.courtMenu = null
    const a = autoState(cur()),
      b = a.batches[a.tab]
    if (!b) {
      render()
      return
    }
    const ids = b.cards.map((m) => m.draftId)
    a.selected = a.selected.filter((id) => !ids.includes(id))
    delete a.batches[a.tab]
    render()
  },
  autoClearUnselected: () => {
    S.ui.courtMenu = null
    const a = autoState(cur()),
      b = a.batches[a.tab]
    if (b) {
      b.cards = b.cards.filter((m) => a.selected.includes(m.draftId))
      delete b.stop
    }
    render()
  },
  autoGenerate: () => ACT.autoBuild(false),
  autoRegenerate: () => ACT.autoBuild(false),
  autoRegenerateUnselected: () => {
    S.ui.courtMenu = null
    ACT.autoBuild(true)
  },
  autoBuild: (keep) => {
    const s = cur(),
      a = autoState(s),
      old = a.batches[a.tab] || { cards: [] }
    const fixed = keep ? old.cards.filter((m) => a.selected.includes(m.draftId)) : []
    const r = generateDrafts(s, a.tab, Math.max(0, a.count - fixed.length), a.target, fixed)
    if (r.error) {
      a.error = r.error
      render()
      return
    }
    const removed = old.cards.filter((m) => !fixed.includes(m)).map((m) => m.draftId)
    a.selected = a.selected.filter((id) => !removed.includes(id))
    a.batches[a.tab] = {
      cards: [
        ...fixed,
        ...r.matches.map((m) => ({ ...m, draftId: `d${a.next++}`, strategy: a.tab })),
      ],
      fingerprint:
        fixed.length && old.fingerprint !== queueFingerprint(s)
          ? old.fingerprint
          : queueFingerprint(s),
      stop: r.stop,
    }
    a.error = ''
    render()
  },
  autoAddTab: () => {
    const a = autoState(cur())
    openSheet({ type: 'autoReview', ids: (a.batches[a.tab]?.cards || []).map((m) => m.draftId) })
  },
  autoReview: () => openSheet({ type: 'autoReview', ids: autoState(cur()).selected.slice() }),
  autoCommit: () => {
    const s = cur(),
      a = autoState(s),
      cards = Object.values(a.batches).flatMap((b) => b.cards)
    const ids = S.ui.sheet.ids,
      selected = ids.map((id) => cards.find((m) => m.draftId === id)).filter(Boolean)
    if (!selected.length || selected.length !== ids.length || new Set(ids).size !== ids.length) {
      S.ui.sheet.error = 'Drafts changed. Review them again.'
      render()
      return
    }
    const invalid = selected.find(
      (m) =>
        !FORMATS[m.format] ||
        (m.format === 'singles' && !s.singles) ||
        (m.format === 'doubles' && !s.doubles) ||
        m.teamA.length !== FORMATS[m.format][0] ||
        m.teamB.length !== FORMATS[m.format][1] ||
        all(m).some(
          (p) => !R(s, p) || !R(s, p).present || (m.strategy !== 'ahead' && busyOf(s, p)),
        ) ||
        new Set(all(m)).size !== all(m).length,
    )
    if (invalid) {
      S.ui.sheet.error =
        'A selected draft needs attention: check player presence, playing dependencies and lineups, then regenerate.'
      render()
      return
    }
    selected.forEach((m) => addMatch(s, m, 'auto', false))
    Object.values(a.batches).forEach((b) => {
      b.cards = b.cards.filter((m) => !ids.includes(m.draftId))
    })
    a.selected = a.selected.filter((id) => !ids.includes(id))
    S.ui.sheet = null
    S.ui.queueWorkspace = 'main'
    commit(`${selected.length} drafts added to Main Queue${autoNote(s, autoFill(s))}`)
    render()
  },
  openAuto: () => {
    S.ui.queueWorkspace = 'auto'
    S.ui.pane = 'queue'
    render()
  },
  openRegen: () => openSheet({ type: 'regen' }),
  confirmRegen: () => {
    const s = cur()
    const rebuild = waiting(s).filter(
      (m) => !m.protected || (blockOf(s, m) || {}).kind === 'attention',
    )
    const slots = rebuild.map((m) => m.pos)
    s.matches = s.matches.filter((m) => !rebuild.includes(m))
    const r = generate(s, rebuild.length)
    if (r.error) {
      s.matches.push(...rebuild)
      S.ui.sheet = null
      render()
      toast(r.error)
      return
    }
    r.matches.forEach((m, i) => addMatch(s, m, 'auto', false, slots[i]))
    S.ui.sheet = null
    commit(`Queue regenerated · ${r.matches.length} rebuilt${autoNote(s, autoFill(s))}`)
    render()
  },
  move: (d) => {
    const s = cur()
    const w = waiting(s)
    const i = w.findIndex((m) => m.id === d.id)
    const j = i + +d.d
    if (j < 0 || j >= w.length) return
    ;[w[i].pos, w[j].pos] = [w[j].pos, w[i].pos]
    commit('Queue order changed')
    render()
    const g = document.querySelector(`.qt-grip[data-id="${d.id}"]`)
    if (g) g.focus()
  },
  removeWaiting: (d) => {
    const s = cur()
    const m = s.matches.find((x) => x.id === d.id)
    s.matches = s.matches.filter((x) => x.id !== d.id)
    commit(`Waiting match ${m.seq} removed`)
    render()
  },
  openAdjust: (d) => {
    const s = cur()
    openSheet({
      type: 'adjust',
      court: '',
      endAt: s.end > Date.now() ? s.end : ceil15(Date.now() + 1),
      focus: d && d.k === 'end' ? 'end' : '',
      err: '',
    })
  },
  // Set end time: any time after now. Courts that follow the session end move with it; a court booked past the new end blocks it.
  setEnd: () => {
    const s = cur(),
      sh = S.ui.sheet,
      t = sh.endAt
    if (!(t > Date.now())) {
      sh.err = 'Choose an end time after now.'
      render()
      return
    }
    const opens = s.courts.find((c) => courtStart(s, c) >= t),
      booked = s.courts.find((c) => c.until && c.until > t)
    if (opens) {
      sh.err = `${opens.label} opens ${atWhen(courtStart(s, opens))}. Pick a later end, or edit that court first.`
      render()
      return
    }
    if (booked) {
      sh.err = `${booked.label} is booked until ${fmtWhen(booked.until, { lower: true })}. Pick a later end, or edit that court first.`
      render()
      return
    }
    s.end = t
    sh.err = ''
    commit(`Session ends ${atWhen(s.end)} · public page updates after sync`)
    render()
  },
  addCourt: () => {
    const s = cur(),
      sh = S.ui.sheet
    const label = (sh.court || '').trim() || `Court ${s.courts.length + 1}`
    s.courts.push({ id: `c${Date.now()}`, label })
    sh.court = ''
    commit(`${label} added`)
    render()
  },
  removeCourt: (d) => {
    S.ui.courtMenu = null
    const s = cur()
    const c = s.courts.find((x) => x.id === d.id)
    if (!c || s.courts.length <= 1 || courtMatches(s).some((m) => m.courts.includes(d.id))) {
      toast('Only a free court can be removed')
      return
    }
    s.courts = s.courts.filter((x) => x.id !== d.id)
    commit(`${c.label} removed`)
    render()
  },
  toggleCourtMenu: (d) => {
    S.ui.courtMenu = S.ui.courtMenu === d.id ? null : d.id
    render()
    const b = document.querySelector(`[data-act="toggleCourtMenu"][data-id="${d.id}"]`)
    if (b) b.focus()
  },
  openEarly: (d) => openSheet({ type: 'openEarly', ids: [d.id] }),
  openAllEarly: () => {
    const s = cur()
    openSheet({ type: 'openEarly', ids: s.courts.filter((c) => !courtOpen(s, c)).map((c) => c.id) })
  },
  // Start anyway: records when the court actually opened; the planned start (the booking) stays as it is.
  confirmOpenEarly: () => {
    const s = cur(),
      sh = S.ui.sheet
    const list = sh.ids
      .map((id) => s.courts.find((c) => c.id === id))
      .filter((c) => c && !courtOpen(s, c))
    if (s.status !== 'active' || !list.length) {
      S.ui.sheet = null
      toast('Something changed. Review the courts again.')
      render()
      return
    }
    list.forEach((c) => {
      c.openedEarlyAt = Date.now()
    })
    S.ui.sheet = null
    commit(
      `${list.length === 1 ? `${list[0].label} opened early · planned ${fmtWhen(courtStart(s, list[0]), { lower: true })}` : `${list.length} courts opened early`}${autoNote(s, autoFill(s, { only: list.map((c) => c.id) }))}`,
    )
    render()
  },
  dispatchOpenEarly: (d) => {
    const s = cur(),
      sh = S.ui.sheet,
      c = s.courts.find((x) => x.id === d.id),
      m = s.matches.find((x) => x.id === sh.id)
    if (s.status !== 'active' || !c || courtOpen(s, c)) {
      toast('Something changed. Review the courts again.')
      render()
      return
    }
    c.openedEarlyAt = Date.now()
    sh.courts =
      courtsNeeded(m) === 1 ? [c.id] : [...sh.courts.filter((x) => x !== c.id), c.id].slice(-2)
    commit(`${c.label} opened early · planned ${fmtWhen(courtStart(s, c), { lower: true })}`)
    render()
  },
  undoEarly: (d) => {
    const s = cur(),
      c = s.courts.find((x) => x.id === d.id)
    S.ui.courtMenu = null
    if (!c || !openedEarly(s, c) || courtMatches(s).some((m) => m.courts.includes(c.id))) {
      toast('Only a free court can go back to Not open yet')
      render()
      return
    }
    delete c.openedEarlyAt
    commit(`${c.label} back to Not open yet · opens ${fmtWhen(courtStart(s, c), { lower: true })}`)
    render()
  },
  editCourt: (d) => {
    S.ui.courtMenu = null
    const s = cur(),
      c = s.courts.find((x) => x.id === d.id)
    if (s.status === 'active' && courtMatches(s).some((m) => m.courts.includes(c.id))) {
      toast('A match is on this court. Edit it when the court is free.')
      render()
      return
    }
    openSheet({
      type: 'addCourt',
      id: c.id,
      label: c.label,
      startAt: courtStart(s, c),
      mode: c.until ? 'time' : 'end',
      untilAt: c.until || s.end,
      err: '',
    })
  },
  quickAddCourt: () => {
    const s = cur()
    openSheet({
      type: 'addCourt',
      label: `Court ${s.courts.length + 1}`,
      startAt: sessionCourtStart(s),
      mode: 'end',
      untilAt: s.end,
      err: '',
    })
  },
  confirmAddCourt: () => {
    const s = cur(),
      sh = S.ui.sheet
    const label = (sh.label || '').trim() || `Court ${s.courts.length + 1}`
    const existing = sh.id && s.courts.find((c) => c.id === sh.id)
    const preview = addCourtWindow(s, sh)
    if (preview.error) {
      render()
      return
    }
    const startsAt = preview.opensAt,
      until = sh.mode === 'end' ? null : preview.closesAt
    const id = existing ? existing.id : `c${Date.now()}`
    if (existing) Object.assign(existing, { label, startsAt, until })
    else s.courts.push({ id, label, startsAt, until })
    S.ui.sheet = null
    commit(
      `${label} ${existing ? 'updated' : 'added'} · open until ${fmtWhen(until || s.end, { lower: true })}${existing ? '' : autoNote(s, autoFill(s, { only: [id] }))}`,
    )
    render()
  },
  extend: (d) => {
    const s = cur(),
      sh = S.ui.sheet
    s.end += +d.m * 60000
    if (sh && sh.type === 'adjust' && s.end > Date.now()) {
      sh.endAt = s.end
      sh.err = ''
    }
    commit(`Session ends ${atWhen(s.end)} · public page updates after sync`)
    render()
  },
  dtDay: (d) => {
    dtPickDay(d.k, +d.v)
    render()
    const b = document.querySelector(`[data-act="dtDay"][data-k="${d.k}"][data-v="${d.v}"]`)
    if (b) b.focus()
  },
  openSessionDone: () => openSheet({ type: 'done', step: '' }),
  confirmDone: () => {
    const s = cur()
    // On court matches were never started: they're dropped like waiting matches.
    onCourt(s).forEach((m) => {
      m.status = 'waiting'
      m.courts = []
      delete m.placedAt
    })
    S.ui.sheet = null
    S.ui.finalStage = 0
    S.screen = 'finalizing'
    render()
    const tick = () => {
      S.ui.finalStage += 1
      render()
      if (S.ui.finalStage < 4) setTimeout(tick, 650)
      else
        setTimeout(() => {
          s.status = 'finalized'
          s.finalizedAt = Date.now()
          S.lastSync = Date.now()
          setCurAct('confirmDone')
          logSync(`${s.title} finished · player records updated`)
          save()
          go('results')
          toast('Session finished · player records updated')
        }, 500)
    }
    setTimeout(tick, 650)
  },
  slide: (d) => {
    S.ui.slide = +d.k
    render()
  },
  openPublish: () => {
    const s = cur()
    openSheet({
      type: 'publish',
      slides: s.published ? s.published.slides.slice() : [0, 1],
      offDay: false,
    })
  },
  confirmPublish: () => {
    const s = cur(),
      sh = S.ui.sheet
    s.published = { slides: sh.slides.slice().sort(), offDay: !!sh.offDay, at: Date.now() }
    logSync(
      `${s.title}: ${[sh.slides.includes(0) && 'Standings', sh.slides.includes(1) && 'Awards', sh.offDay && 'Off Day'].filter(Boolean).join(', ')} published`,
    )
    S.ui.sheet = null
    save()
    render()
    toast('Results published to the session page')
  },
  openExport: () => openSheet({ type: 'export', fmt: 'story', slides: [0, 1], offDay: false }),
  pubTab: (d) => {
    S.ui.pubTab = d.k
    render()
  },
}
