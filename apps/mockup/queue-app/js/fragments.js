import { avatar, esc, gamesOf, lvLabel, nm, P, perCourtOf, R } from './helpers.js'
import { I } from './icons.js'
import { IDENT, isDark, LEVEL_GROUPS, LEVELS, narrowScreen, navMin, S } from './state.js'
import { syncLabel } from './sync.js'

// ---------- Shared fragments ----------
export const chip = (t, k = '') => `<span class="chip ${k}">${t}</span>`
export const identChip = (p) =>
  chip(
    IDENT[p.identity] || esc(p.identity),
    p.identity === 'registered' ? 'ok' : p.identity === 'pending' ? 'warn' : '',
  )
export const sw = (on, act, attrs, label) =>
  `<button class="switch" role="switch" aria-checked="${!!on}" aria-label="${esc(label)}" data-act="${act}" ${attrs}></button>`
export const notice = (kind, html) =>
  `<div class="notice ${kind}">${kind === 'ok' ? I.check : kind ? I.alert : I.info}<div>${html}</div></div>`
const pname = (s, pid) => {
  const r = R(s, pid)
  return `<span class="pn"><b>${esc(nm(pid))}</b>${r ? `<span class="lv">${esc(lvLabel(r.level))}</span>` : ''}</span>`
}
// Player cards with their picture for match dialogs; tapping one opens the profile, whose Back returns to the dialog.
// With a swap scope, each card can also be dragged onto a player on the other team to switch sides.
export const SWAP_TIP =
  'Drag onto a player on the other team, or press the left or right arrow, to switch sides'
const swapAttrs = (scope, team, i, pid) =>
  scope
    ? `data-swap="${scope}" data-team="${team}" data-i="${i}"${pid ? ` data-pid="${pid}" title="${SWAP_TIP}"` : ''}`
    : ''
export const faceTeam = (s, ids, label, swap) =>
  `<div class="sg-team" role="group" aria-label="${label}"><span class="tl">${label}</span>${ids
    .map((pid, i) => {
      const p = P(pid),
        r = R(s, pid),
        g = gamesOf(s, pid)
      return `<button class="sg-p" data-act="openProfile" data-id="${pid}" data-back="1" ${swapAttrs(swap, label === 'Team A' ? 'teamA' : 'teamB', i, pid)} aria-label="${esc(p.name)}, ${esc(lvLabel(r ? r.level : null))}, ${g} of ${s.minimum} games. View profile${swap ? '. Left or right arrow switches sides' : ''}">${avatar(p)}<span class="main"><b>${esc(p.name)}</b><span class="small muted">${esc(lvLabel(r ? r.level : null))}</span><span class="small ${g < s.minimum ? 'low' : 'muted'}">${g}/${s.minimum} games</span></span></button>`
    })
    .join('')}</div>`
// A player's picture as a button that opens their profile (Back returns to an open dialog).
export const faceBtn = (p) =>
  `<button class="face-btn" data-act="openProfile" data-id="${p.id}" data-back="1" aria-label="View ${esc(p.name)}'s profile" title="${esc(p.name)}">${avatar(p)}</button>`
const teamBlock = (s, ids, label) =>
  `<div class="team"><span class="tl">${label}</span>${ids.length ? ids.map((p) => pname(s, p)).join('') : '<span class="muted small">Empty</span>'}</div>`
export function selectLevel(id, value, attrs = '', bad = false) {
  let html = `<select class="input${bad ? ' bad' : ''}" id="${id}" ${attrs}><option value="">Choose a level…</option>`
  LEVEL_GROUPS.forEach((band) => {
    html += `<optgroup label="${band}">`
    LEVELS.forEach((l, i) => {
      if (l.band === band)
        html += `<option value="${i}" ${value !== null && value !== '' && String(value) === String(i) ? 'selected' : ''}>${l.label}</option>`
    })
    html += '</optgroup>'
  })
  return html + '</select>'
}
export const fmtFormats = (s) =>
  [s.singles && 'Singles', s.doubles && 'Doubles'].filter(Boolean).join(' + ') ||
  'No standard format'

// Minimum-games estimate: courts that can actually be filled × games that fit in the time (15–20 min each)
// × players per game, shared across the roster. The 20-minute end becomes the minimum so it stays reachable.
// Players on court per game: doubles 4, singles 2. With both on, generation runs about 2 doubles to 1 singles.
export const perGameOf = (o) => (o.doubles && o.singles ? 10 / 3 : o.singles ? 2 : 4)
export const formatMixLabel = (o) =>
  o.doubles && o.singles ? 'mixed doubles and singles' : o.singles ? 'singles' : 'doubles'
export function estimateGames(courts, minutes, players, perGame) {
  const n = Math.max(1, players || 1)
  const usable = Math.max(1, Math.min(courts, Math.floor(n / perGame)))
  const at = (len) => Math.floor((usable * Math.floor(minutes / len) * perGame) / n)
  return { low: at(20), high: at(15), usable }
}
// Players for estimates and costs: the roster, else expected players, else the slot budget.
export const playerCountOf = (s) => s.roster.length || s.expected || s.courts.length * perCourtOf(s)
export const sessionEstimate = (s) =>
  estimateGames(
    s.courts.length,
    Math.round((s.end - s.start) / 60000),
    playerCountOf(s),
    perGameOf(s),
  )

// ---------- Top bar ----------
export const hasShell = () =>
  !['login', 'public', 'finalizing'].includes(S.screen) &&
  !(S.screen === 'home' && S.licenseExpired)
export function topBar() {
  if (S.screen === 'public') return ''
  const c = syncLabel()
  const shell = hasShell()
  return `<header class="top"><div class="top-in">
    ${shell ? `<button class="btn xs ghost icon-btn burger" data-act="toggleNav" aria-controls="app-nav" aria-expanded="${narrowScreen() ? !!S.ui.navOpen : !navMin}" aria-label="${narrowScreen() ? (S.ui.navOpen ? 'Close menu' : 'Open menu') : navMin ? 'Expand navigation' : 'Collapse navigation'}">${I.n_menu}</button>` : ''}
    <div class="brand" aria-label="ROTRA Queue">ROTR<b>A</b><span>Queue</span></div>
    <div class="grow"></div>
    ${S.screen !== 'login' ? `<button class="conn ${c.cls}" data-act="openSync" aria-haspopup="dialog" aria-label="Sync status: ${esc(c.text)}. Show what synced"><i></i><span class="conn-full">${esc(c.text)}</span><span class="conn-short" aria-hidden="true">${esc(c.short)}</span></button>` : ''}
    <button class="btn xs ghost icon-btn theme-btn" data-act="toggleTheme" aria-label="Switch to ${isDark() ? 'light' : 'dark'} mode" title="${isDark() ? 'Light' : 'Dark'} mode">${isDark() ? I.sun : I.moon}</button>
    <button class="btn xs" data-act="openDemo">Prototype</button>
  </div></header>`
}
