import { taken } from './disruptions.ts'
import type { Engine } from './engine.ts'
import {
  allPlayers,
  canReplacePlayer,
  type Match,
  matchStatus,
  type SessionCourt,
  shortOnPlayers,
} from './rules.ts'
import type { SimPlugin } from './scenario.ts'

/**
 * Scenario-specific controls and their checks: courts added and removed mid-session, refusals,
 * the On court injury (lineup change, not a substitution), the injured player in waiting matches,
 * Short on players, overfill, bagging and the minimum's source. Failures go through `engine.fail`.
 */

const refused = (status: number) => status >= 400 && status < 500
const holds = (m: Match, courtId: string) =>
  (m.state === 'on_court' || m.state === 'active') && m.courtIds.includes(courtId)
const placedOn = (engine: Engine, courtId: string) =>
  engine.placements.filter((p) => p.courtId === courtId)

/**
 * Court added mid-session. `opensAt` (minutes) gives it a later planned start; `startAnywayAt`
 * opens it early (Start anyway); without either it is open now and Auto Queue fills it at once.
 */
export function addCourt(options: {
  at: number
  opensAt?: number
  startAnywayAt?: number
}): SimPlugin {
  let court: SessionCourt | undefined
  let openedEarlyAt: number | undefined
  return {
    name: 'add-court',
    plan: () => [
      {
        at: options.at,
        kind: 'court',
        label: 'Add court',
        apply: async (engine) => {
          court = await engine.api.addCourt(engine.sessionId, {
            // Live labels are unique; count removed courts too so the new label is free.
            label: `Court ${Math.max(0, ...engine.session.courts.map((c) => Number(c.label.replace(/\D/g, '')) || 0)) + 1}`,
            startsAt: options.opensAt === undefined ? null : engine.at(options.opensAt),
          })
          engine.log(
            `Add court ${court.label}` +
              (options.opensAt === undefined
                ? ' · open now'
                : ` · planned start t=${options.opensAt}`),
          )
          await engine.refresh()
          if (options.startAnywayAt !== undefined)
            engine.schedule({
              at: options.startAnywayAt,
              kind: 'court',
              label: 'Start anyway',
              apply: async (e) => {
                const opened = await e.api.openCourtEarly(e.sessionId, court?.id as string)
                openedEarlyAt = e.t
                e.check(
                  opened.openedEarlyAt !== null,
                  `${opened.label}: Start anyway did not open it`,
                )
                e.log(`${opened.label} Start anyway`)
                await e.refresh()
                return 'done'
              },
            })
          return 'done'
        },
      },
    ],
    afterStep: (engine) => {
      if (!court || options.opensAt === undefined || engine.t >= options.opensAt) return
      if (openedEarlyAt !== undefined) return
      const early = engine.queue.matches.find((m) => holds(m, court?.id as string))
      if (early)
        engine.fail(
          `#${early.matchNo} is on ${court.label} before its planned start t=${options.opensAt}`,
        )
    },
    finish: (engine) => {
      if (!court) return engine.fail('the court was never added')
      const placed = placedOn(engine, court.id)
      engine.check(placed.length > 0, `${court.label} never got a match`)
      const first = placed[0]
      if (!first) return
      if (options.startAnywayAt !== undefined)
        engine.check(
          first.t >= options.startAnywayAt && first.t < (options.opensAt ?? Infinity),
          `${court.label}: first match at t=${first.t}, expected right after Start anyway (t=${options.startAnywayAt})`,
        )
      else if (options.opensAt !== undefined)
        engine.check(
          first.t >= options.opensAt,
          `${court.label}: first match at t=${first.t}, before its planned start t=${options.opensAt}`,
        )
      else
        engine.check(
          first.t === options.at,
          `${court.label}: added open now at t=${options.at}, first match only at t=${first.t}`,
        )
    },
  }
}

/** A court with its own booking end (Open until): after it, Booking ended, but it keeps working. */
export function keepsWorkingAfterBooking(courtIndex: number, until: number): SimPlugin {
  return {
    name: 'open-until',
    finish: (engine) => {
      // Court N was created at index N-1 (the read's order is not the creation order).
      const court = engine.session.courts.find((c) => c.label === `Court ${courtIndex + 1}`)
      if (!court) return engine.fail('the Open until court is missing')
      engine.check(
        court.openUntil === engine.at(until),
        `${court.label} openUntil ${court.openUntil} is not t=${until}`,
      )
      const after = placedOn(engine, court.id).filter((p) => p.t >= until)
      engine.check(
        after.length > 0,
        `${court.label} got no match after its booking ended at t=${until}`,
      )
      engine.log(`${court.label} · ${after.length} matches after Booking ended`)
    },
  }
}

