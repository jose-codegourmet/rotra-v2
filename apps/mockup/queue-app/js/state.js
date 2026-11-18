import { render } from './render.js'
import { seedInventory } from './screens/financials.js'

// ---------- Domain constants (docs/screens/product/modules/queue) ----------
// Nine playing levels: Low, Mid and High within Beginner, Intermediate and Advanced. A level is its index here (0–8).
export const LEVEL_GROUPS = ['Beginner', 'Intermediate', 'Advanced']
export const LEVELS = []
LEVEL_GROUPS.forEach((band) =>
  ['Low', 'Mid', 'High'].forEach((t) => LEVELS.push({ band, label: `${band} ${t}` })),
)
// Older saves used a 36-step list (each of the nine split into I–V); fold those indices onto the nine levels.
const OLD_LEVEL_SIZES = [3, 3, 3, 4, 4, 4, 5, 5, 5]
export const oldToNewLevel = (i) => {
  let n = 0
  for (let k = 0; k < OLD_LEVEL_SIZES.length; k++) {
    n += OLD_LEVEL_SIZES[k]
    if (i < n) return k
  }
  return LEVELS.length - 1
}
export function migrateLevels() {
  if (S.lv9) return
  const m = (v) => (v == null || v === '' ? v : oldToNewLevel(+v))
  ;(S.players || []).forEach((p) => {
    p.sugg = m(p.sugg)
  })
  ;(S.sessions || []).forEach((x) => {
    ;(x.roster || []).forEach((r) => {
      r.level = m(r.level)
    })
    ;(x.waitlist || []).forEach((w) => {
      w.level = m(w.level)
    })
    ;(x.requests || []).forEach((q) => {
      if (q.level != null) q.level = m(q.level)
    })
  })
  S.ui.sheet = null
  S.lv9 = true
}
export const FORMATS = {
  singles: [1, 1],
  doubles: [2, 2],
  '1v2': [1, 2],
  '3v3': [3, 3],
  '4v4': [4, 4],
  '5v5': [5, 5],
}
export const FORMAT_LABEL = {
  singles: 'Singles',
  doubles: 'Doubles',
  '1v2': '1v2 fun',
  '3v3': '3v3 fun',
  '4v4': '4v4 fun',
  '5v5': '5v5 fun',
}
export const FUN = ['1v2', '3v3', '4v4', '5v5']
export const MODES = {
  chill: { label: 'Chill', text: 'Aims for roughly 30% easy games per player.' },
  fair: { label: 'Fair', text: 'Mainly level-matched games, roughly 10% easy games.' },
  hard: { label: 'Hard', text: 'Demanding runs, including 2–3 consecutive games.' },
}

