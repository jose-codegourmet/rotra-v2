import { faceBtn, identChip, notice, selectLevel, sessionEstimate, sw } from '../fragments.js'
import { capacityOf, cur, esc, fmtDate, fmtTime, lvLabel, P, R } from '../helpers.js'
import { I } from '../icons.js'
import { LEVEL_GROUPS, LEVELS, S } from '../state.js'
import { presencePending } from '../sync.js'
import { fmtRange, laterDay } from '../time.js'
import { viewHome } from './home.js'
import { paymentsPanel, viewHistory } from './session-record.js'
import {
  levelDiff,
  pendingReqs,
  prepOverview,
  requestsPanel,
  slotMeter,
  waitlistPanel,
} from './setup.js'

// ---------- Q-PREPARE ----------
// Roster and levels panel. Level tabs follow each player's level family; Group by splits the list into headed
// sections (empty ones hidden); List | Grid swaps rows for cards with the same controls. All three stay on this device.
const rvBand = (r) => (r.level == null ? 'none' : LEVELS[r.level].band.toLowerCase())
// [key, option label, group of a roster entry, group order]. A 'pending' player (phone lookup not done yet) counts as Guest.
const RV_BY = [
  ['none', 'None'],
  [
    'skill',
    'Skill group',
    (s, r) => (r.level == null ? 'No level' : LEVELS[r.level].band),
    ['Advanced', 'Intermediate', 'Beginner', 'No level'],
  ],
  [
    'avail',
    'Availability',
    (s, r) => (r.present ? 'Present' : 'Not present'),
    ['Present', 'Not present'],
  ],
  [
    'prior',
    'Returning or first time',
    (s, r) => (P(r.pid).prior > 0 ? 'Returning' : 'First time here'),
    ['Returning', 'First time here'],
  ],
  [
    'profile',
    'ROTRA profile',
    (s, r) =>
      ['registered', 'unclaimed'].includes(P(r.pid).identity) ? 'Has a ROTRA profile' : 'Guest',
    ['Has a ROTRA profile', 'Guest'],
  ],
  [
    'paid',
    'Payment',
    (s, r) => ((s.payments || {})[r.pid] ? 'Paid' : 'Not paid'),
    ['Paid', 'Not paid'],
  ],
]
const rvLevel = (r, p, live) =>
  `<div class="lvcol">${live ? `<b>${esc(lvLabel(r.level))} · Fixed after start</b>` : selectLevel(`lv-${r.pid}`, r.level, `data-act-change="setLevel" data-pid="${r.pid}" aria-label="Level for ${esc(p.name)} at this club" aria-describedby="lvd-${r.pid}"`, r.level == null)}${levelDiff(r.level, p.sugg, `lvd-${r.pid}`)}</div>`
const rvSugg = (p) =>
  `<span class="small muted">${p.sugg != null ? `Suggestion: ${esc(lvLabel(p.sugg))}` : 'No suggestion'}</span>`
const rvRemove = (r, p) =>
  `<button class="btn xs ghost icon-btn" data-act="removeRoster" data-pid="${r.pid}" aria-label="Remove ${esc(p.name)} from roster">${I.x}</button>`
const rvPresence = (r, p, extra = '') =>
  `<div class="row" style="flex-wrap:nowrap"><span class="small muted">${presencePending.has(r.pid) ? 'Saving presence…' : 'Present'}</span>${sw(r.present, 'togglePresent', `data-pid="${r.pid}"`, `${p.name} present`)}${extra}</div>`