/**
 * Close a free court: the next result on a court is confirmed with that court left free
 * (Q-NEXT-MATCH), then the court is removed. Afterwards it never gets a match.
 */
export function removeFreeCourt(options: { at: number }): SimPlugin {
  let armed = false
  let target: string | undefined
  let removedAt: number | undefined
  return {
    name: 'remove-court',
    plan: () => [
      {
        at: options.at,
        kind: 'court',
        label: 'close a free court',
        apply: async (engine) => {
          if (engine.liveCourts().length <= 1) return 'skip'
          armed = true
          return 'done'
        },
      },
    ],
    holdCourt: (_engine, m) => {
      if (!armed || target) return undefined
      target = m.courtIds[0]
      return target
    },
    afterResult: async (engine) => {
      if (!armed || !target || removedAt !== undefined) return
      armed = false
      const reply = await engine.api.sendRemoveCourt(engine.sessionId, target)
      engine.check(
        reply.status < 300,
        `removing free ${engine.courtLabel(target)} refused: ${reply.status} ${JSON.stringify(reply.body)}`,
      )
      removedAt = engine.t
      await engine.refresh()
      const court = engine.session.courts.find((c) => c.id === target)
      engine.check(
        !court || court.removedAt !== null,
        `${engine.courtLabel(target)} is still live after removal`,
      )
      engine.log(`${engine.courtLabel(target)} removed (free)`)
    },
    finish: (engine) => {
      if (removedAt === undefined || !target) return engine.fail('no free court was removed')
      const later = placedOn(engine, target).filter((p) => p.t > (removedAt as number))
      engine.check(!later.length, `a match was placed on the removed court after t=${removedAt}`)
    },
  }
}

/** Closing a court with an On court match, then one with a Playing match, is refused. */
export function busyCourtRefused(options: { at: number }): SimPlugin {
  let onCourtChecked = false
  let playingChecked = false
  const checkRefusal = async (engine: Engine, courtId: string, what: string) => {
    const reply = await engine.api.sendRemoveCourt(engine.sessionId, courtId)
    engine.check(
      refused(reply.status),
      `closing ${engine.courtLabel(courtId)} with ${what} returned ${reply.status}`,
    )
    await engine.refresh()
    const court = engine.session.courts.find((c) => c.id === courtId)
    engine.check(
      !!court && court.removedAt === null,
      `${engine.courtLabel(courtId)} was removed while ${what}`,
    )
    engine.log(
      `closing ${engine.courtLabel(courtId)} with ${what} · refused ${reply.status} ${JSON.stringify(reply.body)}`,
    )
  }
  return {
    name: 'busy-court',
    beforeStart: async (engine, m) => {
      if (onCourtChecked || engine.t < options.at) return undefined
      onCourtChecked = true
      await checkRefusal(engine, m.courtIds[0] as string, `an On court match (#${m.matchNo})`)
      return undefined
    },
    plan: () => [
      {
        at: options.at,
        kind: 'court',
        label: 'close a busy court',
        apply: async (engine) => {
          const m = engine.playingMatches()[0]
          if (!m) return 'retry'
          playingChecked = true
          await checkRefusal(engine, m.courtIds[0] as string, `a Playing match (#${m.matchNo})`)
          return 'done'
        },
      },
    ],
    finish: (engine) => {
      engine.check(onCourtChecked, 'the On court refusal was never tried')
      engine.check(playingChecked, 'the Playing refusal was never tried')
    },
  }
}