// ---------- Seed data (fictional) ----------
export const IDENT = {
  registered: 'Registered',
  unclaimed: 'Unclaimed',
  guest: 'Guest',
  pending: 'Lookup pending',
}
export function seedPlayers() {
  const mk = (id, name, nick, identity, rtr, sugg, prior, base, phoneHidden) => ({
    id,
    name,
    nick,
    identity,
    rtr,
    sugg,
    prior,
    base,
    phoneHidden: !!phoneHidden,
    added: ['p18', 'p19', 'p20'].includes(id)
      ? Date.now()
      : Date.now() - (30 + Number(id.slice(1))) * 864e5,
  })
  return [
    mk('p1', 'Miguel Santos', 'Migs', 'registered', 'RTR-PH-CEB-031526-0001', 23, 6, 0.62, true),
    mk('p2', 'Bea Castillo', '', 'registered', 'RTR-PH-CEB-031526-0002', 19, 7, 0.55),
    mk('p3', 'Jomar dela Cruz', 'Jom', 'unclaimed', 'RTR-PH-CEB-040226-0007', 18, 5, 0.48),
    mk('p4', 'Kat Lim', '', 'registered', 'RTR-PH-CEB-040226-0011', 15, 8, 0.51, true),
    mk('p5', 'Enzo Navarro', '', 'registered', 'RTR-PH-MNL-050726-0014', 24, 6, 0.66),
    mk('p6', 'Joanna Tan', 'Jo', 'unclaimed', 'RTR-PH-CEB-050726-0019', 14, 2, null),
    mk('p7', 'Rafa Aquino', '', 'registered', 'RTR-PH-CEB-061126-0021', 20, 5, 0.58),
    mk('p8', 'Lia Bautista', '', 'guest', null, null, 1, null),
    mk('p9', 'Carlo Medina', '', 'registered', 'RTR-PH-CEB-061126-0025', 16, 6, 0.33),
    mk('p10', 'Nina Ocampo', '', 'unclaimed', 'RTR-PH-CEB-070926-0030', 13, 5, 0.45),
    mk('p11', 'Paulo Garcia', 'Pau', 'registered', 'RTR-PH-DVO-070926-0031', 21, 9, 0.6),
    mk('p12', 'Sam Villareal', '', 'guest', null, null, 3, null),
    mk('p13', 'Dani Rivera', '', 'registered', 'RTR-PH-CEB-081326-0040', 17, 5, 0.5),
    mk('p14', 'Theo Ramos', '', 'registered', 'RTR-PH-MNL-081326-0042', 25, 4, null),
    mk('p15', 'Ysa Fernandez', '', 'guest', null, null, 0, null),
    mk('p16', 'Marco Lopez', '', 'registered', 'RTR-PH-ILO-090226-0047', 15, 6, 0.72),
    mk('p17', 'Gab Torres', '', 'unclaimed', 'RTR-PH-CEB-090226-0050', 19, 1, null),
    mk('p18', 'Iya Mercado', '', 'registered', 'RTR-PH-CEB-091626-0055', 14, 5, 0.4),
    mk('p19', 'Kiko Salazar', '', 'guest', null, null, 6, 0.5),
    mk('p20', 'Andi Cruz', '', 'registered', 'RTR-PH-CEB-100726-0061', 11, 0, null),
    // Regulars who fill the example sessions (full house, over budget, waitlists).
    mk('p21', 'Rhea Villanueva', '', 'registered', 'RTR-PH-CEB-101426-0064', 16, 4, 0.52),
    mk('p22', 'Jun Alcantara', 'Jun', 'registered', 'RTR-PH-CEB-101426-0066', 22, 7, 0.61),
    mk('p23', 'Mika Soriano', '', 'unclaimed', 'RTR-PH-CEB-102126-0070', 12, 3, null),
    mk('p24', 'Bong Rosales', '', 'guest', null, null, 2, null),
    mk('p25', 'Cara Yap', '', 'registered', 'RTR-PH-CEB-102126-0073', 18, 6, 0.47),
    mk('p26', 'Nico Abella', '', 'registered', 'RTR-PH-MNL-102826-0077', 20, 5, 0.56),
    mk('p27', 'Tin Gonzaga', '', 'guest', null, null, 1, null),
    mk('p28', 'Arvin Uy', '', 'registered', 'RTR-PH-CEB-102826-0080', 24, 8, 0.64),
    mk('p29', 'Faye Dimaculangan', '', 'unclaimed', 'RTR-PH-DVO-110426-0083', 13, 2, null),
    mk('p30', 'Lance Ybañez', '', 'registered', 'RTR-PH-CEB-110426-0085', 17, 4, 0.5),
  ]
}
export const DIRECTORY = [
  {
    id: 'g1',
    name: 'Paolo Reyes',
    identity: 'registered',
    rtr: 'RTR-PH-MNL-020326-0112',
    sugg: 6,
    rank: 'Rank 214',
  },
  {
    id: 'g2',
    name: 'Trish Mendoza',
    identity: 'registered',
    rtr: 'RTR-PH-DVO-041926-0038',
    sugg: 5,
    rank: 'Rank 388',
  },
  {
    id: 'g3',
    name: 'Leo Pascual',
    identity: 'unclaimed',
    rtr: 'RTR-PH-CEB-052126-0016',
    sugg: 2,
    rank: 'Not ranked yet',
  },
  {
    id: 'g4',
    name: 'Marco Lim',
    identity: 'registered',
    rtr: 'RTR-PH-ILO-071226-0009',
    sugg: 4,
    rank: 'Rank 1,042',
  },
]

export function todayAt(h, m) {
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d.getTime()
}
function seedSessions() {
  const roster = [
    'p1',
    'p2',
    'p3',
    'p4',
    'p5',
    'p6',
    'p7',
    'p8',
    'p9',
    'p10',
    'p11',
    'p12',
    'p13',
    'p14',
  ]
  const levels = { p8: 10, p12: 12 }
  const sugg = Object.fromEntries(seedPlayers().map((p) => [p.id, p.sugg]))
  return [
    {
      id: 's-tonight',
      title: 'Sunday Night Queue',
      start: todayAt(18, 0),
      end: todayAt(21, 0),
      venue: 'Banilad Sports Hub',
      address: 'Gov. M. Cuenco Ave, Banilad, Cebu City',
      courts: [
        { id: 'c1', label: 'Court 1' },
        { id: 'c2', label: 'Court 2' },
        { id: 'c3', label: 'Court 3' },
      ],
      singles: false,
      doubles: true,
      mode: 'fair',
      minimum: 4,
      notes: 'Open play for club regulars and guests. Bring your own racket; shuttles provided.',
      status: 'prepared',
      download: 'none',
      roster: roster.map((pid, i) => ({
        pid,
        level: pid === 'p6' ? null : (levels[pid] ?? sugg[pid]),
        present: i < 10,
        locked: false,
      })),
      matches: [],
      seq: 0,
      published: null,
      finance: {
        courtFee: 350,
        entryFee: 60,
        custom: true,
        payFee: 900,
        shuttles: [
          { itemId: 'inv1', tubes: 4 },
          { itemId: 'inv2', tubes: 2 },
        ],
      },
    },
  ]
}
export const PAST = [
  {
    id: 'h1',
    title: 'Thursday Open Play',
    ago: 3,
    h: 19,
    len: 3,
    venue: 'Banilad Sports Hub',
    status: 'valid',
    games: 41,
    players: 18,
    results: 'Published',
  },
  {
    id: 'h2',
    title: 'Sunday Night Queue',
    ago: 7,
    h: 18,
    len: 3,
    venue: 'Banilad Sports Hub',
    status: 'valid',
    games: 33,
    players: 15,
    results: 'Private',
  },
  {
    id: 'h3',
    title: 'Tuesday Drills',
    ago: 12,
    h: 19,
    len: 2,
    venue: 'Lahug Covered Court',
    status: 'invalid',
    games: 0,
    players: 12,
    results: 'None',
    reason:
      'The original device was lost before its records synced, so this session could not be recorded.',
  },
]
PAST.forEach((x) => {
  const d = new Date()
  d.setDate(d.getDate() - x.ago)
  d.setHours(x.h, 0, 0, 0)
  x.start = d.getTime()
  const tm = (t) => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  x.when = `${d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} · ${tm(x.start)}–${tm(x.start + x.len * 3600e3)}`
})

