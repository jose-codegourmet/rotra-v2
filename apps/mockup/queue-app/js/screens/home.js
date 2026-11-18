import { chip } from '../fragments.js'
import {
  capacityOf,
  courtMatches,
  cur,
  esc,
  fmtDate,
  fmtTime,
  sessionCourtStart,
  waiting,
} from '../helpers.js'
import { I } from '../icons.js'
import { S } from '../state.js'
import { endStatus, fmtRange, fmtWhen, fmtWhenRange } from '../time.js'
import { viewAccess } from './login.js'
import { clubLogo } from './venues.js'

// ---------- Q-HOME ----------
export function viewHome() {
  if (S.licenseExpired) return viewAccess()
  const act = S.sessions.find((s) => s.status === 'active')
  const prepared = S.sessions.filter((s) => s.status === 'prepared')
  const done = S.sessions
    .filter((s) => s.status === 'finalized' || s.status === 'invalid')
    .sort((a, b) => b.start - a.start)
  const next = act || prepared.slice().sort((a, b) => a.start - b.start)[0]
  return `<main class="wrap">
    <section class="club-head" aria-label="Club">${clubLogo('hero-logo')}
      <div class="club-id"><span class="label">Club dashboard · ${new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</span><h1 class="hero-name">${esc(S.club.name)}</h1>
        <div class="row" style="gap:8px">${chip('License active', 'ok')}<span class="small muted">${esc(S.club.license)} · ${esc(S.club.founding)}</span></div></div>
      <button class="btn primary club-head-cta" data-act="newSession">${I.plus || '+'} Create session</button>
    </section>
    ${nowCard(act, prepared)}
    ${calendarCard()}
  </main>`
}

