import { chip, fmtFormats, notice } from '../fragments.js'
import {
  active,
  avatar,
  busyOf,
  courtFill,
  courtMatches,
  courtOpen,
  courtStart,
  courtsNeeded,
  courtsOf,
  courtUntil,
  cur,
  esc,
  freeCourts,
  gamesOf,
  listNames,
  lvLabel,
  onCourt,
  openedEarly,
  P,
  R,
  short,
  waiting,
} from '../helpers.js'
import { I } from '../icons.js'
import { attention, blockOf, swapCandidate } from '../rules/court-fill.js'
import { FORMAT_LABEL, MODES, S } from '../state.js'
import { atWhen, endStatus, fmtWhen } from '../time.js'
import { autoWorkspace, upcomingPane } from './console-auto.js'
import { boardPane, playersPane, queueCard, queueCols } from './console-board.js'
import { viewHome } from './home.js'
import { standings } from './results.js'
import { pendingReqs } from './setup.js'

// ---------- Q-CONSOLE ----------
export function viewConsole() {
  const s = cur()
  if (!s || s.status !== 'active') {
    S.screen = 'home'
    return viewHome()
  }
  const att = attention(s).length
  const pane = S.ui.pane
  const endSt = endStatus(s)
  return `<main class="wrap">
    <div class="between">
      <div class="stack tight"><div class="row"><span class="label">Live session</span>${chip(MODES[s.mode].label)}${chip(fmtFormats(s))}${chip(`Min ${s.minimum} games`)}</div>
        <h1>${esc(s.title)}</h1><p class="muted small">${esc(s.venue)} · Started ${fmtWhen(s.startedAt, { lower: true })} · Ends ${fmtWhen(s.end, { lower: true })} · ${endSt.over ? `<span style="color:var(--warn)">${endSt.text}</span>` : endSt.text}</p></div>
      <div class="row acts"><button class="btn sm" data-act="go" data-to="home">Home</button><button class="btn sm" data-act="go" data-to="prepare">Session settings</button><button class="btn sm" data-act="go" data-to="public">Public page</button><button class="btn sm" data-act="openPost">Copy Facebook post</button><button class="btn sm" data-act="openPayments">Payments</button><button class="btn sm" data-act="openAdjust">Courts and time</button>${pendingReqs(s).length ? `<button class="btn sm primary" data-act="openRequests">Join requests · ${pendingReqs(s).length}</button>` : ''}</div>
    </div>
    ${!S.online ? notice('warn', 'Working offline on this device. Matches, results and roster changes save here and sync when you reconnect. Session done needs internet.') : ''}
    <div class="tabs" role="tablist" aria-label="Console views">
      ${[
        [
          'live',
          `Session <span class="chip">${courtMatches(s).reduce((t, m) => t + m.courts.length, 0)}/${s.courts.length}<span class="tw"> courts in use</span></span>`,
        ],
        [
          'queue',
          `Queue <span class="chip">${waiting(s).length}<span class="tw"> waiting</span></span>${att ? ` <span class="chip warn">${att}<span class="tw"> need attention</span></span>` : ''}`,
        ],
        [
          'roster',
          `Players <span class="chip">${s.roster.filter((r) => r.present).length}/${s.roster.length}<span class="tw"> present</span></span>`,
        ],
        [
          'board',
          `<span class="tw-long">Leaderboard</span><span class="tw-short">Board</span>${s.matches.some((m) => m.status === 'done') ? ` <span class="chip">${esc(short((standings(s)[0] || {}).pid))} leads</span>` : ''}`,
        ],
      ]
        .map(
          ([k, l]) =>
            `<button role="tab" aria-selected="${(['queue', 'roster', 'board'].includes(pane) ? pane : 'live') === k}" data-act="pane" data-k="${k}">${l}</button>`,
        )
        .join('')}
    </div>
    ${
      pane === 'roster'
        ? `<section class="stack" aria-label="Players">${playersPane(s)}</section>`
        : pane === 'queue'
          ? `<section class="stack" aria-label="Queued matches">${queuePane(s)}</section>`
          : pane === 'board'
            ? `<section class="stack" aria-label="Leaderboard">${boardPane(s)}</section>`
            : `${endSt.over ? notice('warn', `<b>${endSt.text}.</b><div class="row" style="margin-top:8px"><button class="btn sm" data-act="openAdjust" data-k="end">Set end time</button><button class="btn sm" data-act="openSessionDone" ${!S.online ? 'disabled' : ''}>Session done</button></div>`) : ''}
      ${(() => {
        const short = shortOfPlayers(s)
        return short ? notice('warn', esc(short)) : ''
      })()}
      <section class="stack live-sec" aria-label="Courts">${courtsPane(s)}</section>
      <section class="stack live-sec" aria-label="Upcoming queued matches">${upcomingPane(s)}</section>`
    }
  </main>
  <div class="footer-bar dock-dup"><div class="in">
    <span class="small muted tnum">${s.matches.filter((m) => m.status === 'done').length} games recorded · ${active(s).length} in play${onCourt(s).length ? ` · ${onCourt(s).length} on court` : ''} · ${waiting(s).length} waiting</span>
    <div class="row">${!S.online ? '<span class="small muted">Connect to finish and sync this session.</span>' : ''}<button class="btn sm" data-act="openSessionDone" ${!S.online ? 'disabled' : ''}>Session done</button></div>
  </div></div>`
}

