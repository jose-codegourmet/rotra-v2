import { cur, openSlots, P, waitOf } from '../helpers.js'
import { MODES, S } from '../state.js'
import { fmtRange } from '../time.js'
import { peso } from './financials.js'
import { duePerHead } from './session-record.js'

// ---------- Club settings ----------
// ---------- Facebook announcement post ----------
// The club writes one template with {{ keys }}; each session fills it in. Unknown keys are left as typed.
const DEFAULT_POST = `@everyone

{{ club_name }} {{ day }} queue
{{ club_description }}

where: {{ where }}
when: {{ when }}

{{ x_courts }} courts:
{{ courts }}

{{ tube_count }} tubes and brand
{{ x_tubes }}

Players
{{ players }}

Waitlist:
{{ waitlist }}

{{ court_rules }}`
export const DEFAULT_RULES =
  'Court rules:\n• Non-marking shoes only\n• Be ready within 2 minutes when your match is called\n• Winner-only scoring is fine; tell the Queue Master the result'
export const POST_KEYS = [
  ['club_name', 'Club name'],
  ['club_description', 'Club description'],
  ['title', 'Session title'],
  ['day', 'Weekday, e.g. Sunday'],
  ['date', 'Date'],
  ['where', 'Venue and address'],
  ['when', 'Date and time'],
  ['x_courts', 'Courts reserved (number)'],
  ['courts', 'Court names, one per line'],
  ['tube_count', 'Total tubes'],
  ['x_tubes', 'Tubes per brand'],
  ['player_count', 'Number of players'],
  ['players', 'Numbered player list'],
  ['waitlist', 'Waitlist'],
  ['mode', 'Mode'],
  ['minimum', 'Minimum games'],
  ['fee_per_head', 'Payment per player'],
  ['entrance_fee', 'Entrance fee'],
  ['court_rules', 'Court rules'],
]
export const POST_TABS = [
  ['tpl', 'Template'],
  ['desc', 'Club description'],
  ['rules', 'Court rules'],
]
export const postTemplate = () => (S.club.postTemplate != null ? S.club.postTemplate : DEFAULT_POST)
function postValues(s) {
  const lines = ((s.finance && s.finance.shuttles) || [])
    .map((x) => ({ x, it: S.inventory.find((i) => i.id === x.itemId) }))
    .filter((l) => l.it)
  const tubes = lines.reduce((t, l) => t + (+l.x.tubes || 0), 0)
  const start = new Date(s.start)
  return {
    club_name: S.club.name,
    club_description: S.club.description != null ? S.club.description : '',
    title: s.title,
    day: start.toLocaleDateString([], { weekday: 'long' }),
    date: start.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }),
    where: `${s.venue}${s.address ? `, ${s.address}` : ''}`,
    when: `${start.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })} · ${fmtRange(s.start, s.end)}`,
    x_courts: String(s.courts.length),
    courts: s.courts.map((c) => c.label).join('\n'),
    court_count: String(s.courts.length), // older name for x_courts, still filled in
    tube_count: String(tubes),
    x_tubes: lines.length
      ? lines.map((l) => `${l.x.tubes} × ${l.it.name}`).join('\n')
      : 'To be announced',
    player_count: String(s.roster.length),
    players: s.roster.length
      ? s.roster
          .map((r, i) => {
            const p = P(r.pid)
            return `${i + 1}. ${p.name}${p.nick ? ` (${p.nick})` : ''}`
          })
          .join('\n')
      : 'No players yet',
    waitlist: (s.waitlist || []).length
      ? waitOf(s)
          .map((w, i) => `${i + 1}. ${P(w.pid).name}`)
          .join('\n')
      : `None yet. ${openSlots(s)} slot${openSlots(s) === 1 ? '' : 's'} left.`,
    mode: `${MODES[s.mode].label} (${MODES[s.mode].text.replace(/\.$/, '')})`,
    minimum: `${s.minimum} games per player`,
    fee_per_head: duePerHead(s) ? `${peso(duePerHead(s))} per head` : 'Free',
    entrance_fee:
      s.finance && s.finance.entryFee ? `${peso(s.finance.entryFee)} per head (included)` : 'None',
    court_rules: S.club.courtRules != null ? S.club.courtRules : DEFAULT_RULES,
  }
}
export const fillPost = (tpl, s) => {
  const v = postValues(s)
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => (k in v ? v[k] : m))
}
export const postSample = () =>
  cur() && !['invalid', 'finalized', 'cancelled'].includes(cur().status)
    ? cur()
    : S.sessions
        .filter((x) => x.status === 'prepared' || x.status === 'active')
        .sort((a, b) => a.start - b.start)[0] || S.sessions[0]