// Dashboard "now" card: one unmistakable state. Live gets a filled pulsing LIVE NOW badge, an accent edge and
// live numbers; upcoming gets an outlined UPCOMING badge with a countdown and preparation numbers.
const untilText = (t) => {
  const m = Math.round((t - Date.now()) / 60000)
  if (m <= 0)
    return m > -15 ? 'Starting now' : `Was due ${fmtWhen(t, { lower: true })} · not started`
  if (m < 60) return `Starts in ${m} min`
  const d = new Date(t),
    today = new Date()
  const days = Math.round((new Date(d).setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0)) / 864e5)
  if (days === 0) return `Starts in ${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}`
  return days === 1 ? `Tomorrow, ${fmtTime(t)}` : `In ${days} days · ${fmtDate(t)}`
}
function nowCard(act, prepared) {
  const soon = prepared.slice().sort((a, b) => a.start - b.start)
  const stat = (v, l) => `<div><b class="tnum">${v}</b><span>${l}</span></div>`
  if (act) {
    const inUse = courtMatches(act).reduce((n, m) => n + m.courts.length, 0)
    const st = endStatus(act)
    const nextUp = soon[0]
    return `<section class="now-card live" aria-label="Live session">
      <div class="stack tight" style="min-width:0"><span class="now-badge live"><i aria-hidden="true"></i>Live now</span>
        <h2 class="now-title">${esc(act.title)}</h2>
        <p class="small muted">${esc(act.venue)} · ${fmtWhenRange(sessionCourtStart(act), act.end)} · ${st.over ? `<span style="color:var(--warn)">${st.text}</span>` : st.text}</p>
        <div class="now-stats">${stat(`${inUse}/${act.courts.length}`, 'courts in use')}${stat(act.matches.filter((m) => m.status === 'done').length, 'games played')}${stat(`${act.roster.filter((r) => r.present).length}/${act.roster.length}`, 'players present')}${stat(waiting(act).length, 'queued')}</div></div>
      <div class="now-actions"><button class="btn primary" data-act="go" data-to="console" data-id="${act.id}">Continue session</button>${nextUp ? `<span class="small muted">Up next: ${esc(nextUp.title)} · ${fmtDate(nextUp.start)}</span>` : ''}</div>
    </section>`
  }
  const next = soon[0]
  if (!next)
    return `<section class="now-card" aria-label="Next session"><div class="stack tight"><span class="now-badge next">Nothing planned</span><h2 class="now-title">Plan your next club night</h2></div><div class="now-actions"><button class="btn primary" data-act="newSession">Create session</button></div></section>`
  return `<section class="now-card next" aria-label="Upcoming session">
      <div class="stack tight" style="min-width:0"><span class="now-badge next">${I.clock}Upcoming · ${esc(untilText(next.start))}</span>
        <h2 class="now-title">${esc(next.title)}</h2>
        <p class="small muted">${fmtDate(next.start)} · ${fmtRange(next.start, next.end)} · ${esc(next.venue)}</p>
        <div class="now-stats">${stat(`${next.roster.length}/${capacityOf(next)}`, 'slots filled')}${stat((next.waitlist || []).length, 'on the waitlist')}${stat(next.courts.length, `court${next.courts.length === 1 ? '' : 's'}`)}${stat(next.download == null ? 'Not connected' : next.download === 'ready' ? 'Ready' : 'No', 'offline copy')}</div></div>
      <div class="now-actions"><button class="btn primary" data-act="go" data-to="prepare" data-id="${next.id}">Open preparation</button><span class="small muted">Not started yet</span></div>
    </section>`
}
// Calendar: one month, today highlighted, a dot for each session that day.
export const dayKey = (t) => {
  const d = new Date(t)
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}
// Session status → [calendar kind, label, screen it opens].
const CAL_STATUS = {
  active: ['live', 'Live now', 'console'],
  prepared: ['prep', 'Prepared', 'prepare'],
  finalized: ['done', 'Completed', 'history'],
  invalid: ['bad', 'Invalid', 'history'],
  cancelled: ['cancel', 'Cancelled', 'history'],
}
export function calendarEvents() {
  const ev = S.sessions.map((s) => {
    const [kind, label, to] = CAL_STATUS[s.status] || CAL_STATUS.prepared
    return {
      t: s.start,
      end: s.end,
      title: s.title,
      venue: s.venue,
      kind,
      label,
      act: `data-act="go" data-to="${to}" data-id="${s.id}"`,
    }
  })
  return ev.sort((a, b) => a.t - b.t)
}
// The dashboard calendar adapts to the screen: a month grid on desktops, a week of day columns on tablets,
// and a single day (with a week strip to hop between days) on phones. Prev / Today / Next move by that unit.
export const calView = () =>
  window.innerWidth > 1024 ? 'month' : window.innerWidth > 640 ? 'week' : 'day'
const startOfDay = (t) => new Date(t).setHours(0, 0, 0, 0)
export const calRef = () => S.ui.calRef || startOfDay(Date.now())
function calHeader(title, unit) {
  return `<div class="between"><h2>${title}</h2>
      <div class="row" style="gap:4px"><button class="btn xs icon-btn" data-act="calMove" data-d="-1" aria-label="Previous ${unit}">${I.back}</button><button class="btn xs" data-act="calToday">Today</button><button class="btn xs icon-btn" data-act="calMove" data-d="1" aria-label="Next ${unit}"><span style="display:inline-flex;transform:scaleX(-1)">${I.back}</span></button></div></div>`
}
const calLegend = (hint) =>
  `<div class="between small muted"><div class="row" style="gap:12px"><span><i class="cal-key live"></i>Live</span><span><i class="cal-key prep"></i>Prepared</span><span><i class="cal-key done"></i>Completed</span><span><i class="cal-key bad"></i>Invalid</span><span><i class="cal-key cancel"></i>Cancelled</span></div><span>${hint}</span></div>`
const calCard = (e) =>
  `<button class="cal-card ${e.kind}" ${e.act}><span class="cal-time tnum">${fmtRange(e.t, e.end)}</span><b>${esc(e.title)}</b><span class="small muted">${esc(e.venue)}</span>${chip(e.label, e.kind === 'live' ? 'ok' : e.kind === 'bad' ? 'bad' : e.kind === 'prep' ? 'warn' : '')}</button>`
