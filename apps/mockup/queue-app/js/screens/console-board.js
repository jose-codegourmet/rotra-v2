import { chip, faceBtn, hasShell, sw } from '../fragments.js'
import {
  all,
  avatar,
  busyOf,
  courtOpen,
  courtsOf,
  esc,
  gamesOf,
  lvLabel,
  nm,
  openSlots,
  P,
  queuedCount,
  R,
  short,
  waiting,
} from '../helpers.js'
import { I } from '../icons.js'
import { blockOf } from '../rules/court-fill.js'
import { FORMAT_LABEL, FUN, narrowScreen, navMin, S } from '../state.js'
import { heldPresence, presencePending } from '../sync.js'
import { AUTO_MODES } from './console-auto.js'
import { standings } from './results.js'
import { waitlistPanel } from './setup.js'

export const QUEUE_TILE_MIN = 220,
  QUEUE_GAP = 10,
  DRAFT_TILE_MIN = 230
export function queueCols(tileMin = QUEUE_TILE_MIN) {
  const vw = window.innerWidth,
    pad = Math.min(40, Math.max(16, vw * 0.03))
  const rail = !hasShell() || narrowScreen() ? 0 : navMin ? 68 : 232
  return Math.max(1, Math.floor((vw - rail - 2 * pad + QUEUE_GAP) / (tileMin + QUEUE_GAP)))
}
export function queueCard(s, m, i, n, cols) {
  const b = blockOf(s, m)
  const row = Math.floor(i / cols),
    k = i % cols,
    col = row % 2 === 0 ? k : cols - 1 - k
  const flow = i === n - 1 ? '' : k === cols - 1 ? '↓' : row % 2 === 0 ? '→' : '←'
  const status = !b
    ? `<span class="status-line ok">${I.check} Ready to start</span>`
    : b.kind === 'attention'
      ? `<span class="status-line warn">${I.alert} ${esc(b.text)}</span>`
      : `<span class="status-line muted">${I.info} ${esc(b.text)}</span>`
  // Under each name: how long the player has waited since their last game (or since arriving). Under 10 min plain,
  // 10–15 min warning, 16 min or more error. Busy or absent players show why instead of a timer.
  const wait = (p) => {
    if (s.status !== 'active') return ''
    const busy = busyOf(s, p, m),
      r = R(s, p)
    if (busy)
      return `<span class="qf-w muted">${busy.status === 'oncourt' ? 'On court' : 'Playing'}</span>`
    if (!r || !r.present) return '<span class="qf-w muted">Not here</span>'
    const mins = restInfo(s, p).mins
    return `<span class="qf-w tnum ${mins >= 16 ? 'err' : mins >= 10 ? 'warn' : ''}">${mins} min</span>`
  }
  const waitLabel = (p) => {
    const r = R(s, p)
    return s.status === 'active' && r && r.present && !busyOf(s, p, m)
      ? `, waiting ${restInfo(s, p).mins} min`
      : ''
  }
  const faces = (ids, team) =>
    `<div class="qfaces">${ids.map((p, j) => `<button class="qf" data-act="openProfile" data-id="${p}" data-swap="m:${m.id}" data-team="${team}" data-i="${j}" data-pid="${p}" title="${esc(nm(p))} · ${esc(lvLabel(R(s, p) ? R(s, p).level : null))} · drag onto the other team to switch sides" aria-label="${esc(nm(p))}${waitLabel(p)}. View profile. Left or right arrow switches sides">${avatar(P(p))}<span class="qf-n">${esc(short(p))}</span>${wait(p)}</button>`).join('')}</div>`
  return `<article class="qtile ${b && b.kind === 'attention' ? 'attn' : ''} ${!b ? 'ready' : ''}" data-qid="${m.id}" style="grid-row:${row + 1};grid-column:${col + 1}" aria-label="Queue position ${i + 1}">
    <div class="qt-head"><span class="qt-pos">#${i + 1}</span>${chip(FORMAT_LABEL[m.format], 'solid')}${m.protected ? `<span class="muted" title="Manual · protected from regeneration">${I.lock}</span>` : `<span class="small muted">${m.origin === 'suggested' ? 'Suggested' : 'Generated'}</span>`}<span class="grow"></span><span class="qt-flow" aria-hidden="true">${flow}</span><button class="qt-grip" data-drag-handle data-id="${m.id}" aria-label="Reorder match ${i + 1}: drag, or use the arrow keys" title="Drag to reorder">⠿</button></div>
    ${faces(m.teamA, 'teamA')}<div class="vs">VS</div>${faces(m.teamB, 'teamB')}
    ${status}
    <div class="row qt-actions">
      <button class="btn xs ${!b ? 'primary' : ''}" data-act="openDispatch" data-id="${m.id}" ${b && !(b.kind === 'courts' && s.status === 'active' && s.courts.some((c) => !courtOpen(s, c))) ? 'disabled' : ''}>Put on court</button>
      <button class="btn xs" data-act="openEditor" data-id="${m.id}">Edit</button>
      <span class="grow"></span>
      <button class="btn xs ghost icon-btn" data-act="removeWaiting" data-id="${m.id}" aria-label="Remove waiting match ${i + 1}" title="Remove">${I.x}</button>
    </div>
  </article>`
}
export function playersPane(s) {
  const f = { show: 'avail', sort: 'wait', ...(S.ui.pl || {}) }
  const sel = (S.ui.sel || []).filter((pid) => R(s, pid))
  const w = waiting(s)
  let rows = s.roster.map((r) => {
    const a = busyOf(s, r.pid)
    const qi = w.findIndex((m) => all(m).includes(r.pid))
    return {
      r,
      p: P(r.pid),
      a,
      g: gamesOf(s, r.pid),
      ...restInfo(s, r.pid),
      qpos: qi < 0 ? null : qi + 1,
    }
  })
  const held = (pid) =>
    heldPresence?.filter === f.show && heldPresence.ids.includes(pid) && presencePending.has(pid)
  if (f.show === 'avail') rows = rows.filter((x) => (x.r.present && !x.a) || held(x.r.pid))
  if (f.show === 'present') rows = rows.filter((x) => x.r.present || held(x.r.pid))
  const sorters = {
    wait: (a, b) =>
      (a.a ? 1 : 0) - (b.a ? 1 : 0) ||
      (b.r.present ? 1 : 0) - (a.r.present ? 1 : 0) ||
      b.mins - a.mins,
    least: (a, b) => a.g - b.g || b.mins - a.mins,
    most: (a, b) => b.g - a.g || a.p.name.localeCompare(b.p.name),
    level: (a, b) => (b.r.level ?? -1) - (a.r.level ?? -1) || a.p.name.localeCompare(b.p.name),
  }
  rows.sort(sorters[f.sort] || sorters.wait)
  if (heldPresence?.filter === f.show && presencePending.size)
    rows.sort((a, b) => {
      const rank = (pid) => {
        const i = heldPresence.ids.indexOf(pid)
        return i < 0 ? Infinity : i
      }
      return rank(a.r.pid) - rank(b.r.pid)
    })
  const counts = {
    avail: s.roster.filter((r) => r.present && !busyOf(s, r.pid)).length,
    present: s.roster.filter((r) => r.present).length,
    all: s.roster.length,
  }
  const plan = matchPlan(s, sel)
  const draftState = S.ui.autoDraft && S.ui.autoDraft.sid === s.id ? S.ui.autoDraft : null
  const currentDrafts = draftState?.batches[draftState.tab]?.cards || []
  return `<div class="between"><div><h2>Players</h2><p class="small muted">Tap players to pick them, then make a match. ${counts.present} present of ${counts.all}.</p></div><button class="btn sm" data-act="openAdd">Add late player</button></div>
    <div class="row" style="gap:10px">
      <div class="seg" role="group" aria-label="Show">${[
        ['avail', `Available · ${counts.avail}`],
        ['present', `Present · ${counts.present}`],
        ['all', `Everyone · ${counts.all}`],
      ]
        .map(
          ([k, l]) =>
            `<button aria-pressed="${f.show === k}" data-act="plSet" data-k="show" data-v="${k}">${l}</button>`,
        )
        .join('')}</div>
      <select class="input inline" id="pl-sort" data-act-change="plSet" data-k="sort" aria-label="Sort players">${[
        ['wait', 'Sort: longest wait'],
        ['least', 'Sort: least games'],
        ['most', 'Sort: most games'],
        ['level', 'Sort: level, high to low'],
      ]
        .map(([v, l]) => `<option value="${v}" ${f.sort === v ? 'selected' : ''}>${l}</option>`)
        .join('')}</select>
    </div>
    ${
      rows.length
        ? `<div class="pgrid3">${rows
            .map((x) => {
              const i = sel.indexOf(x.r.pid)
              const st = x.a
                ? x.a.status === 'oncourt'
                  ? `On court · getting ready · ${courtsOf(s, x.a)}`
                  : `Playing · ${courtsOf(s, x.a)}`
                : !x.r.present
                  ? 'Away'
                  : x.qpos
                    ? `Queued · #${x.qpos}`
                    : 'Free'
              return `<article class="pc3 ${x.a && x.a.status === 'active' ? 'playing' : ''} ${x.r.present ? '' : 'away'}" role="button" tabindex="0" data-act="selPlayer" data-pid="${x.r.pid}" aria-pressed="${i >= 0}" aria-label="${esc(x.p.name)}, ${esc(lvLabel(x.r.level))}, ${x.g} games">
        ${i >= 0 ? `<span class="sel-badge" aria-hidden="true">${i + 1}</span>` : ''}
        <div class="pc3-top">${avatar(x.p)}<div style="min-width:0"><div class="pc3-name">${esc(x.p.name)}</div><div class="pc3-lv">${esc(lvLabel(x.r.level))}</div></div></div>
        <div class="pc3-stats"><span class="tnum">${x.g} played · ${queuedCount(s, x.r.pid)} queued · ${currentDrafts.filter((m) => all(m).includes(x.r.pid)).length} suggested (${esc(draftState ? AUTO_MODES[draftState.tab] : 'current tab')})</span>${x.a || !x.r.present ? '' : `<span class="tnum">${x.mins} min wait</span>`}</div>
        <div class="between" style="flex-wrap:nowrap"><span class="pc3-st small">${st}</span>${sw(x.r.present, 'togglePresent', `data-pid="${x.r.pid}"`, `${x.p.name} present`)}</div>${presencePending.has(x.r.pid) ? '<span class="small muted">Saving presence…</span>' : ''}
      </article>`
            })
            .join('')}</div>`
        : `<div class="card empty">${f.show === 'avail' ? 'No one is free right now. Try Present or Everyone.' : 'No players yet.'}</div>`
    }
    ${
      sel.length
        ? `<div class="selbar" role="region" aria-label="Selected players">
      <div class="row" style="gap:6px;flex-wrap:nowrap;min-width:0"><span class="sel-faces">${sel.map((pid) => avatar(P(pid))).join('')}</span><span class="small"><b>${sel.length} selected</b> · ${esc(plan.label)}</span></div>
      <div class="row" style="flex-wrap:nowrap"><button class="btn sm ghost" data-act="selClear">Clear</button><button class="btn sm primary" data-act="makeMatch" ${plan.ok ? '' : 'disabled'}>Make match</button></div></div>`
        : ''
    }
    ${(s.waitlist || []).length || !openSlots(s) ? waitlistPanel(s) : ''}
    <p class="small muted">Make match splits the players into teams balanced by level and adds it to the end of the queue. Present controls who can be paired automatically; turning someone off never ends their current game.</p>`
}
export function boardPane(s) {
  const st = standings(s)
  return `<div><h2>Leaderboard</h2><p class="small muted">Tonight's standings from completed games: most wins, then fewest losses, then head-to-head. It updates each time you confirm a result. Partial and invalid games don't count, unless you gave a substitute the game.</p></div>
    ${
      st.length
        ? `<div class="card lb-wrap"><table class="lb"><thead><tr><th class="n">#</th><th>Player</th><th class="n">W</th><th class="n">L</th><th class="n">Games</th><th class="n">Win %</th></tr></thead><tbody>
      ${st
        .map((r, i) => {
          const p = P(r.pid),
            lv = R(s, r.pid)
          return `<tr class="${i < 3 ? 'top' : ''}"><td class="n tnum"><span class="rank r${i + 1}">${i + 1}</span></td>
        <td><div class="lb-p">${faceBtn(p)}<div style="min-width:0"><b>${esc(p.name)}</b><div class="small muted">${esc(lvLabel(lv ? lv.level : null))}</div></div></div></td>
        <td class="n tnum"><b>${r.w}</b></td><td class="n tnum">${r.l}</td><td class="n tnum">${r.g}<span class="muted">/${s.minimum}</span></td><td class="n tnum">${Math.round((r.w / r.g) * 100)}%</td></tr>`
        })
        .join('')}
    </tbody></table></div>`
        : '<div class="card empty">No completed games yet. Standings appear after the first confirmed result.</div>'
    }`
}
export function matchPlan(s, sel) {
  const fmt = { 2: 'singles', 3: '1v2', 4: 'doubles', 6: '3v3', 8: '4v4', 10: '5v5' }[sel.length]
  if (!fmt) return { ok: false, label: 'pick 2, 3, 4, 6, 8 or 10 players' }
  if (fmt === 'singles' && !s.singles)
    return { ok: false, label: 'singles is off for this session' }
  if (fmt === 'doubles' && !s.doubles)
    return { ok: false, label: 'doubles is off for this session' }
  return {
    ok: true,
    fmt,
    label: `${FORMAT_LABEL[fmt]}${FUN.includes(fmt) ? ', counts toward session games only' : ''}`,
  }
}
export function balancedTeams(s, sel, fmt) {
  const lv = (p) => (R(s, p).level != null ? R(s, p).level : 4)
  const sum = (ids) => ids.reduce((t, p) => t + lv(p), 0)
  if (fmt === 'doubles') {
    return [
      [
        [0, 1],
        [2, 3],
      ],
      [
        [0, 2],
        [1, 3],
      ],
      [
        [0, 3],
        [1, 2],
      ],
    ]
      .map(([a, b]) => ({ teamA: a.map((i) => sel[i]), teamB: b.map((i) => sel[i]) }))
      .sort(
        (x, y) => Math.abs(sum(x.teamA) - sum(x.teamB)) - Math.abs(sum(y.teamA) - sum(y.teamB)),
      )[0]
  }
  const sorted = sel.slice().sort((a, b) => lv(b) - lv(a))
  if (fmt === 'singles') return { teamA: [sorted[0]], teamB: [sorted[1]] }
  if (fmt === '1v2') return { teamA: [sorted[0]], teamB: [sorted[1], sorted[2]] }
  const teamA = [],
    teamB = []
  sorted.forEach((p, i) => {
    ;(i % 4 === 0 || i % 4 === 3 ? teamA : teamB).push(p)
  })
  return { teamA, teamB }
}

// Available players: present and off court. Resting time runs from their last game ending (or from
// when they became present); "times waited" counts matches that started while they were free.
export function restInfo(s, pid) {
  const r = R(s, pid)
  const ends = s.matches
    .filter(
      (m) =>
        (m.status === 'done' || m.status === 'invalid') &&
        (all(m).includes(pid) || (m.subs || []).some((x) => x.out === pid)),
    )
    .map((m) => m.endedAt || 0)
  const since = Math.max(r.presentAt || s.startedAt || Date.now(), ...ends)
  const waits = s.matches.filter(
    (m) => m.startedAt && m.startedAt > since && !all(m).includes(pid),
  ).length
  return { mins: Math.max(0, Math.floor((Date.now() - since) / 60000)), waits }
}