/** Closing the last court is refused even when it is free; Auto Queue then refills it. */
export function lastCourtRefused(options: { at: number }): SimPlugin {
  let armed = false
  let tried = false
  return {
    name: 'last-court',
    plan: () => [
      {
        at: options.at,
        kind: 'court',
        label: 'close the last court',
        apply: async () => {
          armed = true
          return 'done'
        },
      },
    ],
    holdCourt: (_engine, m) => (armed && !tried ? m.courtIds[0] : undefined),
    afterResult: async (engine, m) => {
      if (!armed || tried) return
      tried = true
      armed = false
      const courtId = m.courtIds[0] as string
      engine.check(engine.liveCourts().length === 1, 'expected exactly one live court')
      const holder = engine.queue.matches.find((x) => holds(x, courtId))
      engine.check(!holder, `the last court is not free (#${holder?.matchNo})`)
      const reply = await engine.api.sendRemoveCourt(engine.sessionId, courtId)
      engine.check(refused(reply.status), `closing the last court returned ${reply.status}`)
      engine.check(
        JSON.stringify(reply.body).includes('At least one court must remain'),
        `closing the last court: unexpected reply ${JSON.stringify(reply.body)}`,
      )
      engine.log(`closing the last court · refused ${reply.status} ${JSON.stringify(reply.body)}`)
      const placed = await engine.api.fillOpenedCourts(engine.sessionId, [courtId])
      engine.log(`Skip for now · Auto Queue placed ${placed.length}`)
      await engine.refresh()
    },
    finish: (engine) => engine.check(tried, 'closing the last court was never tried'),
  }
}

/**
 * A player gets injured while their match is On court (placed, not started): Start match is
 * refused until the lineup is changed (Replace player), which is a lineup change, never a
 * substitution.
 */
export function injuryOnCourt(options: { at: number }): SimPlugin {
  let done = false
  return {
    name: 'injury-on-court',
    beforeStart: async (engine, m) => {
      if (done || engine.t < options.at) return undefined
      const out = allPlayers(m).find((id) => !taken(engine).has(id))
      if (!out) return undefined
      done = true
      taken(engine).add(out)
      await engine.setPresent(out, false, 'injured On court')
      const first = await engine.api.sendStart(engine.sessionId, m.id)
      engine.check(
        refused(first.status),
        `Start match #${m.matchNo} with an absent player returned ${first.status}`,
      )
      engine.log(`#${m.matchNo} Start match refused ${first.status} ${JSON.stringify(first.body)}`)
      await engine.refresh()
      const current = engine.match(m.id) as Match
      engine.check(
        matchStatus(current, engine.ctx()).kind === 'needs-attention',
        `#${m.matchNo} should need attention with ${engine.name(out)} not present`,
      )
      const incoming = engine
        .freePresent(allPlayers(current))
        .find((p) => canReplacePlayer(current, out, p.id, engine.ctx()))
      if (!incoming) {
        engine.fail(`no free present player to replace ${engine.name(out)} on #${m.matchNo}`)
        return false
      }
      const replaced = await engine.api.replace(engine.sessionId, m.id, out, incoming.id)
      engine.log(
        `#${m.matchNo} Replace player ${engine.name(incoming.id)} in for ${engine.name(out)} · lineup changed`,
      )
      engine.check(
        replaced.substitutions.length === 0,
        `#${m.matchNo} replace recorded a substitution`,
      )
      engine.check(
        allPlayers(replaced).includes(incoming.id) && !allPlayers(replaced).includes(out),
        `#${m.matchNo} lineup was not changed by Replace player`,
      )
      engine.check(
        replaced.state === 'on_court',
        `#${m.matchNo} is ${replaced.state} after Replace player`,
      )
      await engine.refresh()
      return true
    },
    finish: (engine) => engine.check(done, 'no On court match was there to injure a player in'),
  }
}

/**
 * An injured player in waiting matches: those matches need attention (Auto Queue skips them), then
 * Regenerate rebuilds them without the player.
 */
