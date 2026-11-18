import { identChip } from '../fragments.js'
import { avatar, busyOf, courtLabel, esc, hashStr, lvLabel, R } from '../helpers.js'
import { I } from '../icons.js'
import { IDENT, LEVELS, S } from '../state.js'
import { viewAccess } from './login.js'

// ---------- Q-SAVED-PLAYERS ----------
// Saved players: where a profile was first registered comes from the city code in its RTR ID.
const CITY = { CEB: 'Cebu City', MNL: 'Manila', DVO: 'Davao City', ILO: 'Iloilo City' }
export const regCity = (p) => {
  const m = /^RTR-[A-Z]{2}-([A-Z]{3})-/.exec(p.rtr || '')
  return m ? CITY[m[1]] || m[1] : null
}
// Legacy prototype records without an added date retain their display fallback.
export const addedAt = (p) =>
  p.added || new Date().setHours(12, 0, 0, 0) - ((hashStr(p.id) % 300) + 2) * 864e5
const bandOf = (p) => (p.sugg == null ? 'none' : LEVELS[p.sugg].band.split(' ')[0].toLowerCase())
const regStatus = (p) =>
  p.identity === 'registered' ? 'registered' : p.identity === 'unclaimed' ? 'unclaimed' : 'guest'
export const canInvite = (p) => p.identity === 'guest' || p.identity === 'unclaimed'
const SP_FILTERS = {
  sort: [
    'Sort',
    [
      ['az', 'Name A–Z'],
      ['za', 'Name Z–A'],
      ['new', 'Newest added'],
      ['old', 'Oldest added'],
      ['level', 'Level, high to low'],
    ],
  ],
  band: [
    'Skill level',
    [
      ['all', 'All levels'],
      ['beginner', 'Beginner'],
      ['intermediate', 'Intermediate'],
      ['advanced', 'Advanced'],
      ['none', 'No level yet'],
    ],
  ],
  city: ['Registered in', null],
  added: [
    'Added',
    [
      ['any', 'Any time'],
      ['7', 'Last 7 days'],
      ['30', 'Last 30 days'],
      ['90', 'Last 3 months'],
      ['older', 'More than 3 months ago'],
    ],
  ],
  status: [
    'Account',
    [
      ['all', 'Everyone'],
      ['registered', 'Registered'],
      ['unclaimed', 'Unclaimed profile'],
      ['guest', 'Guest'],
    ],
  ],
  live: [
    'Right now',
    [
      ['all', 'Anyone'],
      ['playing', 'Playing now'],
      ['waiting', 'At the session, not playing'],
      ['session', 'In the live session'],
    ],
  ],
}
// Where a saved player is in the live session right now: on a court (with its label), present and waiting, or not there.
export const liveSession = () => S.sessions.find((x) => x.status === 'active')
function liveState(pid) {
  const s = liveSession()
  if (!s) return null
  const r = R(s, pid)
  if (!r) return null
  const m = busyOf(s, pid)
  if (m && m.status === 'oncourt')
    return {
      kind: 'oncourt',
      text: `On court · getting ready · ${m.courts.map((c) => courtLabel(s, c)).join(' + ')}`,
    }
  if (m)
    return {
      kind: 'playing',
      text: `Playing · ${m.courts.map((c) => courtLabel(s, c)).join(' + ')}`,
    }
  return r.present
    ? { kind: 'waiting', text: 'At the session' }
    : { kind: 'away', text: 'Not here yet' }
}
function savedPlayerStats() {
  const now = Date.now(),
    local = new Date(now + 8 * 3600e3)
  const monday =
    Date.UTC(
      local.getUTCFullYear(),
      local.getUTCMonth(),
      local.getUTCDate() - ((local.getUTCDay() + 6) % 7),
    ) -
    8 * 3600e3
  const cards = [
    ['Total players', S.players.length],
    ['Total registered', S.players.filter((p) => p.identity === 'registered').length],
    ['Total beginners', S.players.filter((p) => bandOf(p) === 'beginner').length],
    ['Total intermediates', S.players.filter((p) => bandOf(p) === 'intermediate').length],
    ['Total advanced', S.players.filter((p) => bandOf(p) === 'advanced').length],
    ['New players this week', S.players.filter((p) => p.added >= monday && p.added <= now).length],
  ]
  return `<section class="sp-stats" aria-label="Saved player statistics" aria-roledescription="carousel">
    <div class="sp-stats-head"><p class="small muted">All saved players · This week starts Monday (Asia/Manila)</p><div class="sp-stats-controls">
      <button class="btn sm" data-act="spStatsScroll" data-d="-1" aria-label="Previous statistics" aria-controls="sp-stats-viewport">←</button>
      <button class="btn sm" data-act="spStatsScroll" data-d="1" aria-label="Next statistics" aria-controls="sp-stats-viewport">→</button>
    </div></div>
    <div class="sp-stats-viewport" id="sp-stats-viewport" tabindex="0" role="group" aria-label="Statistics cards. Use left and right arrow keys."><div class="sp-stats-track">
      ${cards.map(([label, value], i) => `<div class="sp-stat" role="group" aria-roledescription="slide" aria-label="${i + 1} of 6: ${label}"><span class="sp-stat-label">${label}</span><strong class="sp-stat-value">${value}</strong></div>`).join('')}
    </div></div>
  </section>`
}
export function setupSavedPlayerStats() {
  const viewport = document.getElementById('sp-stats-viewport')
  if (!viewport) return
  const update = () => {
    document.querySelector('[data-act="spStatsScroll"][data-d="-1"]').disabled =
      viewport.scrollLeft <= 1
    document.querySelector('[data-act="spStatsScroll"][data-d="1"]').disabled =
      viewport.scrollLeft >= viewport.scrollWidth - viewport.clientWidth - 1
  }
  viewport.addEventListener('scroll', update)
  viewport.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return
    event.preventDefault()
    scrollSavedPlayerStats(event.key === 'ArrowLeft' ? -1 : 1)
  })
  update()
}
export function scrollSavedPlayerStats(direction) {
  document.getElementById('sp-stats-viewport')?.scrollBy({
    left: direction * 236,
    behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
  })
}
export function viewPlayers() {
  if (S.licenseExpired) return viewAccess()
  const f = {
    band: 'all',
    city: 'all',
    added: 'any',
    status: 'all',
    live: 'all',
    ...(S.ui.spf || {}),
  }
  const live = liveSession()
  const liveOk = (p) => {
    if (f.live === 'all') return true
    const st = liveState(p.id)
    return (
      !!st &&
      (f.live === 'session' ||
        st.kind === f.live ||
        (f.live === 'waiting' && st.kind === 'oncourt'))
    )
  }
  const q = S.ui.search.trim().toLowerCase()
  const day = 864e5,
    now = Date.now()
  const age = (p) => now - addedAt(p)
  const addedOk = {
    any: () => true,
    7: (p) => age(p) <= 7 * day,
    30: (p) => age(p) <= 30 * day,
    90: (p) => age(p) <= 90 * day,
    older: (p) => age(p) > 90 * day,
  }
  const cities = [...new Set(S.players.map(regCity).filter(Boolean))].sort()
  const { sort: _sort, ...filters } = SP_FILTERS
  const opts = {
    ...filters,
    city: [
      'Registered in',
      [['all', 'Anywhere'], ...cities.map((c) => [c, c]), ['none', 'Not registered yet']],
    ],
  }
  const list = S.players
    .filter(
      (p) =>
        (!q ||
          p.name.toLowerCase().includes(q) ||
          (p.nick || '').toLowerCase().includes(q) ||
          (p.rtr || '').toLowerCase().includes(q)) &&
        (f.band === 'all' || bandOf(p) === f.band) &&
        (f.city === 'all' || (regCity(p) || 'none') === f.city) &&
        addedOk[f.added](p) &&
        (f.status === 'all' || regStatus(p) === f.status) &&
        liveOk(p),
    )
    .sort((a, b) => a.name.localeCompare(b.name))
  // Contacts-style grouping: one section per first letter, and an A–Z index that jumps to it.
  const letterOf = (p) => {
    const c = p.name.trim().charAt(0).toUpperCase()
    return /[A-Z]/.test(c) ? c : '#'
  }
  const groups = {}
  list.forEach((p) => {
    ;(groups[letterOf(p)] = groups[letterOf(p)] || []).push(p)
  })
  const letters = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', '#']
  const active = ['band', 'city', 'added', 'status', 'live'].filter(
    (k) => f[k] !== { band: 'all', city: 'all', added: 'any', status: 'all', live: 'all' }[k],
  ).length
  return `<main class="wrap">
    <div class="crumb"><button class="btn sm ghost" data-act="go" data-to="home">${I.back} Home</button></div>
    <div class="between"><div><h1>Saved players</h1><p class="muted small">${S.players.length} players this club has played with</p></div><button class="btn primary" data-act="openAddSaved">Add player</button></div>
    ${savedPlayerStats()}
    <div class="sp-tools-wrap"><div class="sp-tools">
      <label class="field sp-search"><span>Search</span><input class="input" id="saved-search" data-bind="ui.search" data-rerender placeholder="Name or nickname" value="${esc(S.ui.search)}"></label>
      ${Object.entries(opts)
        .map(
          ([k, [label, choices]]) =>
            `<label class="field"><span>${label}</span><select class="input" id="sp-${k}" data-act-change="spSet" data-k="${k}">${choices.map(([v, l]) => `<option value="${esc(v)}" ${String(f[k]) === v ? 'selected' : ''} ${k === 'live' && v !== 'all' && !live ? 'disabled' : ''}>${esc(l)}</option>`).join('')}</select></label>`,
        )
        .join('')}
    </div></div>
    <div class="between small"><span class="muted" aria-live="polite">Showing ${list.length} of ${S.players.length} · ${live ? `${esc(live.title)} is live` : 'No session is live right now'}</span>${active || q ? `<button class="btn xs ghost" data-act="spClear">Clear ${active ? `${active} filter${active > 1 ? 's' : ''}` : 'search'}</button>` : ''}</div>
    ${
      list.length
        ? `<div class="sp-body">
      <div class="sp-sections">${Object.keys(groups)
        .sort((a, b) => (a === '#') - (b === '#') || a.localeCompare(b))
        .map(
          (
            L,
          ) => `<section class="sp-sec" id="sp-${L === '#' ? 'num' : L}" aria-labelledby="sp-h-${L === '#' ? 'num' : L}">
        <h2 class="sp-letter" id="sp-h-${L === '#' ? 'num' : L}" tabindex="-1">${L}<span class="small muted">${groups[L].length}</span></h2>
        <div class="sp-grid">${groups[L].map(playerCard).join('')}</div></section>`,
        )
        .join('')}</div>
      <nav class="az" aria-label="Jump to letter">${letters.map((L) => `<button class="az-l" data-act="spJump" data-k="${L}" ${groups[L] ? '' : 'disabled'} aria-label="Jump to ${L === '#' ? 'other names' : L}">${L}</button>`).join('')}</nav>
    </div>`
        : `<div class="card empty">No saved players match these filters.${active || q ? ' <button class="btn xs" data-act="spClear">Clear filters</button>' : ''}</div>`
    }
  </main>`
}
function playerCard(p) {
  const status = regStatus(p) === 'guest' && p.identity === 'pending' ? 'pending' : regStatus(p)
  const band = p.sugg == null ? 0 : ['beginner', 'intermediate', 'advanced'].indexOf(bandOf(p)) + 1
  const sub = p.sugg == null ? 'No level yet' : lvLabel(p.sugg)
  const city = regCity(p)
  return `<article class="sp-card">
    <button class="sp-main" data-act="openProfile" data-id="${p.id}" aria-label="${esc(p.name)}, ${esc(sub)}, ${esc(IDENT[p.identity])}. Open profile">
      <span class="sp-av">${avatar(p, 'xl')}<i class="sp-dot ${status}" aria-hidden="true"></i></span>
      <span class="sp-name">${esc(p.name)}</span>
      ${p.nick ? `<span class="sp-nick">“${esc(p.nick)}”</span>` : '<span class="sp-nick">&nbsp;</span>'}
      <span class="sp-level"><span class="lvl-bars b${band}" aria-hidden="true"><i></i><i></i><i></i></span>${esc(sub)}</span>
      ${(() => {
        const st = liveState(p.id)
        return st && st.kind !== 'away'
          ? `<span class="sp-live ${st.kind}"><i aria-hidden="true"></i>${esc(st.text)}</span>`
          : ''
      })()}
    </button>
    <div class="sp-meta">
      <span>${I.pin}${city ? esc(city) : p.identity === 'pending' ? 'Lookup after sync' : 'Not registered'}</span>
      <span><b class="tnum">${p.prior}</b> session${p.prior === 1 ? '' : 's'} here</span>
      <span>Added ${fmtShortDate(addedAt(p))}</span>
    </div>
    <div class="sp-foot">${identChip(p)}${canInvite(p) ? `<button class="btn xs primary" data-act="openInvite" data-id="${p.id}">Invite</button>` : ''}</div>
  </article>`
}
const fmtShortDate = (t) =>
  new Date(t).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: new Date(t).getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  })
