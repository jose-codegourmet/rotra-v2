import { chip, faceBtn, fmtFormats, notice, playerCountOf, sw } from '../fragments.js'
import {
  avatar,
  capacityOf,
  cur,
  esc,
  fmtDate,
  fmtDur,
  fmtTime,
  gamesOf,
  lvLabel,
  nm,
  P,
  short,
  subLine,
  waitOf,
} from '../helpers.js'
import { I } from '../icons.js'
import { FUN, MODES, S } from '../state.js'
import { fmtRange, fmtWhen } from '../time.js'
import { courtSides, courtSVG } from './console.js'
import { financeCalc, peso, resultText } from './financials.js'
import { standings } from './results.js'

function historyMatch(s, m) {
  const team = (ids, won) =>
    `<div class="hm-team ${won ? 'won' : ''}">${ids.map((p) => `<button class="qf" data-act="openProfile" data-id="${p}" title="${esc(nm(p))}" aria-label="${esc(nm(p))}. View profile">${avatar(P(p))}<span class="qf-n">${esc(short(p))}</span></button>`).join('')}${won ? `<span class="hm-w">${I.check} Won</span>` : ''}</div>`
  const score =
    m.status === 'invalid'
      ? chip('Invalid', 'bad')
      : m.scoreA != null
        ? `<b class="tnum">${m.scoreA}–${m.scoreB}</b>`
        : '<span class="small muted">no score</span>'
  return `<article class="hm ${m.status === 'invalid' ? 'invalid' : ''}" data-mid="${m.id}">
    <div class="hm-top"><span class="mono small">#${m.seq}</span><span class="small muted">${fmtRange(m.startedAt, m.endedAt, s.start)}</span>${FUN.includes(m.format) ? chip('Fun') : ''}</div>
    ${team(m.teamA, m.winner === 'A')}<div class="hm-score">${score}</div>${team(m.teamB, m.winner === 'B')}
    ${(m.subs || []).map((x) => `<p class="small muted">${esc(subLine(x, m))}</p>`).join('')}
  </article>`
}
// Session record tabs. Results is the default; the replay scrubber lives there.
export const HIST_TABS = [
  ['public', 'Public page'],
  ['results', 'Results'],
  ['night', 'How the night ran'],
  ['players', 'Players'],
  ['financials', 'Financials'],
]
export function viewHistory() {
  const s = cur()
  if (s.status === 'cancelled') return cancelledRecord(s)
  const invalid = s.status === 'invalid'
  const played = s.matches.filter((m) => m.status === 'done' || m.status === 'invalid')
  const done = s.matches.filter((m) => m.status === 'done')
  const tab = HIST_TABS.some(([k]) => k === S.ui.histTab) ? S.ui.histTab : 'results'
  const count = {
    public: '',
    results: invalid ? '' : `${done.length} games`,
    night: '',
    players: `${s.roster.length}`,
    financials: '',
  }
  const body = {
    public: histPublicPane,
    results: histResultsPane,
    night: histNightPane,
    players: histPlayersPane,
    financials: histFinancePane,
  }[tab](s, { invalid, played, done })
  return `<main class="wrap">
    <div class="crumb"><button class="btn sm ghost" data-act="go" data-to="home">${I.back} Home</button></div>
    <div class="stack tight"><span class="label">Session record · read-only</span><h1>${esc(s.title)}</h1><p class="muted small">${fmtDate(s.start)} · ${fmtRange(s.start, s.end)} · ${esc(s.venue)}</p></div>
    <div class="row">${invalid ? chip('Invalid session', 'bad') : chip('Completed', 'ok')}${invalid ? '' : chip(s.published ? 'Results published' : 'Results private', s.published ? 'ok' : '')}</div>
    <div class="tiles4">
      <div class="card"><span class="label">Games</span><b class="big tnum">${invalid ? '—' : done.length}</b>${!invalid && played.length !== done.length ? `<span class="small muted">${played.length - done.length} invalid</span>` : ''}</div>
      <div class="card"><span class="label">Players</span><b class="big tnum">${s.roster.length}</b><span class="small muted">of ${capacityOf(s)} slots${s.roster.length > capacityOf(s) ? ` · ${s.roster.length - capacityOf(s)} additional players admitted` : ''}</span></div>
      <div class="card"><span class="label">Courts</span><b class="big tnum">${s.courts.length}</b></div>
      <div class="card"><span class="label">Length</span><b class="big tnum">${fmtDur(s.start, s.end)}</b></div>
    </div>
    <div class="tabs" role="tablist" aria-label="Session record">${HIST_TABS.map(([k, l]) => `<button role="tab" id="htab-${k}" aria-selected="${tab === k}" aria-controls="hpanel" data-act="histTab" data-k="${k}">${l}${count[k] ? ` <span class="chip">${count[k]}</span>` : ''}</button>`).join('')}</div>
    <section class="stack" id="hpanel" role="tabpanel" aria-labelledby="htab-${tab}">${body}</section>
  </main>`
}
// A cancelled session never started: no games, standings or slides, and it counts nowhere. Its roster, waitlist and
// payment marks stay on the record, read-only.
function cancelledRecord(s) {
  const pay = s.payments || {},
    wl = waitOf(s)
  const paidN = s.roster.filter((r) => pay[r.pid]).length
  return `<main class="wrap">
    <div class="crumb"><button class="btn sm ghost" data-act="go" data-to="home">${I.back} Home</button></div>
    <div class="stack tight"><span class="label">Session record · read-only</span><h1>${esc(s.title)}</h1><p class="muted small">${fmtDate(s.start)} · ${fmtRange(s.start, s.end)} · ${esc(s.venue)}</p></div>
    <div class="row">${chip('Cancelled')}${s.cancelledAt ? `<span class="small muted">Cancelled ${fmtWhen(s.cancelledAt, { lower: true })}</span>` : ''}</div>
    ${notice('', `<b>${s.cancelReason ? `Reason: ${esc(s.cancelReason)}` : 'No reason given.'}</b> This session was cancelled before it started. It has no games, standings or result slides, and it doesn't count toward player records or rankings.${paidN ? ` ${paidN} player${paidN === 1 ? ' was' : 's were'} marked paid; refunds happen outside ROTRA.` : ''}`)}
    <div class="tiles4">
      <div class="card"><span class="label">Joined</span><b class="big tnum">${s.roster.length}</b><span class="small muted">of ${capacityOf(s)} slots</span></div>
      <div class="card"><span class="label">Waitlist</span><b class="big tnum">${wl.length}</b></div>
      <div class="card"><span class="label">Marked paid</span><b class="big tnum">${paidN}</b></div>
      <div class="card"><span class="label">Courts</span><b class="big tnum">${s.courts.length}</b></div>
    </div>
    <div class="row"><button class="btn sm" data-act="go" data-to="public">Open public page</button></div>
    <section class="stack"><h2>Roster · ${s.roster.length}</h2>${
      s.roster.length
        ? `<div class="pgrid">${s.roster
            .map((r) => {
              const p = P(r.pid),
                paid = pay[r.pid]
              return `<div class="pcard">${avatar(p)}<div style="min-width:0"><b>${esc(p.name)}</b><p class="small muted">${esc(lvLabel(r.level))} · ${paid ? `Paid ${peso(paid.amount)}` : 'Not paid'}</p></div></div>`
            })
            .join('')}</div>`
        : '<div class="card empty">Nobody had joined.</div>'
    }</section>
    ${wl.length ? `<section class="stack"><h2>Waitlist · ${wl.length}</h2><ol class="pub-wait">${wl.map((w) => `<li>${esc(P(w.pid).name)}</li>`).join('')}</ol></section>` : ''}
  </main>`
}
function histResultsPane(s, { invalid, played }) {
  if (invalid)
    return notice(
      'bad',
      `<b>This session has no official result.</b> ${esc(s.invalidReason || '')} It doesn't count toward player records or rankings, and there are no standings or result slides. Its partial records aren't shown as match history.`,
    )
  const st = standings(s)
  return `<div class="between"><h2>Standings</h2><div class="row"><button class="btn sm" data-act="go" data-to="results">Result slides</button><button class="btn sm" data-act="openExport">Download images</button></div></div>
    ${
      st.length
        ? `<div class="card lb-wrap"><table class="lb"><thead><tr><th class="n">#</th><th>Player</th><th class="n">W</th><th class="n">L</th><th class="n">Games</th></tr></thead><tbody>
      ${st
        .map((r, i) => {
          const p = P(r.pid)
          return `<tr class="${i < 3 ? 'top' : ''}"><td class="n tnum"><span class="rank r${i + 1}">${i + 1}</span></td><td><div class="lb-p">${faceBtn(p)}<b>${esc(p.name)}</b></div></td><td class="n tnum"><b>${r.w}</b></td><td class="n tnum">${r.l}</td><td class="n tnum">${r.g}</td></tr>`
        })
        .join('')}
    </tbody></table></div>`
        : '<div class="card empty">No counted games were recorded in this session.</div>'
    }`
}
// Its own tab: the replay card plus every match by court, in play order.
function histNightPane(s, { invalid, played }) {
  if (invalid)
    return notice(
      'bad',
      "<b>This session has no official result,</b> so there is no match history or replay. Its partial records aren't shown.",
    )
  return `<div class="stack"><div><h2>How the night ran</h2><p class="small muted">Play or drag the timeline to see the courts at any moment. Every match is listed below by court, in the order it was played; winners are highlighted.</p></div>
      ${replayCard(s)}
      <div class="hist-courts" style="--cols:${s.courts.length}">${s.courts
        .map((c) => {
          const ms = played
            .filter((m) => m.courts.includes(c.id))
            .sort((a, b) => a.startedAt - b.startedAt)
          return `<div class="hist-col"><div class="between"><h3>${esc(c.label)}</h3><span class="small muted">${ms.length} match${ms.length === 1 ? '' : 'es'}</span></div>${ms.map((m) => historyMatch(s, m)).join('') || '<p class="small muted">No matches.</p>'}</div>`
        })
        .join('')}</div></div>`
}
function histPlayersPane(s, { invalid }) {
  const st = invalid ? [] : standings(s)
  const byPid = Object.fromEntries(st.map((r, i) => [r.pid, { ...r, rank: i + 1 }]))
  const rows = s.roster
    .map((r) => ({ r, p: P(r.pid), g: gamesOf(s, r.pid), x: byPid[r.pid] }))
    .sort((a, b) => b.g - a.g || a.p.name.localeCompare(b.p.name))
  const below = rows.filter((x) => x.g < s.minimum).length
  return `<div class="between"><h2>Players</h2><span class="small muted">${invalid ? 'Not counted' : `Minimum ${s.minimum} games · ${below} below it`}</span></div>
    <div class="pgrid2">${rows
      .map(
        ({
          r,
          p,
          g,
          x,
        }) => `<article class="pcard2"><div class="pc-top">${avatar(p, 'xl')}${x ? `<span class="chip ${x.rank <= 3 ? 'ok' : ''}">#${x.rank}</span>` : ''}</div>
      <div class="stack tight" style="gap:2px"><span class="pc-name">${esc(p.name)}</span><span class="small muted">${esc(lvLabel(r.level))}</span></div>
      ${
        invalid
          ? '<p class="ctx">Not counted</p>'
          : `<div class="stats"><div><b class="tnum">${g}<span>/${s.minimum}</span></b><span>games</span></div><div><b class="tnum">${x ? x.w : 0}–${x ? x.l : 0}</b><span>W–L</span></div></div>
      ${g > s.minimum ? chip('Above minimum', 'ok') : g === s.minimum ? chip('Met minimum') : chip(`${s.minimum - g} short`, 'warn')}`
      }
    </article>`,
      )
      .join('')}</div>`
}
function histPublicPane(s, { invalid }) {
  const pub = s.published
  return `<div class="between"><div><h2>Public page</h2><p class="small muted">What anyone with the session link sees. No sign-in needed.</p></div>
      <div class="row"><button class="btn sm" data-act="go" data-to="public">Open public page</button>${invalid ? '' : `<button class="btn sm primary" data-act="openPublish">${pub ? 'Update publication' : 'Publish results'}</button>`}</div></div>
    <div class="grid2">
      <section class="card stack"><h3>Details</h3><dl class="kv">
        <dt>When</dt><dd>${fmtDate(s.start)}, ${fmtRange(s.start, s.end)}</dd><dt>Venue</dt><dd>${esc(s.venue)}</dd>
        <dt>Courts</dt><dd>${s.courts.length}</dd><dt>Formats</dt><dd>${fmtFormats(s)}</dd><dt>Mode</dt><dd>${MODES[s.mode].label}</dd><dt>Minimum</dt><dd>${s.minimum} games per player</dd></dl></section>
      <section class="card stack"><h3>Results on the page</h3>
        ${
          invalid
            ? '<p class="small muted">Invalid sessions have no results to share.</p>'
            : pub
              ? `<dl class="kv"><dt>Shared</dt><dd>${[pub.slides.includes(0) && 'Standings', pub.slides.includes(1) && 'Awards'].filter(Boolean).join(' and ') || 'Nothing'}</dd><dt>Off Day</dt><dd>${pub.offDay ? 'Shared' : 'Private'}</dd><dt>Published</dt><dd>${fmtDate(pub.at)} · ${fmtTime(pub.at)}</dd></dl>`
              : '<p class="small muted">Not shared yet. The page says results haven\'t been shared. Player records and ranks are already updated either way.</p>'
        }</section>
    </div>
    <section class="stack"><h3>Participants · ${s.roster.length}</h3><div class="pgrid">${s.roster
      .map((r) => {
        const p = P(r.pid)
        return `<div class="pcard">${avatar(p)}<div style="min-width:0"><b>${esc(p.name)}</b>${p.identity === 'registered' || p.identity === 'unclaimed' ? '<p class="small muted">Has a ROTRA profile</p>' : ''}</div></div>`
      })
      .join('')}</div></section>`
}
// Payments: a manual paid / not-paid checklist. ROTRA records who has paid; money changes hands outside the app.
export function duePerHead(s) {
  if (!s.finance) return null
  if (s.finance.custom) return +s.finance.payFee || 0
  return financeCalc(
    s.finance,
    s.courts.length,
    Math.round((s.end - s.start) / 60000),
    playerCountOf(s),
  ).share
}
export function paymentsPanel(s) {
  const due = duePerHead(s),
    pay = s.payments || {}
  const all = s.roster
    .map((r) => ({ r, p: P(r.pid), paid: pay[r.pid] }))
    .sort((a, b) => !!a.paid - !!b.paid || a.p.name.localeCompare(b.p.name))
  const paidN = all.filter((x) => x.paid).length
  const collected = all.reduce((t, x) => t + (x.paid ? x.paid.amount : 0), 0)
  const stillDue = due != null ? (all.length - paidN) * due : null
  const cost = s.finance
    ? financeCalc(
        s.finance,
        s.courts.length,
        Math.round((s.end - s.start) / 60000),
        s.roster.length || 1,
      ).total
    : null
  const f = S.ui.payF || 'all'
  const rows = all.filter((x) => f === 'all' || (f === 'paid' ? x.paid : !x.paid))
  return `<section class="card stack" id="payments"><div class="between"><div><h2>Payments</h2><p class="small muted">${due != null ? `${peso(due)} per player (${s.finance.custom ? 'custom amount' : 'break-even share'}${s.finance.entryFee ? `, includes the ${peso(s.finance.entryFee)} entrance fee` : ''}).` : 'No fee set for this session.'} Tick players as they pay. ROTRA only records it; money is collected outside the app.</p></div>
      ${all.length && paidN < all.length ? '<button class="btn sm" data-act="markAllPaid">Mark all paid</button>' : ''}</div>
    ${S.ui.paymentError ? notice('bad', esc(S.ui.paymentError)) : ''}
    <div class="tiles4">
      <div class="card"><span class="label">Paid</span><b class="big tnum">${paidN}<span class="small muted">/${all.length}</span></b></div>
      <div class="card"><span class="label">Collected</span><b class="big tnum">${peso(collected)}</b></div>
      <div class="card"><span class="label">Still due</span><b class="big tnum">${stillDue != null ? peso(stillDue) : '—'}</b></div>
      <div class="card"><span class="label">Against costs</span><b class="big tnum" style="color:${cost == null ? 'inherit' : collected >= cost ? 'var(--accent)' : 'var(--warn)'}">${cost == null ? '—' : collected >= cost ? `+${peso(collected - cost)}` : `−${peso(cost - collected)}`}</b>${cost != null ? `<span class="small muted">of ${peso(cost)} cost</span>` : ''}</div>
    </div>
    <div class="seg" role="group" aria-label="Show">${[
      ['all', `Everyone · ${all.length}`],
      ['unpaid', `Not paid · ${all.length - paidN}`],
      ['paid', `Paid · ${paidN}`],
    ]
      .map(
        ([k, l]) =>
          `<button aria-pressed="${f === k}" data-act="payFilter" data-k="${k}">${l}</button>`,
      )
      .join('')}</div>
    ${
      rows.length
        ? `<div class="pay-grid">${rows
            .map(
              ({ r, p, paid }) => `<div class="pay-card ${paid ? 'paid' : ''}">
      <div class="pay-top">${faceBtn(p)}${sw(!!paid, 'togglePaid', `data-pid="${r.pid}"`, `${p.name} paid`)}</div>
      <b class="pay-name">${esc(p.name)}</b>
      <span class="pay-st">${paid ? `${I.check} Paid ${peso(paid.amount)} · ${fmtWhen(paid.at, { lower: true })}` : due != null ? `${peso(due)} due` : 'Not paid'}</span></div>`,
            )
            .join('')}</div>`
        : `<p class="small muted">${f === 'unpaid' ? 'Everyone has paid.' : f === 'paid' ? 'Nobody has paid yet.' : 'No players yet.'}</p>`
    }
  </section>`
}
function histFinancePane(s) {
  if (!s.finance)
    return `<div><h2>Financials</h2></div><div class="card empty">No cost estimate was saved for this session.</div>${s.status === 'invalid' ? '' : paymentsPanel(s)}`
  const n = playerCountOf(s)
  const c = financeCalc(s.finance, s.courts.length, Math.round((s.end - s.start) / 60000), n)
  return `<div><h2>Financials</h2><p class="small muted">The estimate saved for this session, for ${n} players. ROTRA doesn't collect money; tick who has paid in Payments below.</p></div>
    <div class="grid2">
      <section class="card stack"><h3>Costs</h3><dl class="kv">
        <dt>Courts</dt><dd>${peso(c.court)}<br><span class="small muted">${s.courts.length} court${s.courts.length > 1 ? 's' : ''} × ${fmtDur(s.start, s.end)} at ${peso(s.finance.courtFee)}/h</span></dd>
        <dt>Shuttlecocks</dt><dd>${peso(c.shuttle)}${c.lines.map((l) => `<br><span class="small muted">${l.tubes} × ${esc(l.it.name)}</span>`).join('')}</dd>
        ${c.entry ? `<dt>Entrance fees</dt><dd>${peso(c.entry)}<br><span class="small muted">${peso(c.entryFee)} × ${c.n} players · misc</span></dd>` : ''}
        <dt><b>Total cost</b></dt><dd><b>${peso(c.total)}</b></dd></dl></section>
      <section class="card stack"><h3>Per player</h3><dl class="kv">
        <dt>Break-even</dt><dd>${peso(c.share)} a player</dd>
        <dt>Players paid</dt><dd>${peso(c.perHead)} each · ${c.custom ? 'custom amount' : 'break-even'}</dd><dt>Expected</dt><dd>${peso(c.collect)} · ${resultText(c)}</dd></dl></section>
    </div>
    ${paymentsPanel(s)}`
}

// Replay: the courts as they looked at any moment of a finished session. Scrubbing or playing updates only the
// replay card and the match highlights, so the range slider is never re-created mid-drag.
export function replayBounds(s) {
  const ms = s.matches.filter((m) => m.startedAt)
  const from = ms.length ? Math.min(...ms.map((m) => m.startedAt)) : s.startedAt || s.start
  const to = Math.max(from + 6e4, ...ms.map((m) => m.endedAt || m.startedAt))
  return { from, to }
}
function replayCourts(s, t) {
  return s.courts
    .map((c) => {
      const m = s.matches.find(
        (x) => x.courts.includes(c.id) && x.startedAt <= t && t < (x.endedAt || Infinity),
      )
      if (!m)
        return `<div class="rp-court"><div class="between"><b>${esc(c.label)}</b>${chip('Free')}</div><div class="pitch empty">${courtSVG(1)}<span class="free-lbl">${notStarted ? 'Not started' : 'Free'}</span></div></div>`
      const mins = Math.floor((t - m.startedAt) / 6e4)
      return `<div class="rp-court busy"><div class="between"><b>${esc(c.label)}</b>${chip(`#${m.seq} · ${mins} min`, 'ok')}</div><div class="pitch">${courtSVG(1)}${courtSides(s, m)}</div></div>`
    })
    .join('')
}
function replayCard(s) {
  const { from, to } = replayBounds(s)
  const t = Math.min(
    to,
    Math.max(from, S.ui.replayT && S.ui.replayFor === s.id ? S.ui.replayT : from),
  )
  const step = 6e4
  return `<div class="card stack replay" id="replay">
    <div class="rp-courts" id="rp-courts" aria-live="off">${replayCourts(s, t)}</div>
    <div class="rp-bar">
      <button class="btn sm icon-btn primary" id="rp-play" data-act="replayPlay" aria-label="${replayTimer ? 'Pause replay' : 'Play replay'}">${replayTimer ? I.pause : I.play}</button>
      <span class="small tnum" id="rp-time" aria-hidden="true">${fmtTime(t)}</span>
      <input type="range" class="rp-range" id="rp-range" min="${from}" max="${to}" step="${step}" value="${t}" aria-label="Replay time" aria-valuetext="${fmtTime(t)}">
      <span class="small muted tnum">${fmtTime(to)}</span>
    </div>
    <p class="small muted" id="rp-sum">${replaySummary(s, t)}</p>
  </div>`
}
function replaySummary(s, t) {
  const finished = s.matches.filter((m) => m.status === 'done' && m.endedAt <= t).length
  const live = s.matches.filter((m) => m.startedAt <= t && t < (m.endedAt || Infinity)).length
  return `${fmtTime(t)} · ${live} game${live === 1 ? '' : 's'} on court · ${finished} finished so far`
}
export let replayTimer = null
export function setReplayTimer(v) {
  replayTimer = v
}
export function replayTo(t) {
  const s = cur()
  S.ui.replayT = t
  S.ui.replayFor = s.id
  const box = document.getElementById('rp-courts')
  if (!box) {
    stopReplay()
    return
  }
  box.innerHTML = replayCourts(s, t)
  const r = document.getElementById('rp-range')
  if (r && +r.value !== t) r.value = t
  if (r) r.setAttribute('aria-valuetext', fmtTime(t))
  document.getElementById('rp-time').textContent = fmtTime(t)
  document.getElementById('rp-sum').textContent = replaySummary(s, t)
  document.querySelectorAll('.hm[data-mid]').forEach((el) => {
    const m = s.matches.find((x) => x.id === el.dataset.mid)
    el.classList.toggle('now', !!m && m.startedAt <= t && t < (m.endedAt || Infinity))
  })
}
export function stopReplay() {
  clearInterval(replayTimer)
  replayTimer = null
  const b = document.getElementById('rp-play')
  if (b) {
    b.innerHTML = I.play
    b.setAttribute('aria-label', 'Play replay')
  }
}