export function injuryInQueue(options: { at: number }): SimPlugin {
  let done = false
  return {
    name: 'injury-in-queue',
    plan: () => [
      {
        at: options.at,
        kind: 'injured',
        label: 'injured player in waiting matches',
        apply: async (engine) => {
          const waiting = engine.queue.matches.filter((m) => m.state === 'waiting')
          const candidates = waiting.flatMap((m) =>
            allPlayers(m).filter(
              (id) => !engine.busy(id) && !taken(engine).has(id) && engine.isPresent(id),
            ),
          )
          if (!candidates.length) return 'retry'
          const out = engine.rng.pick(candidates)
          taken(engine).add(out)
          await engine.setPresent(out, false, 'injured (waiting)')
          await engine.refresh()
          const affected = engine.queue.matches.filter(
            (m) => m.state === 'waiting' && allPlayers(m).includes(out),
          )
          for (const m of affected)
            engine.check(
              matchStatus(m, engine.ctx()).kind === 'needs-attention',
              `#${m.matchNo} with absent ${engine.name(out)} is ${matchStatus(m, engine.ctx()).kind}`,
            )
          engine.log(
            `${affected.map((m) => `#${m.matchNo}`).join(', ')} need attention · Regenerate`,
          )
          const { rebuilt } = await engine.api.regenerate(engine.sessionId, engine.queue)
          await engine.refresh()
          const still = engine.queue.matches.filter(
            (m) => m.state === 'waiting' && allPlayers(m).includes(out),
          )
          engine.check(
            !still.length,
            `after Regenerate ${engine.name(out)} is still in ${still.map((m) => `#${m.matchNo}`)}`,
          )
          for (const m of affected)
            engine.check(
              !engine.queue.matches.some(
                (x) => x.id === m.id && (x.state === 'on_court' || x.state === 'active'),
              ),
              `#${m.matchNo} needing attention was placed`,
            )
          engine.log(
            `Regenerate · ${rebuilt.length} rebuilt: ${rebuilt.map((m) => `#${m.matchNo} ${engine.lineupText(m)}`).join(' | ')}`,
          )
          done = true
          return 'done'
        },
      },
    ],
    finish: (engine) => engine.check(done, 'no waiting match was there to injure a player in'),
  }
}

/** Short on players: the banner rule over the app's own reads, plus the read's own counts. */
export function shortOnPlayersSeen(): SimPlugin {
  let seen = 0
  return {
    name: 'short-on-players',
    afterStep: (engine) => {
      if (engine.ended) return
      const banner = shortOnPlayers(engine.session.session, engine.ctx())
      if (banner) seen++
    },
    finish: (engine) => {
      engine.check(
        engine.session.presentCount < engine.session.capacity,
        `present ${engine.session.presentCount} is not below capacity ${engine.session.capacity}`,
      )
      engine.check(seen > 0, 'Short on players never showed on the reads')
      engine.log(`Short on players shown on ${seen} steps`)
    },
  }
}

/** Overfill (Add anyway): the roster is over the slot budget, and the minimum counts everyone. */
export function overfilled(expected: number): SimPlugin {
  return {
    name: 'overfill',
    finish: (engine) => {
      engine.check(
        engine.roster.length === expected,
        `roster ${engine.roster.length}, expected ${expected}`,
      )
      engine.check(
        engine.session.rosterCount > engine.session.capacity,
        `rosterCount ${engine.session.rosterCount} is not over capacity ${engine.session.capacity}`,
      )
    },
  }
}

/** Bagging mode: every doubles match with both partners (no substitution) has them on one team. */
export function baggingKept(): SimPlugin {
  return {
    name: 'bagging',
    finish: (engine) => {
      const pair = engine.bagging?.pairs[0]
      if (!pair) return engine.fail('no bagging pair')
      const together = engine.queue.matches.filter(
        (m) =>
          m.format === 'doubles' &&
          !m.substitutions.length &&
          allPlayers(m).includes(pair.a) &&
          allPlayers(m).includes(pair.b),
      )
      const split = together.filter((m) => m.teamA.includes(pair.a) !== m.teamA.includes(pair.b))
      engine.check(together.length > 0, 'the bagging pair never played together')
      engine.check(!split.length, `bagging pair split in ${split.map((m) => `#${m.matchNo}`)}`)
      engine.log(
        `bagging pair ${engine.name(pair.a)}+${engine.name(pair.b)} together in ${together.length} matches`,
      )
    },
  }
}

/** The minimum's source: calculated at Start, or the operator's number kept as set. */
export function minimumSource(
  expected: { calculated: true } | { calculated: false; value: number },
): SimPlugin {
  return {
    name: 'minimum-source',
    finish: (engine) => {
      const s = engine.session.session
      engine.check(
        s.minimumIsCalculated === expected.calculated,
        `minimumIsCalculated is ${s.minimumIsCalculated}`,
      )
      if (expected.calculated)
        engine.check(s.minimumGames > 0, `calculated minimum is ${s.minimumGames}`)
      else
        engine.check(
          s.minimumGames === expected.value,
          `operator minimum ${expected.value} became ${s.minimumGames}`,
        )
    },
  }
}
