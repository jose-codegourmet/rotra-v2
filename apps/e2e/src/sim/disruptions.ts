import type { Engine } from './engine.ts'
import { allPlayers, type Match, type SubstitutionCredit } from './rules.ts'
import type { SimEvent, SimPlugin } from './scenario.ts'

/**
 * Disruptions, mapped to the controls the Queue Master really has (there is no injured, tired or
 * eating status): Present on/off, substitution with credit, Match done / invalid. Each returns a
 * plugin whose events the engine schedules on its virtual timeline.
 */

type Range = readonly [number, number]
const between = (engine: Engine, [lo, hi]: Range) => lo + engine.rng.next() * (hi - lo)
const count = (engine: Engine, fraction: Range) =>
  Math.max(1, Math.round(engine.roster.length * between(engine, fraction)))
const minuteIn = (engine: Engine, [from, to]: Range) =>
  engine.rng.int(Math.max(1, Math.ceil(from)), Math.max(1, Math.floor(to)))

const presenceEvent = (at: number, id: string, present: boolean, why: string): SimEvent => ({
  at,
  kind: why,
  label: `${present ? 'back' : 'away'} ${id.slice(0, 6)}`,
  apply: async (engine) => {
    if (engine.isPresent(id) === present) return 'done'
    await engine.setPresent(id, present, why)
    return 'done'
  },
})

/** Players already used by another disruption of this run keep their story simple. */
const used = new WeakMap<Engine, Set<string>>()
export const taken = (engine: Engine) => {
  let set = used.get(engine)
  if (!set) {
    set = new Set()
    used.set(engine, set)
  }
  return set
}
const freeToPick = (engine: Engine, ids: string[]) => ids.filter((id) => !taken(engine).has(id))

/** Late: not Present at Start, Present on at arrival. */
export function late(options: {
  fraction?: Range
  minutes: Range
  /** Exact players (roster index) instead of a fraction. */
  players?: number[]
}): SimPlugin {
  const arrivals: { id: string; at: number }[] = []
  return {
    name: 'late',
    prepare: async (engine) => {
      const ids = options.players
        ? options.players.map((i) => engine.roster[i]?.id as string)
        : engine.rng.sample(
            freeToPick(
              engine,
              engine.roster.map((p) => p.id),
            ),
            count(engine, options.fraction ?? [0.1, 0.3]),
          )
      for (const id of ids) {
        taken(engine).add(id)
        arrivals.push({ id, at: minuteIn(engine, options.minutes) })
        await engine.setPresent(id, false, 'late')
      }
    },
    plan: () => arrivals.map((a) => presenceEvent(a.at, a.id, true, 'arrived')),
  }
}

/** Out of a Playing match: substitution, then (injury) Present off. */
async function substitution(
  engine: Engine,
  credit: SubstitutionCredit,
  injury: { returnChance: number; returnAfter: Range } | null,
): Promise<'done' | 'retry'> {
  const matches = engine
    .playingMatches()
    .filter((m) => !engine.subs.some((s) => s.matchId === m.id))
    .filter((m) => (engine.playingEnd(m.id) ?? 0) > engine.t)
  const options = matches.flatMap((m) =>
    freeToPick(engine, allPlayers(m)).map((out) => ({ m, out })),
  )
  const incoming = (m: Match) => engine.freePresent(allPlayers(m))
  const usable = options.filter((o) => incoming(o.m).length)
  if (!usable.length) return 'retry'
  const { m, out } = engine.rng.pick(usable)
  const inId = engine.rng.pick(incoming(m)).id
  taken(engine).add(out)
  await engine.substitute(m, out, inId, credit)
  if (injury) {
    await engine.setPresent(out, false, 'injured')
    if (engine.rng.chance(injury.returnChance)) {
      const back = engine.t + engine.rng.int(injury.returnAfter[0], injury.returnAfter[1])
      engine.schedule(presenceEvent(back, out, true, 'back from injury'))
    }
  }
  return 'done'
}

/** Injured during a Playing match: substitution with credit Nobody, then Present off. */
export function injured(options: {
  fraction?: Range
  count?: number
  window: Range
  returnChance?: number
}): SimPlugin {
  return {
    name: 'injured',
    plan: (engine) =>
      Array.from(
        { length: options.count ?? count(engine, options.fraction ?? [0.01, 0.1]) },
        () => ({
          at: minuteIn(engine, options.window),
          kind: 'injured',
          label: 'injury in a Playing match',
          apply: (e) =>
            substitution(e, 'none', {
              returnChance: options.returnChance ?? 0.1,
              returnAfter: [20, 60],
            }),
        }),
      ),
  }
}

