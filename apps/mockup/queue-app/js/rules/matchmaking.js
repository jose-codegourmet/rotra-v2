import { gamesOf, queuedCount, R } from '../helpers.js'

// ---------- Matchmaking (prototype heuristics) ----------
export function splitTeams(s, pick, fmt) {
  if (fmt === 'singles') return { teamA: [pick[0]], teamB: [pick[1]] }
  const lv = (p) => (R(s, p).level != null ? R(s, p).level : 4)
  const opts = [
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
    .map(([a, b]) => {
      const A = a.map((i) => pick[i]),
        B = b.map((i) => pick[i])
      return {
        A,
        B,
        diff: Math.abs(A.reduce((t, p) => t + lv(p), 0) - B.reduce((t, p) => t + lv(p), 0)),
      }
    })
    .sort((x, y) => x.diff - y.diff)
  const easy =
    s.mode === 'chill' ? Math.random() < 0.3 : s.mode === 'fair' ? Math.random() < 0.1 : false
  const o = easy ? opts[opts.length - 1] : opts[0]
  return { teamA: o.A, teamB: o.B }
}
export function generate(s, n) {
  const present = s.roster.filter((r) => r.present).map((r) => r.pid)
  const fmts = [...(s.doubles ? ['doubles'] : []), ...(s.singles ? ['singles'] : [])]
  if (!fmts.length)
    return {
      error:
        'Singles and doubles are both off for this session, so there is nothing to generate. Add a fun game manually instead.',
    }
  const load = {}
  present.forEach((p) => {
    load[p] =
      gamesOf(s, p) + (s.mode === 'hard' ? 0 : 0.9 * queuedCount(s, p)) + Math.random() * 0.4
  })
  const out = []
  for (let i = 0; i < n; i++) {
    const fmt =
      fmts.length === 2 ? (present.length >= 4 && i % 3 !== 2 ? 'doubles' : 'singles') : fmts[0]
    const size = fmt === 'doubles' ? 4 : 2
    if (present.length < size) {
      if (!out.length)
        return {
          error: `Only ${present.length} player${present.length === 1 ? ' is' : 's are'} present. ${fmt === 'doubles' ? 'Doubles' : 'Singles'} needs ${size}. Mark arrivals present in Players.`,
        }
      break
    }
    const pick = present
      .slice()
      .sort((a, b) => load[a] - load[b])
      .slice(0, size)
    out.push({ format: fmt, ...splitTeams(s, pick, fmt) })
    pick.forEach((p) => {
      load[p] += 1
    })
  }
  return { matches: out }
}
export function addMatch(s, m, origin, prot, pos) {
  s.seq += 1
  const maxPos = Math.max(0, ...s.matches.map((x) => x.pos || 0))
  const rec = {
    id: `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
    seq: s.seq,
    format: m.format,
    teamA: m.teamA.slice(),
    teamB: m.teamB.slice(),
    status: 'waiting',
    origin,
    protected: prot,
    courts: [],
    subs: [],
    pos: pos ?? maxPos + 1,
  }
  s.matches.push(rec)
  return rec
}