function calendarCard() {
  const view = calView()
  const byDayAll = {}
  calendarEvents().forEach((e) => {
    ;(byDayAll[dayKey(e.t)] = byDayAll[dayKey(e.t)] || []).push(e)
  })
  const ref = calRef(),
    todayK = dayKey(Date.now())
  if (view !== 'month') {
    const r = new Date(ref),
      weekStart = new Date(r.getFullYear(), r.getMonth(), r.getDate() - r.getDay()).getTime()
    const days = Array.from({ length: 7 }, (_, i) =>
      new Date(
        new Date(weekStart).getFullYear(),
        new Date(weekStart).getMonth(),
        new Date(weekStart).getDate() + i,
      ).getTime(),
    )
    if (view === 'week') {
      const a = new Date(days[0]),
        b = new Date(days[6])
      const title = `${a.toLocaleDateString([], { month: 'short', day: 'numeric' })} – ${b.toLocaleDateString([], { month: a.getMonth() === b.getMonth() ? undefined : 'short', day: 'numeric' })}, ${b.getFullYear()}`
      return `<section class="card stack cal-section" aria-label="Calendar, week view">${calHeader(title, 'week')}
        <div class="cal-week">${days
          .map((t) => {
            const k = dayKey(t),
              evs = byDayAll[k] || [],
              d = new Date(t)
            return `<div class="cal-wcol ${k === todayK ? 'today' : ''}">
          <button class="cal-whead" data-act="calDay" data-k="${t}" aria-haspopup="dialog" aria-label="${d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}${k === todayK ? ', today' : ''}, ${evs.length} session${evs.length === 1 ? '' : 's'}"><span>${d.toLocaleDateString([], { weekday: 'short' })}</span><b>${d.getDate()}</b></button>
          ${evs.length ? evs.map(calCard).join('') : '<span class="cal-none" aria-hidden="true">—</span>'}</div>`
          })
          .join('')}</div>
        ${calLegend('Tap a day for more.')}</section>`
    }
    const k = dayKey(ref),
      evs = byDayAll[k] || [],
      d = new Date(ref)
    return `<section class="card stack cal-section" aria-label="Calendar, day view">${calHeader(d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }), 'day')}
      <div class="cal-strip" role="group" aria-label="This week">${days
        .map((t) => {
          const kk = dayKey(t),
            n = (byDayAll[kk] || []).length,
            dd = new Date(t)
          return `<button class="cal-sday ${kk === k ? 'sel' : ''} ${kk === todayK ? 'today' : ''}" data-act="calPick" data-k="${t}" aria-pressed="${kk === k}" aria-label="${dd.toLocaleDateString([], { weekday: 'long', day: 'numeric' })}${n ? `, ${n} session${n > 1 ? 's' : ''}` : ''}"><span>${dd.toLocaleDateString([], { weekday: 'narrow' })}</span><b>${dd.getDate()}</b><i class="${n ? 'on' : ''}" aria-hidden="true"></i></button>`
        })
        .join('')}</div>
      <div class="stack tight">${evs.length ? evs.map(calCard).join('') : `<div class="empty">No sessions this day.${ref >= startOfDay(Date.now()) ? ` <button class="btn sm primary" data-act="newSession" data-k="${ref}">Create session on this day</button>` : ''}</div>`}</div>
      ${calLegend('Use the arrows, or tap a day in the strip.')}</section>`
  }
  const now = new Date(ref)
  const first = new Date(now.getFullYear(), now.getMonth(), 1)
  const daysIn = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const byDay = {}
  Object.assign(byDay, byDayAll)
  const selT = S.ui.calDay || startOfDay(Date.now())
  const selK = dayKey(selT)
  const cells = []
  for (let i = 0; i < first.getDay(); i++)
    cells.push('<span class="cal-cell blank" aria-hidden="true"></span>')
  for (let d = 1; d <= daysIn; d++) {
    const t = new Date(first.getFullYear(), first.getMonth(), d).getTime()
    const k = dayKey(t),
      evs = byDay[k] || []
    const label = `${new Date(t).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}${k === todayK ? ', today' : ''}${evs.length ? `, ${evs.length} session${evs.length > 1 ? 's' : ''}` : ''}`
    cells.push(`<div class="cal-cell ${k === todayK ? 'today' : ''} ${k === selK ? 'sel' : ''}" data-act="calDay" data-k="${t}">
      <button class="cal-num" data-act="calDay" data-k="${t}" data-id="day${t}" aria-label="${label}" aria-haspopup="dialog">${d}</button>
      <div class="cal-evs">${evs
        .slice(0, 2)
        .map(
          (e) =>
            `<button class="cal-ev ${e.kind}" ${e.act} title="${esc(e.title)} · ${fmtTime(e.t)}">${esc(fmtTime(e.t))} ${esc(e.title)}</button>`,
        )
        .join(
          '',
        )}${evs.length > 2 ? `<button class="cal-more" data-act="calDay" data-k="${t}" data-id="more${t}" aria-haspopup="dialog">+${evs.length - 2} more</button>` : ''}</div>
      <span class="cal-dots" aria-hidden="true">${evs
        .slice(0, 3)
        .map((e) => `<i class="${e.kind}"></i>`)
        .join('')}</span></div>`)
  }
  while (cells.length % 7) cells.push('<span class="cal-cell blank" aria-hidden="true"></span>')
  return `<section class="card stack cal-section" aria-label="Calendar">
    <div class="between"><h2>${first.toLocaleDateString([], { month: 'long', year: 'numeric' })}</h2>
      <div class="row" style="gap:4px"><button class="btn xs icon-btn" data-act="calMove" data-d="-1" aria-label="Previous month">${I.back}</button><button class="btn xs" data-act="calToday">Today</button><button class="btn xs icon-btn" data-act="calMove" data-d="1" aria-label="Next month"><span style="display:inline-flex;transform:rotate(180deg)">${I.back}</span></button></div></div>
    <div class="stack tight">
      <div class="cal-grid2">${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((w) => `<span class="cal-wd2" aria-hidden="true">${w}</span>`).join('')}${cells.join('')}</div>
      <div class="between small muted"><div class="row" style="gap:12px"><span><i class="cal-key live"></i>Live</span><span><i class="cal-key prep"></i>Prepared</span><span><i class="cal-key done"></i>Completed</span><span><i class="cal-key bad"></i>Invalid</span><span><i class="cal-key cancel"></i>Cancelled</span></div><span>Tap a date to see its sessions.</span></div>
    </div>
  </section>`
}
// Phone dock: menu (opens the left nav), the main session action, and settings, always within thumb reach.
export function mobileDock() {
  const live = S.sessions.find((x) => x.status === 'active')
  // On the live session and on preparation the dock's main button becomes that page's own action (Session done /
  // Start session), so the page's bottom bar is hidden on phones and there is only one floating button.
  const p = S.screen === 'prepare' && cur() && cur().status === 'prepared' ? cur() : null
  const startBlocked =
    p &&
    (p.roster.some((r) => r.level == null) ||
      S.sessions.some((x) => x.status === 'active' && x.id !== p.id) ||
      (!S.online && p.download !== 'ready') ||
      S.licenseExpired)
  const main =
    S.screen === 'console'
      ? `<button class="dock-main" data-act="openSessionDone" ${!S.online ? 'disabled' : ''}>${I.check}<span>Session done</span></button>`
      : p
        ? `<button class="dock-main" data-act="openStart" ${startBlocked ? 'disabled' : ''}>${I.n_live}<span>Start session</span></button>`
        : live
          ? `<button class="dock-main" data-act="go" data-to="console" data-id="${live.id}">${I.n_live}<span>Continue session</span></button>`
          : '<button class="dock-main" data-act="newSession">' +
            I.n_plus +
            '<span>Create session</span></button>'
  return `<nav class="dock" aria-label="Quick actions">
    <button class="dock-btn" data-act="toggleNav" aria-controls="app-nav" aria-expanded="${!!S.ui.navOpen}">${I.n_menu}<span>Menu</span></button>
    ${main}
    <button class="dock-btn ${S.screen === 'club' ? 'on' : ''}" data-act="goClub" data-k="club" ${S.screen === 'club' ? 'aria-current="page"' : ''}>${I.n_gear}<span>Settings</span></button>
  </nav>`
}
export function navRail() {
  const live = S.sessions.find((x) => x.status === 'active')
  const here =
    S.screen === 'home'
      ? 'dash'
      : S.screen === 'players'
        ? 'players'
        : S.screen === 'venues'
          ? 'venues'
          : S.screen === 'inventory'
            ? 'inventory'
            : S.screen === 'club'
              ? S.ui.clubTab === 'license' || S.ui.clubTab === 'payments'
                ? 'license'
                : S.ui.clubTab === 'device'
                  ? 'device'
                  : 'club'
              : S.screen === 'console'
                ? 'live'
                : ''
  const count = {
    players: S.players.length,
    venues: (S.venues || []).length,
    inventory: S.inventory.length,
  }
  const items = [
    live && ['live', 'Live session', I.n_live, 'go', 'console', live.id],
    ['dash', 'Dashboard', I.n_home, 'go', 'home'],
    ['players', 'Saved players', I.n_users, 'go', 'players'],
    ['venues', 'Venues', I.n_pin, 'go', 'venues'],
    ['inventory', 'Inventory', I.n_box, 'openInventory', ''],
    ['club', 'Club settings', I.n_gear, 'goClub', 'club'],
    ['license', 'License', I.n_card, 'goClub', 'club'],
    ['device', 'This device', I.n_device, 'goClub', 'club'],
  ].filter(Boolean)
  return `<nav class="rail" id="app-nav" aria-label="Club navigation">
    ${items.map(([k, l, ic, act, to, id]) => `<button class="rail-link ${k === here ? 'on' : ''} ${k === 'live' ? 'is-live' : ''}" data-act="${act}" data-to="${to}" data-k="${k}" ${id ? `data-id="${id}"` : ''} ${k === here ? 'aria-current="page"' : ''} title="${l}" aria-label="${l}${count[k] != null ? `, ${count[k]}` : ''}">${ic}<span class="txt">${l}</span>${count[k] != null ? `<span class="count tnum">${count[k]}</span>` : ''}</button>`).join('')}
  </nav>`
}
function clubShortcuts() {
  const items = [
    ['club', 'Club settings', 'Name, logo, founding address'],
    ['players', 'Saved players', `${S.players.length} players`],
    ['license', 'License', 'Yearly · until Mar 31, 2027'],
    ['inventory', 'Inventory', `${S.inventory.length} items`],
    [
      'device',
      'This device',
      `${S.sessions.filter((s) => s.download === 'ready' && s.status !== 'cancelled').length} session${S.sessions.filter((s) => s.download === 'ready' && s.status !== 'cancelled').length === 1 ? '' : 's'} downloaded`,
    ],
  ]
  return `<section class="card stack"><h2>Club</h2><div class="quick">${items.map(([k, t, sub]) => `<button class="quick-tile" data-act="${k === 'players' ? 'go' : k === 'inventory' ? 'openInventory' : 'goClub'}" data-to="${k === 'players' ? 'players' : 'club'}" data-k="${k}"><b>${t}</b><span class="small muted">${esc(sub)}</span></button>`).join('')}</div>
    <button class="btn sm ghost" data-act="openSignOut">Sign out</button></section>`
}