// Badminton court drawn to real proportions (13.4 m × 6.1 m), net in the middle. n courts stack so a
// two-court 5v5 reads as one merged playing area with a single long net.
export function courtSVG(n) {
  const one = (
    y,
  ) => `<g transform="translate(0 ${y})"><rect width="134" height="61" fill="var(--court-c)"/>
    <g fill="none" stroke="var(--court-l)" stroke-width="1.5" vector-effect="non-scaling-stroke"><rect x="0.75" y="0.75" width="132.5" height="59.5" vector-effect="non-scaling-stroke"/><path d="M0 4.6H134M0 56.4H134M7.6 0V61M126.4 0V61M47.2 0V61M86.8 0V61M0 30.5H47.2M86.8 30.5H134" vector-effect="non-scaling-stroke"/></g></g>`
  return `<svg class="court-svg" viewBox="0 0 134 ${61 * n}" preserveAspectRatio="none" aria-hidden="true">${Array.from({ length: n }, (_, i) => one(i * 61)).join('')}
    <path d="M67 0V${61 * n}" stroke="var(--court-l)" stroke-width="3" stroke-dasharray="4 3" vector-effect="non-scaling-stroke"/></svg>`
}
export function courtSides(s, m) {
  // Players stack down each side of the net (P1 over P2 | P3 over P4); bigger fun teams wrap into a second column.
  // Each face carries the player's completed games this session.
  const side = (ids, team) =>
    `<div class="side n${Math.min(ids.length, 5)}" style="--rows:${ids.length <= 2 ? ids.length : ids.length <= 4 ? 2 : 3}" role="group" aria-label="Team ${team}">${ids
      .map((pid) => {
        const p = P(pid),
          r = R(s, pid)
        const g = gamesOf(s, pid)
        return `<button class="pf" data-act="openProfile" data-id="${pid}" title="${esc(p.name)} · ${esc(lvLabel(r ? r.level : null))} · ${g}/${s.minimum} games" aria-label="${esc(p.name)}, Team ${team}, ${g} of ${s.minimum} games. View profile"><span class="pf-face">${avatar(p)}<span class="pf-g tnum" aria-hidden="true">${g}</span></span><span class="pf-n">${esc(short(pid))}</span></button>`
      })
      .join('')}</div>`
  return `<div class="sides">${side(m.teamA, 'A')}${side(m.teamB, 'B')}</div>`
}
// The court card's ⋯ menu. The card itself shows only the action for its state (Start anyway, or the match action).
function courtMenu(s, c, busy) {
  const open = S.ui.courtMenu === c.id
  const last = s.courts.length <= 1
  const item = (act, label, why, cls = '') =>
    `<button role="menuitem" class="${cls}" data-act="${act}" data-id="${c.id}" ${why ? 'disabled' : ''}><span>${label}</span>${why ? `<span class="why">${why}</span>` : ''}</button>`
  return `<div class="cmenu"><button class="btn xs ghost icon-btn" data-act="toggleCourtMenu" data-id="${c.id}" aria-haspopup="menu" aria-expanded="${open}" aria-label="More for ${esc(c.label)}">${I.more}</button>${
    open
      ? `<div class="cmenu-list" role="menu" aria-label="${esc(c.label)}">
    ${(() => {
      const m = courtMatches(s).find((x) => x.status === 'oncourt' && x.courts.includes(c.id))
      if (!m) return ''
      const n = swapCandidate(s, m)
      return item(
        'openSwap',
        n ? `Swap with #${waiting(s).indexOf(n) + 1} · Match ${n.seq}` : 'Swap with the queue',
        n ? '' : 'No other waiting match is ready',
      )
    })()}
    ${item('editCourt', 'Edit', busy ? 'A match is on this court' : '')}
    ${openedEarly(s, c) ? item('undoEarly', 'Undo early open', busy ? 'A match is on this court' : '') : ''}
    ${item('removeCourt', 'Remove', busy ? 'Only a free court can be removed' : last ? 'A session needs at least one court' : '', 'danger')}
  </div>`
      : ''
  }</div>`
}
// A court card's booking line. Once its end has passed it reads "Booking ended" in the warning style, with or without a match on it.
function courtTimeLine(s, c) {
  const over = Date.now() > courtUntil(s, c)
  return `<span class="small ${over ? '' : 'muted'}" style="${over ? 'color:var(--warn)' : ''}">${over ? 'Booking ended' : openedEarly(s, c) ? `Opened early · planned ${fmtWhen(courtStart(s, c), { lower: true })} –` : 'Until'} ${fmtWhen(courtUntil(s, c), { lower: true })}</span>`
}
// Short on players: the present players who aren't busy can't fill every free open court with the session's
// standard format (doubles 4 a court, singles 2; doubles first when both are on). The banner counts all present
// players against the open courts, so it says how many courts can run and how many sit out each game.
const freePresent = (s) => s.roster.filter((r) => r.present && !busyOf(s, r.pid)).length
const perMatchOf = (s) => (s.doubles ? 4 : s.singles ? 2 : 0)
function shortOfPlayers(s) {
  const per = perMatchOf(s),
    open = s.courts.filter((c) => courtOpen(s, c)).length
  const n = s.roster.filter((r) => r.present).length
  const freeOpen = freeCourts(s).length
  if (!per || !n || n >= open * per || !freeOpen || freePresent(s) >= freeOpen * per) return null
  const d = s.doubles ? Math.min(open, Math.floor(n / 4)) : 0
  const sg = s.singles ? Math.min(open - d, Math.floor((n - 4 * d) / 2)) : 0
  const courts = [
    d && `${d} doubles court${d > 1 ? 's' : ''}`,
    sg && `${sg} singles court${sg > 1 ? 's' : ''}`,
  ]
    .filter(Boolean)
    .join(' and ')
  const out = n - 4 * d - 2 * sg
  return `${n} player${n === 1 ? '' : 's'} present: ${courts ? `enough for ${courts}.${out ? ` ${out} sit${out === 1 ? 's' : ''} out each game.` : ''}` : `not enough for a ${s.doubles ? 'doubles' : 'singles'} game.`}`
}
function courtsPane(s) {
  const list = waiting(s)
  const need = s.singles ? 2 : perMatchOf(s),
    freeN = freePresent(s)
  const skip = new Set()
  const cards = s.courts
    .map((c) => {
      if (skip.has(c.id)) return ''
      const m = courtMatches(s).find((x) => x.courts.includes(c.id))
      if (m) {
        const merged = m.courts.length > 1
        m.courts.forEach((x) => {
          if (x !== c.id) skip.add(x)
        })
        const head = (
          label,
        ) => `<div class="ct"><div><h3>${esc(merged ? courtsOf(s, m) : c.label)}</h3>${courtTimeLine(s, c)}</div><div class="row" style="gap:6px;flex-wrap:nowrap">${label}${courtMenu(s, c, true)}</div></div>
        <div class="pitch ${merged ? 'tall' : ''}" role="img" aria-label="${esc(`Team A ${listNames(m.teamA)} versus Team B ${listNames(m.teamB)}`)}">${courtSVG(merged ? 2 : 1)}${courtSides(s, m)}</div>`
        if (m.status === 'oncourt') {
          // On court: placed, getting ready. Normal border; the Queue Master starts it.
          const b = blockOf(s, m)
          return `<div class="court oncourt ${merged ? 'merged' : ''}">${head(chip(merged ? 'Merged · Getting ready' : 'Getting ready'))}
        <p class="small muted">${FORMAT_LABEL[m.format]} · Match ${m.seq} · waiting to start</p>
        ${b ? `<span class="status-line warn">${I.alert} ${esc(b.text)}</span>` : ''}
        <div class="row" style="margin-top:auto"><button class="btn sm primary" data-act="startOnCourt" data-id="${m.id}" ${b ? `disabled title="${esc(b.text)}"` : ''}>Start match</button><button class="btn sm" data-act="openMatch" data-id="${m.id}">Open match</button></div></div>`
        }
        const mins = Math.max(0, Math.round((Date.now() - m.startedAt) / 60000))
        const subs = (m.subs || []).length
        return `<div class="court busy ${merged ? 'merged' : ''}">${head(chip(merged ? 'Merged · Playing' : 'Playing', 'ok'))}
        <p class="small muted">${FORMAT_LABEL[m.format]} · Match ${m.seq} · ${mins} min${subs ? ` · ${subs} substitution${subs > 1 ? 's' : ''}` : ''}</p>
        <div class="row" style="margin-top:auto"><button class="btn sm primary" data-act="openMatch" data-id="${m.id}">Open match</button></div></div>`
      }
      const notStarted = !courtOpen(s, c)
      const eligible = notStarted ? null : list.find((x) => !blockOf(s, x))
      const first = list[0]
      let body
      if (notStarted) {
        body = `<p class="small muted">Opens ${atWhen(courtStart(s, c))}. The court is unavailable before this time.</p>
        <div class="row" style="margin-top:auto"><button class="btn sm primary" data-act="openEarly" data-id="${c.id}">Start anyway</button></div>`
      } else if (eligible) {
        // 5v5 needs a second court, so it goes through the Put on court sheet.
        const put =
          courtsNeeded(eligible) === 2
            ? `data-act="openDispatch" data-id="${eligible.id}" data-court="${c.id}"`
            : `data-act="placeOnCourt" data-id="${eligible.id}" data-court="${c.id}"`
        body = `${first && first.id !== eligible.id ? `<p class="small muted">Skipped #1: ${esc(blockOf(s, first).text)}.</p>` : ''}
        <p class="small"><span class="muted">Next eligible:</span> #${list.indexOf(eligible) + 1} · ${FORMAT_LABEL[eligible.format]}</p>
        <p class="small">${esc(listNames(eligible.teamA))} <span class="muted">vs</span> ${esc(listNames(eligible.teamB))}</p>
        <div class="row" style="margin-top:auto"><button class="btn sm primary" ${put}>Put on court</button>${list.length > 1 ? `<button class="btn sm" data-act="openChooseMatch" data-court="${c.id}">Pick another</button>` : ''}</div>`
      } else {
        body = `<p class="small muted">${need && freeN < need ? 'Not enough free players.' : list.length ? `No waiting match can go on: ${esc(blockOf(s, first).text)}.` : 'The queue is empty.'}</p>
        <div class="row" style="margin-top:auto"><button class="btn sm" data-act="openEditor">Add match</button></div>`
      }
      return `<div class="court"><div class="ct"><div><h3>${esc(c.label)}</h3>${courtTimeLine(s, c)}</div><div class="row" style="gap:6px;flex-wrap:nowrap">${chip(notStarted ? 'Not open yet' : 'Free')}${courtMenu(s, c, false)}</div></div><div class="pitch empty">${courtSVG(1)}<span class="free-lbl">${notStarted ? 'Not open yet' : 'Free'}</span></div>${body}</div>`
    })
    .join('')
  const closed = s.courts.filter((c) => !courtOpen(s, c))
  const fill = courtFill(s)
  return `<div class="between"><h2>Courts</h2><div class="row" style="gap:10px">${closed.length ? '<button class="btn xs" data-act="openAllEarly">Open all courts now</button>' : ''}<span class="small muted">${freeCourts(s).length} of ${s.courts.length} free</span></div></div>
    <div class="stack tight"><div class="seg" role="group" aria-label="Court filling">${[
      ['manual', 'Manual Queue'],
      ['auto', 'Auto Queue'],
    ]
      .map(
        ([k, l]) =>
          `<button aria-pressed="${fill === k}" data-act="setCourtFill" data-k="${k}">${l}</button>`,
      )
      .join('')}</div>
      <p class="small muted" aria-live="polite">${fill === 'auto' ? 'Free courts get the next ready match. You still start each one.' : 'You put each match on a court.'}</p></div>
    <div class="courts">${cards}<button class="court add-court" data-act="quickAddCourt" aria-label="Add Court ${s.courts.length + 1}"><span class="plus" aria-hidden="true">+</span><span>Add court</span><span class="small muted" style="font-weight:500">Set a planned court window</span></button></div>
    <p class="small muted">A match never starts by itself when a court frees up. You start each one.</p>`
}

function queuePane(s) {
  const list = waiting(s)
  const att = attention(s).length
  if (S.ui.queueWorkspace === 'auto') return autoWorkspace(s)
  return `<div class="seg" role="group" aria-label="Queue workspace"><button aria-pressed="true">Main Queue</button><button data-act="queueWorkspace" data-k="auto">Generate matches</button></div><div class="between"><h2>Queued matches</h2><div class="row acts"><button class="btn sm" data-act="openEditor">Add match</button><button class="btn sm" data-act="openSuggest">Suggest</button><button class="btn sm" data-act="queueWorkspace" data-k="auto">Generate matches</button><button class="btn sm ${att ? 'primary' : ''}" data-act="openRegen" ${list.length ? '' : 'disabled'}>Regenerate</button></div></div>
    ${att ? notice('warn', `${att} waiting match${att > 1 ? 'es need' : ' needs'} attention. Edit the lineup to swap the player, or regenerate.`) : ''}
    <p class="small muted">One waiting list for every court. ${MODES[s.mode].label} mode guides suggestions; you can override any of it.</p>
    ${
      list.length
        ? `<p class="small muted">Order runs in a snake: left to right, then back right to left on the next row. Drag a card by ⠿ to reorder (arrow keys work on the handle too). Drag a player onto someone on the other team to switch sides. Any card marked ready can go on a court now, whatever its place.</p>
    <div class="qgrid" style="grid-template-columns:repeat(${queueCols()}, minmax(0, 1fr))">${list.map((m, i) => queueCard(s, m, i, list.length, queueCols())).join('')}</div>`
        : `<div class="card empty">No waiting matches. Use Generate matches to create a few, or add one yourself.</div>`
    }`
}