// The club's saved venues. Picking one fills the session venue, address and court fee; new names are added here.
export function seedVenues() {
  return [
    {
      id: 'v1',
      name: 'Banilad Sports Hub',
      address: 'Gov. M. Cuenco Ave, Banilad, Cebu City',
      courtFee: 350,
    },
    {
      id: 'v2',
      name: 'Lahug Covered Court',
      address: 'Salinas Dr, Lahug, Cebu City',
      courtFee: 250,
    },
    {
      id: 'v3',
      name: 'Talamban Shuttle Courts',
      address: 'Talamban, Cebu City',
      courtFee: 300,
      entranceFee: 80,
    },
  ]
}
export function freshState() {
  return {
    v: 3,
    screen: 'login',
    online: true,
    syncing: false,
    pending: 0,
    lastSync: Date.now(),
    licenseExpired: false,
    club: {
      name: 'Lahug Smash Club',
      initials: 'LS',
      founding: 'Founded at Salinas Dr, Lahug, Cebu City',
      license: 'Yearly license · active until Mar 31, 2027',
      description:
        'Friendly open play for all levels in Lahug. Bring your racket; shuttles are on us.',
    },
    players: seedPlayers(),
    sessions: seedSessions(),
    inventory: seedInventory(),
    venues: seedVenues(),
    currentId: 's-tonight',
    ui: {
      sheet: null,
      pane: 'courts',
      slide: 0,
      pubTab: 'details',
      search: '',
      login: { user: 'lahug.smash', pass: '', show: false, err: '' },
      draft: null,
      errors: {},
    },
  }
}

const KEY = 'rotra-queue-prototype-v3'
export let S
export function setS(v) {
  S = v
}
try {
  S = JSON.parse(localStorage.getItem(KEY))
} catch (e) {
  S = null
}
if (!S || S.v !== 3) S = freshState()
S.ui.sheet = null
S.ui.courtMenu = null
S.syncing = false
S.ui.login.pending = false
if (S.screen === 'finalizing') S.screen = 'console'
migrateLevels()
// Older saves used entranceOn/entranceFee for the custom payment; the entrance fee is now a separate misc cost.
const oldFin = (f) => ({
  courtFee: f.courtFee ?? null,
  entryFee: null,
  custom: !!f.entranceOn,
  payFee: f.entranceOn ? f.entranceFee : null,
  shuttles: f.shuttles || [],
})
;(S.sessions || []).forEach((x) => {
  if (x.finance && 'entranceOn' in x.finance) x.finance = oldFin(x.finance)
})
if (S.ui.draft && 'entranceOn' in S.ui.draft) {
  const o = oldFin(S.ui.draft)
  Object.assign(S.ui.draft, { entryFee: '', custom: o.custom, payFee: o.payFee ?? '' })
  delete S.ui.draft.entranceOn
  delete S.ui.draft.entranceFee
}
export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(S))
  } catch (e) {
    /* storage unavailable: keep working in memory */
  }
}
// Light / dark: dark by default (or the device setting until the viewer picks one); the choice is remembered on this device.
// Left navigation: a rail beside every operator screen. The burger collapses it to icons on wide screens
// (remembered on this device) and opens it as a drawer on phones.
export const NAV_KEY = 'rotra-queue-nav'
export const narrowScreen = () => matchMedia('(max-width: 900px)').matches
export let navMin = false
try {
  navMin = localStorage.getItem(NAV_KEY) === 'min'
} catch (e) {
  /* follow default */
}
export function setNavMin(v) {
  navMin = v
}
export const THEME_KEY = 'rotra-queue-theme'
export const isDark = () => {
  const t = document.documentElement.dataset.theme
  return t
    ? t === 'dark'
    : getComputedStyle(document.documentElement).colorScheme.trim() !== 'light'
}
try {
  const t = localStorage.getItem(THEME_KEY)
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t
} catch (e) {
  /* no storage: follow the device */
}
// Keep the switch's icon right if the device setting changes while no choice has been made.
matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
  if (!document.documentElement.dataset.theme) render()
})
