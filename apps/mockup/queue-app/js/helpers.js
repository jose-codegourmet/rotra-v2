import { LEVELS, S } from './state.js'

// ---------- Helpers ----------
export const esc = (v) =>
  String(v ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  )
export const P = (id) => S.players.find((p) => p.id === id)
export const nm = (id) => {
  const p = P(id)
  return p ? p.name : 'Unknown'
}
export const short = (id) => {
  const p = P(id)
  return p ? p.nick || p.name.split(' ')[0] : '?'
}
export const initials = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')

// Sample profile pictures: illustrated faces for players with a ROTRA profile. Guests and a few profiles
// without an uploaded picture fall back to initials, as the public-page spec requires.
const NO_PHOTO = new Set(['p10', 'p17', 'p20'])
const hasPhoto = (p) =>
  (p.identity === 'registered' || p.identity === 'unclaimed') && !NO_PHOTO.has(p.id)
const SKIN = ['#f3cfae', '#e3b089', '#c98d62', '#ad7349', '#8c5836', '#f6dcc4']
const HAIR = ['#1b1817', '#2e211b', '#4a3021', '#6d4a2c', '#8f6b48', '#2a2a31']
const BACKDROP = [
  '#2f6f5e',
  '#3b4f8a',
  '#74488a',
  '#8a5a2f',
  '#2f6a85',
  '#7d3b4a',
  '#4d6b2f',
  '#5b4a8a',
]
const SHIRT = ['#00cc6a', '#e6e6ec', '#ffb800', '#4a90e2', '#ff6b6b', '#9b6bff', '#24242a']
export function hashStr(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
function faceSVG(p) {
  const h = hashStr(p.id + p.name)
  const pick = (arr, k) => arr[(h >>> k) % arr.length]
  const skin = pick(SKIN, 0),
    hair = pick(HAIR, 3),
    bg = pick(BACKDROP, 6),
    shirt = pick(SHIRT, 9)
  const style = (h >>> 12) % 5,
    glasses = (h >>> 16) % 5 === 0
  const front = [
    'M19 27C19 12 45 12 45 27C41 19 23 19 19 27Z',
    'M18 29C16 11 45 9 46 26C40 17 31 22 22 19C21 22 19 25 18 29Z',
    'M19 26C21 14 43 14 45 26C38 19 26 19 19 26Z',
    'M19 27C19 13 45 13 45 27C41 20 23 20 19 27Z',
    'M20 24C21 15 43 15 44 24C38 20 26 20 20 24Z',
  ][style]
  return `<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" fill="${bg}"/>
    ${style === 2 ? `<path d="M17 26C17 9 47 9 47 26L48 47C44 49 40 45 41 37H23C24 45 20 49 16 47Z" fill="${hair}"/>` : ''}
    ${style === 3 ? `<circle cx="32" cy="10" r="6" fill="${hair}"/>` : ''}
    <path d="M7 64C9 49 21 44 32 44S55 49 57 64Z" fill="${shirt}"/>
    <rect x="27" y="37" width="10" height="9" rx="3" fill="${skin}"/>
    <ellipse cx="19.5" cy="29" rx="2.4" ry="3.2" fill="${skin}"/><ellipse cx="44.5" cy="29" rx="2.4" ry="3.2" fill="${skin}"/>
    <ellipse cx="32" cy="28" rx="12.5" ry="14.5" fill="${skin}"/>
    <path d="${front}" fill="${hair}" ${style === 4 ? 'opacity=".85"' : ''}/>
    <path d="M25 25.5h4M35 25.5h4" stroke="${hair}" stroke-width="1.5" stroke-linecap="round"/>
    <circle cx="27" cy="29.5" r="1.6" fill="#1b1817"/><circle cx="37" cy="29.5" r="1.6" fill="#1b1817"/>
    <path d="M27.5 35.5Q32 39 36.5 35.5" fill="none" stroke="#7a3e2e" stroke-width="1.6" stroke-linecap="round"/>
    ${glasses ? '<g fill="none" stroke="#1b1817" stroke-width="1.3"><circle cx="27" cy="29.5" r="4"/><circle cx="37" cy="29.5" r="4"/><path d="M31 29.5h2"/></g>' : ''}
  </svg>`
}
export const avatar = (p, cls = '') =>
  hasPhoto(p)
    ? `<span class="avatar photo ${cls}" role="img" aria-label="Profile picture of ${esc(p.name)}">${faceSVG(p)}</span>`
    : `<span class="avatar ${cls}" aria-hidden="true">${esc(initials(p.name))}</span>`
export const cur = () => S.sessions.find((s) => s.id === S.currentId)
// Slot budget: players per reserved court × courts. Players added past it wait in a first-come waitlist
// (kept apart from the roster) until the operator gives them a slot.
export const perCourtOf = (s) => s.perCourt || S.club.perCourt || 8
export const capacityOf = (s) => s.courts.length * perCourtOf(s)
export const waitOf = (s) => (s.waitlist || []).slice().sort((a, b) => a.at - b.at)
export const openSlots = (s) => Math.max(0, capacityOf(s) - s.roster.length)
// First come, first served when a prepared session's slot budget changes: if it shrinks, the most recently
// added players move to the front of the waitlist in the order they joined; if it grows, the front of the waitlist fills the new slots.
export function rebalanceSlots(s) {
  const cap = capacityOf(s)
  if (s.roster.length > cap) {
    const out = s.roster.slice(cap)
    const first = Math.min(Date.now(), ...(s.waitlist || []).map((w) => w.at))
    s.roster = s.roster.slice(0, cap)
    s.waitlist = [
      ...out.map((r, i) => ({ pid: r.pid, level: r.level, at: first - (out.length - i) })),
      ...(s.waitlist || []),
    ]
    return { moved: out.length, filled: 0 }
  }
  const take = waitOf(s).slice(0, openSlots(s))
  take.forEach((w) => {
    s.roster.push({
      pid: w.pid,
      level: w.level,
      present: false,
      locked: false,
      presentAt: Date.now(),
    })
  })
  s.waitlist = (s.waitlist || []).filter((w) => !take.includes(w))
  return { moved: 0, filled: take.length }
}
export const lvLabel = (i) => (i == null ? 'No level' : LEVELS[i].label)
export const fmtTime = (t) =>
  new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
export const fmtDate = (t) =>
  new Date(t).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
export const fmtDur = (a, b) => {
  let m = Math.round((b - a) / 60000)
  if (m <= 0) m += 1440
  return `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}`
}
export const listNames = (ids) => {
  const n = ids.map(short)
  return n.length <= 1 ? n.join('') : `${n.slice(0, -1).join(', ')} and ${n[n.length - 1]}`
}
export const R = (s, pid) => s.roster.find((r) => r.pid === pid)
export const all = (m) => m.teamA.concat(m.teamB)
export const waiting = (s) =>
  s.matches.filter((m) => m.status === 'waiting').sort((a, b) => a.pos - b.pos)
// Match steps: waiting (in the queue) → oncourt (On court, getting ready, not started) → active (Playing) → done / invalid.
export const active = (s) => s.matches.filter((m) => m.status === 'active')
const activeOf = (s, pid) => active(s).find((m) => all(m).includes(pid))
export const onCourt = (s) => s.matches.filter((m) => m.status === 'oncourt')
// Matches holding a court: On court and Playing. Their players are busy everywhere else.
export const courtMatches = (s) =>
  s.matches.filter((m) => m.status === 'oncourt' || m.status === 'active')
export const busyOf = (s, pid, except) =>
  courtMatches(s).find((m) => m !== except && all(m).includes(pid))
export const busyText = (s, m) =>
  m.status === 'oncourt' ? `on ${courtsOf(s, m)}` : `playing on ${courtsOf(s, m)}`
export const courtFill = (s) => (s.courtFill === 'auto' ? 'auto' : 'manual')
const partialSet = (m) => new Set((m.subs || []).flatMap((x) => [x.out, x.in]))
// Substitution game credit (QM choice): the credited player counts as a full participant for this session only.
const creditedOf = (m) => {
  const out = new Map()
  ;(m.subs || []).forEach((x) => {
    if (x.credit === 'in') out.set(x.in, x.team)
    if (x.credit === 'out') out.set(x.out, x.team)
  })
  return out
}
export const sideOf = (m, pid) =>
  m.teamA.includes(pid) && !partialSet(m).has(pid)
    ? 'A'
    : m.teamB.includes(pid) && !partialSet(m).has(pid)
      ? 'B'
      : creditedOf(m).get(pid) || null
export const counted = (m, pid) =>
  m.status === 'done' &&
  ((all(m).includes(pid) && !partialSet(m).has(pid)) || creditedOf(m).has(pid))
export const subLine = (x, m) => {
  const who =
    m && m.status === 'invalid'
      ? null
      : x.credit === 'in'
        ? x.in
        : x.credit === 'out'
          ? x.out
          : null
  return `${nm(x.in)} replaced ${nm(x.out)} · ${who ? `${nm(who)} got the game (QM choice)` : 'Neither gets credit for this game'}`
}
export const gamesOf = (s, pid) => s.matches.filter((m) => counted(m, pid)).length
export const queuedCount = (s, pid) => waiting(s).filter((m) => all(m).includes(pid)).length
export const courtLabel = (s, id) => (s.courts.find((c) => c.id === id) || {}).label || 'Court'
// A court is open from its planned start, or from when the Queue Master opened it early (Start anyway).
export const courtOpen = (s, c) => !!c.openedEarlyAt || courtStart(s, c) <= Date.now()
export const openedEarly = (s, c) => !!c.openedEarlyAt && courtStart(s, c) > Date.now()
export const freeCourts = (s) =>
  s.courts.filter((c) => courtOpen(s, c) && !courtMatches(s).some((m) => m.courts.includes(c.id)))
export const courtsNeeded = (m) => (m.format === '5v5' ? 2 : 1)
export const courtsOf = (s, m) => m.courts.map((c) => courtLabel(s, c)).join(' + ')
export const courtUntil = (s, c) => c.until || s.end
export const sessionCourtStart = (s) => s.startedAt || s.start
export const courtStart = (s, c) => c.startsAt || sessionCourtStart(s)
export const hhmm = (t) => {
  const d = new Date(t)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