/** Subbed (not an injury): substitution in a Playing match, rotating who gets the game. */
export function subbed(options: {
  fraction?: Range
  count?: number
  window: Range
  credits?: SubstitutionCredit[]
}): SimPlugin {
  const credits = options.credits ?? ['none', 'incoming', 'outgoing']
  return {
    name: 'subbed',
    plan: (engine) =>
      Array.from(
        { length: options.count ?? count(engine, options.fraction ?? [0.01, 0.1]) },
        (_, i) => ({
          at: minuteIn(engine, options.window),
          kind: 'subbed',
          label: `substitution · credit ${credits[i % credits.length]}`,
          apply: (e) => substitution(e, credits[i % credits.length] as SubstitutionCredit, null),
        }),
      ),
  }
}

/**
 * Tired: only when the roster is below the slot budget. Present off right after their Match done,
 * back after 10–30 min.
 */
export function tired(options: { fraction?: Range; window: Range; back?: Range }): SimPlugin {
  const armed = new Set<string>()
  return {
    name: 'tired',
    plan: (engine) => {
      const budget = engine.liveCourts().length * engine.session.session.playersPerCourt
      if (engine.roster.length >= budget) {
        engine.log(
          `tired: skipped, roster ${engine.roster.length} is not below the budget ${budget}`,
        )
        return []
      }
      const ids = engine.rng.sample(
        freeToPick(
          engine,
          engine.roster.map((p) => p.id),
        ),
        count(engine, options.fraction ?? [0.01, 0.15]),
      )
      return ids.map((id) => {
        taken(engine).add(id)
        return {
          at: minuteIn(engine, options.window),
          kind: 'tired',
          label: `tired after the next game ${id.slice(0, 6)}`,
          apply: async () => {
            armed.add(id)
            return 'done' as const
          },
        }
      })
    },
    afterResult: async (engine, m) => {
      for (const id of allPlayers(m).filter((x) => armed.has(x))) {
        armed.delete(id)
        await engine.setPresent(id, false, 'tired')
        const [lo, hi] = options.back ?? [10, 30]
        engine.schedule(presenceEvent(engine.t + engine.rng.int(lo, hi), id, true, 'rested'))
      }
    },
  }
}

/** Eating: Present off mid-session for a while (only when not on court), then back. */
export function eating(options: {
  count?: Range
  durations?: number[]
  duration?: Range
  window?: Range
  players?: number[]
  at?: number
}): SimPlugin {
  return {
    name: 'eating',
    plan: (engine) => {
      const n =
        options.players?.length ??
        options.durations?.length ??
        engine.rng.int(...(options.count ?? [1, 3]))
      const ids = options.players
        ? options.players.map((i) => engine.roster[i]?.id as string)
        : engine.rng.sample(
            freeToPick(
              engine,
              engine.roster.map((p) => p.id),
            ),
            n,
          )
      return ids.map((id, i) => {
        taken(engine).add(id)
        const length = options.durations?.[i] ?? engine.rng.int(...(options.duration ?? [10, 90]))
        const at =
          options.at ??
          minuteIn(
            engine,
            options.window ?? [20, Math.max(21, engine.sessionMinutes - length - 10)],
          )
        return {
          at,
          kind: 'eating',
          label: `eating ${length} min ${id.slice(0, 6)}`,
          apply: async (e: Engine) => {
            if (!e.isPresent(id)) return 'retry' as const
            if (e.busy(id)) return 'retry' as const
            await e.setPresent(id, false, `eating ${length} min`)
            e.schedule(presenceEvent(e.t + length, id, true, 'back from eating'))
            return 'done' as const
          },
        }
      })
    },
  }
}

/** Mark invalid instead of Match done on the first match that finishes after each chosen minute. */
export function invalidMatches(options: { count: number; window: Range }): SimPlugin {
  let pending = 0
  return {
    name: 'invalid',
    plan: (engine) =>
      Array.from({ length: options.count }, () => ({
        at: minuteIn(engine, options.window),
        kind: 'invalid',
        label: 'next finished match is invalid',
        apply: async () => {
          pending++
          return 'done' as const
        },
      })),
    decide: () => {
      if (!pending) return undefined
      pending--
      return 'invalid'
    },
  }
}