const rvAway = (r) => `<span class="small muted">${r.present ? 'Present' : 'Away'}</span>`
function rvRow(s, r, live) {
  const p = P(r.pid)
  return `<div class="prow">
        <div class="li" style="padding:0">${faceBtn(p)}<div class="main"><div class="pn"><b>${esc(p.name)}</b></div><div class="row" style="gap:6px">${identChip(p)}${rvSugg(p)}</div></div></div>
        ${rvLevel(r, p, live)}
        ${live ? rvAway(r) : rvPresence(r, p, rvRemove(r, p))}
      </div>`
}
function rvCard(s, r, live) {
  const p = P(r.pid),
    paid = (s.payments || {})[r.pid]
  return `<article class="rv-card" aria-label="${esc(p.name)}">
        <div class="rv-top">${faceBtn(p)}<div class="main"><b>${esc(p.name)}</b><div class="row" style="gap:6px">${identChip(p)}</div></div>${live ? '' : rvRemove(r, p)}</div>
        ${rvSugg(p)}
        ${rvLevel(r, p, live)}
        <div class="rv-st">${live ? rvAway(r) : rvPresence(r, p)}<span class="rv-paid ${paid ? 'ok' : ''}">${paid ? `${I.check} Paid` : 'Not paid'}</span></div>
      </article>`
}
function rosterPanel(s, live, missing) {
  const bandN = (b) => s.roster.filter((r) => rvBand(r) === b).length
  const tabs = [
    ['all', 'All', s.roster.length],
    ...[...LEVEL_GROUPS].reverse().map((b) => [b.toLowerCase(), b, bandN(b.toLowerCase())]),
  ]
  if (bandN('none')) tabs.push(['none', 'No level', bandN('none')])
  const v = { tab: 'all', by: 'none', view: 'list', ...(S.ui.rv || {}) }
  const tab = tabs.some(([k]) => k === v.tab) ? v.tab : 'all'
  // Skill group only splits the All tab; on a level tab it falls back to None.
  const byOpts = RV_BY.filter(([k]) => tab === 'all' || k !== 'skill')
  const by = byOpts.find(([k]) => k === v.by) || byOpts[0]
  const view = v.view === 'grid' ? 'grid' : 'list'
  const rows = s.roster.filter((r) => tab === 'all' || rvBand(r) === tab)
  const body = (list) =>
    view === 'grid'
      ? `<div class="rv-grid">${list.map((r) => rvCard(s, r, live)).join('')}</div>`
      : `<div class="list">${list.map((r) => rvRow(s, r, live)).join('')}</div>`
  const sections = by[2]
    ? by[3].map((g) => [g, rows.filter((r) => by[2](s, r) === g)]).filter(([, list]) => list.length)
    : null
  return `<section class="card stack">
      <div class="between"><div><h2>Roster and levels</h2><p class="small muted">${live ? 'Fixed after start: playing levels. Manage presence in the live Players view.' : "Confirm each player's slot and set their level for this club. Levels lock when the session starts."}</p></div>
        <div class="row acts">${!live && s.roster.some((r) => !r.present) ? '<button class="btn sm" data-act="allPresent">Mark all present</button>' : ''}${!live && s.roster.some((r) => r.present) ? '<button class="btn sm" data-act="allAbsent">Mark all absent</button>' : ''}<button class="btn sm primary" data-act="openAdd">Add player</button></div></div>
      ${slotMeter(s)}
      ${missing ? notice('warn', `${missing} player${missing > 1 ? 's need' : ' needs'} a level before the session can start.`) : ''}
      ${
        s.roster.length
          ? `<div class="tabs rv-tabs" role="tablist" aria-label="Levels">${tabs.map(([k, l, n]) => `<button role="tab" id="rvt-${k}" aria-selected="${tab === k}" aria-controls="rv-panel" data-act="rvSet" data-k="tab" data-v="${k}">${l} <span class="chip">${n}</span></button>`).join('')}</div>
      <div class="row rv-bar">
        <select class="input inline" id="rv-by" data-act-change="rvSet" data-k="by" aria-label="Group players by">${byOpts.map(([k, l]) => `<option value="${k}" ${by[0] === k ? 'selected' : ''}>Group by: ${l}</option>`).join('')}</select>
        <div class="seg" role="group" aria-label="Roster view">${[
          ['list', 'List'],
          ['grid', 'Grid'],
        ]
          .map(
            ([k, l]) =>
              `<button id="rvv-${k}" aria-pressed="${view === k}" data-act="rvSet" data-k="view" data-v="${k}">${l}</button>`,
          )
          .join('')}</div>
      </div>
      <div id="rv-panel" role="tabpanel" aria-labelledby="rvt-${tab}" class="stack">${
        !rows.length
          ? `<div class="empty">No ${esc(tabs.find(([k]) => k === tab)[1])} players on the roster.</div>`
          : sections
            ? sections
                .map(
                  ([g, list], i) =>
                    `<section class="stack tight" aria-labelledby="rvg-${i}"><h3 id="rvg-${i}">${esc(g)} · ${list.length}</h3>${body(list)}</section>`,
                )
                .join('')
            : body(rows)
      }</div>`
          : '<div class="empty">No players yet. Add players from your saved list or as new guests.</div>'
      }
    </section>`
}
export function viewPrepare() {
  const s = cur()
  if (!s || !['prepared', 'active'].includes(s.status)) {
    S.screen = s ? 'history' : 'home'
    return s ? viewHistory() : viewHome()
  }
  const live = s.status === 'active'
  const est = sessionEstimate(s)
  if (s.minAuto !== false && s.status === 'prepared') s.minimum = est.low
  const missing = s.roster.filter((r) => r.level == null).length
  const present = s.roster.filter((r) => r.present).length
  const other = S.sessions.find((x) => x.status === 'active' && x.id !== s.id)
  const dl = {
    none: ['Not downloaded on this device', ''],
    downloading: ['Downloading…', 'warn'],
    ready: ['Ready on this device', 'ok'],
  }[s.download]
  const cantStart = missing || other || !S.online || S.licenseExpired
  return `<main class="wrap">
    <div class="crumb"><button class="btn sm ghost" data-act="go" data-to="home">${I.back} Home</button></div>
    <div class="between"><div class="stack tight"><span class="label">${live ? 'Session settings' : 'Preparation'}</span><h1>${esc(s.title)}</h1><p class="muted">${live ? `${fmtDate(s.startedAt)} · Started ${fmtTime(s.startedAt)} · Ends ${fmtTime(s.end)}${laterDay(s.startedAt, s.end)}` : `${fmtDate(s.start)} · ${fmtRange(s.start, s.end)}`} · ${esc(s.venue)}</p></div>
      <div class="row acts">${live ? '<button class="btn sm" data-act="go" data-to="console">Back to live session</button>' : '<button class="btn sm" data-act="editSetup">Edit preparation</button>'}<button class="btn sm" data-act="go" data-to="public">Preview public page</button><button class="btn sm" data-act="openPost">Copy Facebook post</button>${live ? '' : '<button class="btn sm danger" data-act="openDeleteSession">Delete session</button><button class="btn sm danger" data-act="openCancelSession">Cancel session</button>'}</div></div>
    ${live ? notice('', 'Preparation values are read-only during play. Mode, formats, minimum and playing levels are fixed after start. Use the live controls in Overview to manage courts, time, arrivals, requests and payments.') : pendingReqs(s).length ? requestsPanel(s) : ''}
    ${(() => {
      const tab = ['overview', 'roster', 'waitlist', 'payments'].includes(S.ui.prepTab)
        ? S.ui.prepTab
        : 'overview'
      const paidN = Object.keys(s.payments || {}).filter((pid) => R(s, pid)).length
      const tabs = [
        ['overview', 'Overview', null],
        ['roster', 'Roster and levels', `${s.roster.length}/${capacityOf(s)}`],
        ['waitlist', 'Waitlist', (s.waitlist || []).length],
        ['payments', 'Payments', `${paidN}/${s.roster.length} paid`],
      ]
      return `<div class="tabs" role="tablist" aria-label="${live ? 'Session settings' : 'Preparation'}">${tabs.map(([k, l, n]) => `<button role="tab" id="ptb-${k}" aria-selected="${tab === k}" aria-controls="prep-panel" data-act="prepTab" data-k="${k}">${l}${n != null ? ` <span class="chip">${n}</span>` : ''}</button>`).join('')}</div>
      <div id="prep-panel" role="tabpanel" aria-labelledby="ptb-${tab}" class="stack">${tab === 'overview' ? prepOverview(s) : tab === 'waitlist' ? waitlistPanel(s) : tab === 'payments' ? paymentsPanel(s) : rosterPanel(s, live, missing)}</div>`
    })()}
  </main>
  ${
    !live
      ? `<div class="footer-bar ${cantStart ? 'dock-note' : 'dock-dup'}"><div class="in">
    <span class="small ${cantStart ? 'start-why' : 'muted'}">${
      other
        ? `${esc(other.title)} is already running. One session at a time. <button class="btn xs" data-act="go" data-to="console" data-id="${other.id}">Open ${esc(other.title)}</button>`
        : S.licenseExpired
          ? 'Your license has ended, so new sessions can’t start.'
          : !S.online
            ? 'Starting needs an internet connection.'
            : missing
              ? `${missing} player${missing > 1 ? 's need' : ' needs'} a level before you can start.`
              : `${s.roster.length} players · ${present} present. Starting locks levels; no match starts by itself.`
    }</span>
    <button class="btn primary" data-act="openStart" ${cantStart ? 'disabled' : ''}>Start session</button>
  </div></div>`
      : ''
  }`
}
