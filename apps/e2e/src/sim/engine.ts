import { readAccounts } from '../accounts.ts'
import { ApiError } from '../api/client.ts'
import { readClock, setClock } from '../clock.ts'
import type { DoneReview, QueueMasterApi, QueueRead, SessionRead, StandingRow } from './api.ts'
import { createRng, type Rng } from './prng.ts'
import {
  type AutoQueueMode,
  activeMatchFor,
  allPlayers,
  autoQueueDraftConflict,
  type BaggingSettings,
  courtOpen,
  generateAutoQueueMatches,
  type Match,
  type MatchContext,
  matchStatus,
  type PlayingLevel,
  type SessionPlayer,
  type SubstitutionCredit,
} from './rules.ts'
import { type SimConfig, type SimEvent, type SimPlugin, STRATEGIES } from './scenario.ts'

const MINUTE = 60_000
const LEVELS: PlayingLevel[] = [
  'beginner_high',
  'intermediate_low',
  'intermediate_mid',
  'intermediate_high',
  'advanced_low',
]
const sleep = (msec: number) => new Promise((resolve) => setTimeout(resolve, msec))

export type SubRecord = {
  t: number
  matchId: string
  outId: string
  inId: string
  credit: SubstitutionCredit
}
export type Decided = {
  t: number
  matchId: string
  matchNo: number
  kind: 'completed' | 'invalid'
  /** The lineup as the match finished (after substitutions and lineup changes). */
  lineup: string[]
}
type Interval = { from: number; to: number | null }

/**
 * One simulated Queue Session through the real Route Handlers. The Queue Master's routine each
 * step: Match done on matches whose time is up, the step's disruption events, Auto Queue for
 * courts that just reached their planned start, keep the Main Queue topped up with Generate
 * matches (+ Add to Main Queue), then Start match on every On court match. Auto Queue places on
 * the server; Start match is never automatic. Virtual minutes run from the planned start and move
 * every app server clock forward (never back).
 */
export class Engine {
  readonly cfg: SimConfig
  readonly api: QueueMasterApi
  readonly rng: Rng
  readonly mode: AutoQueueMode
  sessionId = ''
  startAt = 0
  endAt = 0
  sessionMinutes = 0
  /** Virtual minutes since the planned start. */
  t = 0
  session!: SessionRead
  roster: SessionPlayer[] = []
  queue!: QueueRead
  bagging?: BaggingSettings
  readonly names = new Map<string, string>()
  readonly presence = new Map<string, Interval[]>()
  readonly playing = new Map<string, number>()
  readonly decided: Decided[] = []
  readonly subs: SubRecord[] = []
  readonly placements: { matchId: string; courtId: string; t: number }[] = []
  readonly failures: string[] = []
  readonly lines: string[] = []
  private events: SimEvent[] = []
  private readonly seenPlaced = new Set<string>()
  private readonly notifiedCourts = new Set<string>()
  private lastSet = { virtual: 0, real: 0 }
  private finished = false
  review?: DoneReview
  standings?: StandingRow[]

  constructor(cfg: SimConfig, api: QueueMasterApi) {
    this.cfg = cfg
    this.api = api
    this.rng = createRng(cfg.seed)
    this.mode = STRATEGIES[cfg.strategy]
  }

  get plugins(): SimPlugin[] {
    return this.cfg.plugins ?? []
  }
  get ended() {
    return this.t >= this.sessionMinutes
  }
  /** The server's virtual now (it keeps ticking in real time after each set). */
  serverNow() {
    return this.lastSet.virtual + (Date.now() - this.lastSet.real)
  }
  minuteOf(ms: number) {
    return (ms - this.startAt) / MINUTE
  }
  at(minute: number) {
    return this.startAt + minute * MINUTE
  }
  ctx(): MatchContext {
    return {
      roster: this.roster,
      matches: this.queue.matches,
      courts: this.session.courts,
      now: this.serverNow(),
    }
  }
  name(id: string) {
    return this.names.get(id) ?? id.slice(0, 8)
  }
  log(text: string) {
    this.lines.push(`t=${String(Math.round(this.t)).padStart(3, '0')} ${text}`)
  }
  fail(text: string) {
    this.failures.push(text)
    this.log(`FAIL ${text}`)
  }
  check(ok: boolean, text: string) {
    if (!ok) this.fail(text)
  }
  lineupText(m: Pick<Match, 'teamA' | 'teamB'>) {
    const n = (ids: string[]) => ids.map((id) => this.name(id)).join('+')
    return `${n(m.teamA)} v ${n(m.teamB)}`
  }
  courtLabel(id: string) {
    return this.session.courts.find((c) => c.id === id)?.label ?? id.slice(0, 6)
  }
  liveCourts() {
    return this.session.courts.filter((c) => !c.removedAt)
  }
  openCourts() {
    const now = this.serverNow()
    return this.liveCourts().filter((c) => courtOpen(c, now))
  }
  busy(id: string) {
    return !!activeMatchFor(id, this.queue.matches)
  }
  isPresent(id: string) {
    return !!this.roster.find((p) => p.id === id)?.present
  }
  match(id: string) {
    return this.queue.matches.find((m) => m.id === id)
  }
  playingMatches() {
    return this.queue.matches.filter((m) => m.state === 'active')
  }
  /** The virtual minute this run will confirm a Playing match's result. */
  playingEnd(matchId: string) {
    return this.playing.get(matchId)
  }

  // ---------- Clock ----------

  private async setVirtual(target: number) {
    const now = this.lastSet.virtual ? this.serverNow() : (await readClock('queue')).nowMs
    if (target <= now + 250) return
    await setClock(target)
    this.lastSet = { virtual: target, real: Date.now() }
  }
  async advanceTo(minute: number) {
    if (minute < this.t) return
    this.t = minute
    await this.setVirtual(this.at(minute))
  }

  // ---------- Reads ----------

  async refresh() {
    const [session, roster, queue] = await Promise.all([
      this.api.readSession(this.sessionId),
      this.api.readRoster(this.sessionId),
      this.api.readQueue(this.sessionId),
    ])
    this.session = session
    this.roster = roster
    this.queue = queue
    for (const m of queue.matches)
      if ((m.state === 'on_court' || m.state === 'active') && !this.seenPlaced.has(m.id)) {
        this.seenPlaced.add(m.id)
        for (const courtId of m.courtIds)
          this.placements.push({ matchId: m.id, courtId, t: this.t })
      }
  }

  // ---------- Presence ----------

  private track(id: string, present: boolean) {
    const list = this.presence.get(id) ?? []
    const open = list.at(-1)
    if (present && (!open || open.to !== null)) list.push({ from: this.t, to: null })
    if (!present && open && open.to === null) open.to = this.t
    this.presence.set(id, list)
  }
  async setPresent(id: string, present: boolean, why: string) {
    await this.api.setPresence(this.sessionId, [{ rosterId: id, present }])
    this.track(id, present)
    this.log(`${this.name(id)} Present ${present ? 'on' : 'off'} (${why})`)
  }
  /** Virtual minutes with Present on inside the planned window. */
  minutesPresent(id: string) {
    const end = this.sessionMinutes
    return (this.presence.get(id) ?? []).reduce(
      (sum, i) => sum + Math.max(0, Math.min(i.to ?? end, end) - Math.max(i.from, 0)),
      0,
    )
  }
  /** Present from the start to the end with no gap. */
  presentWholeSession(id: string) {
    const list = this.presence.get(id) ?? []
    return list.length === 1 && list[0]?.from === 0 && list[0].to === null
  }

  // ---------- Commands the events use ----------

  schedule(event: SimEvent) {
    this.events.push(event)
    this.events.sort((a, b) => a.at - b.at)
  }

  /** In-game substitution on a Playing match, with who gets this game. */
  async substitute(m: Match, outId: string, inId: string, credit: SubstitutionCredit) {
    await this.api.substitute(this.sessionId, m.id, outId, inId, credit)
    this.subs.push({ t: this.t, matchId: m.id, outId, inId, credit })
    this.log(
      `#${m.matchNo} substitution ${this.name(inId)} in for ${this.name(outId)} · credit ${credit}`,
    )
    await this.refresh()
  }

  /** Present, free players who are not in this match (the app's substitution candidates). */
  freePresent(exclude: string[] = []) {
    return this.roster.filter((p) => p.present && !this.busy(p.id) && !exclude.includes(p.id))
  }

  // ---------- Setup ----------

  async setup() {
    const { cfg, api } = this
    const shape = cfg.shape
    await finishRunningSessions(api)
    const base = (await readClock('queue')).nowMs
    this.startAt = Math.ceil((base + 5 * MINUTE) / MINUTE) * MINUTE
    this.endAt = this.startAt + shape.hours * 60 * MINUTE
    this.sessionMinutes = shape.hours * 60
    const venueId = await api.addVenue(`Sim Hall ${cfg.id} ${cfg.seed}`)
    this.sessionId = await api.createSession({
      title: `${cfg.id} seed ${cfg.seed}`,
      venueId,
      startAt: this.startAt,
      endAt: this.endAt,
      allowSingles: shape.singles,
      allowDoubles: shape.doubles,
      minimumGames: cfg.operatorMinimum ?? 0,
      minimumIsCalculated: cfg.operatorMinimum === undefined,
      expectedPlayers: shape.players,
      playersPerCourt: shape.playersPerCourt,
      courts: Array.from({ length: shape.courts }, (_, i) => ({
        label: `Court ${i + 1}`,
        openUntil:
          cfg.courtOpenUntil?.[i] === undefined ? null : this.at(cfg.courtOpenUntil[i] as number),
      })),
    })

    const accounts = readAccounts()
    const seeded = new Set(accounts.players.map((p) => p.playerId))
    const saved = (await api.clubPlayers()).filter((p) => p.playerId && seeded.has(p.playerId))
    const budget = shape.courts * shape.playersPerCourt
    const total = shape.players + (cfg.overfill ?? 0)
    const levelRng = this.rng.fork('levels')
    const ops = Array.from({ length: total }, (_, i) => {
      const level = levelRng.pick(LEVELS)
      const allowOverfill = i >= budget ? true : undefined
      const player = saved[i]
      return player
        ? { source: 'saved' as const, clubPlayerId: player.id, level, allowOverfill }
        : {
            source: 'new' as const,
            name: `Guest ${cfg.id} ${cfg.seed % 10000} ${String(i + 1).padStart(2, '0')}`,
            level,
            allowOverfill,
          }
    })
    for (let i = 0; i < ops.length; i += 20) {
      const done = await api.rosterBatch(this.sessionId, ops.slice(i, i + 20))
      const waitlisted = done.results.filter((r) => !r.rosterEntry).length
      if (waitlisted) throw new Error(`[sim] ${waitlisted} roster adds went to the waitlist`)
    }
    this.roster = await api.readRoster(this.sessionId)
    const ordered = [...this.roster].sort((a, b) => a.confirmedAt - b.confirmedAt)
    ordered.forEach((p, i) => {
      this.names.set(p.id, `P${String(i + 1).padStart(2, '0')}`)
    })
    await api.setAllPresence(this.sessionId, true)
    for (const p of this.roster) this.presence.set(p.id, [{ from: 0, to: null }])
    this.queue = await api.readQueue(this.sessionId)
    this.session = await api.readSession(this.sessionId)
    for (const plugin of this.plugins) await plugin.prepare?.(this)

    await this.setVirtual(this.startAt)
    await api.startSession(this.sessionId)
    await this.refresh()
    this.check(this.session.session.state === 'active', 'the session did not start')
    this.log(
      `start · ${this.roster.length} players, ${this.liveCourts().length} courts, ` +
        `${shape.hours}h, minimum ${this.session.session.minimumGames} ` +
        `(${this.session.session.minimumIsCalculated ? 'calculated' : 'operator-set'}), ` +
        `strategy ${cfg.strategy}`,
    )
    for (const c of this.openCourts()) this.notifiedCourts.add(c.id)
    this.bagging = cfg.bagging?.(this)
    for (const plugin of this.plugins)
      for (const event of plugin.plan?.(this) ?? []) this.schedule(event)
    const placed = await api.setCourtFillMode(this.sessionId, 'auto')
    this.log(`Auto Queue on · ${placed.length} placed`)
  }

  // ---------- The Queue Master's routine ----------

  private async finishDueMatches() {
    const due = [...this.playing.entries()]
      .filter(([, end]) => end <= this.t)
      .sort((a, b) => a[1] - b[1])
    for (const [matchId] of due) {
      const m = this.match(matchId)
      this.playing.delete(matchId)
      if (!m || m.state !== 'active') {
        this.fail(`match ${matchId} was expected Playing at its end`)
        continue
      }
      const invalid = this.plugins.some((p) => p.decide?.(this, m) === 'invalid')
      const hold = this.plugins.map((p) => p.holdCourt?.(this, m)).find(Boolean)
      if (invalid) {
        const { match } = await this.api.invalid(this.sessionId, m.id)
        this.decided.push({
          t: this.t,
          matchId: m.id,
          matchNo: m.matchNo,
          kind: 'invalid',
          lineup: allPlayers(match),
        })
        this.log(`#${m.matchNo} ${this.courtLabel(m.courtIds[0] ?? '')} marked invalid`)
      } else {
        const winner = this.rng.chance(0.5) ? 'A' : 'B'
        const { match } = await this.api.result(this.sessionId, m.id, winner, hold)
        this.decided.push({
          t: this.t,
          matchId: m.id,
          matchNo: m.matchNo,
          kind: 'completed',
          lineup: allPlayers(match),
        })
        this.log(
          `#${m.matchNo} ${this.courtLabel(m.courtIds[0] ?? '')} Match done · Team ${winner} wins` +
            (hold ? ` · ${this.courtLabel(hold)} left free` : ''),
        )
      }
      await this.refresh()
      for (const plugin of this.plugins) await plugin.afterResult?.(this, m)
    }
  }

  private async runEvents() {
    while (this.events.length && (this.events[0] as SimEvent).at <= this.t) {
      const event = this.events.shift() as SimEvent
      await this.refresh()
      const outcome = await event.apply(this)
      if (outcome === 'retry') {
        if (this.t + 1 < this.sessionMinutes) this.schedule({ ...event, at: this.t + 1 })
        else this.log(`${event.kind}: ${event.label} gave up (nobody suitable before the end)`)
      } else if (outcome === 'skip') this.log(`${event.kind}: ${event.label} skipped`)
    }
  }

  /** The console notices courts that reached their planned start and asks Auto Queue to fill them. */
  private async fillReachedCourts() {
    const reached = this.openCourts().filter((c) => !this.notifiedCourts.has(c.id))
    if (!reached.length) return
    for (const c of reached) this.notifiedCourts.add(c.id)
    const placed = await this.api.fillOpenedCourts(
      this.sessionId,
      reached.map((c) => c.id),
    )
    this.log(
      `${reached.map((c) => c.label).join(', ')} reached planned start · Auto Queue placed ${placed.length}`,
    )
    await this.refresh()
  }

  /** Waiting matches with a player who is not present need attention: Remove waiting match. */
  private async dropNeedsAttention() {
    for (const m of this.queue.matches.filter((x) => x.state === 'waiting')) {
      if (matchStatus(m, this.ctx()).kind !== 'needs-attention') continue
      await this.api.removeWaiting(this.sessionId, m.id, this.queue)
      this.log(`#${m.matchNo} needs attention (${matchStatus(m, this.ctx()).reason}) · removed`)
      await this.refresh()
    }
  }

  /** Free open courts, and whether any waiting match is ready for one of them. */
  private freeCourts() {
    const holds = (courtId: string) =>
      this.queue.matches.some(
        (m) => (m.state === 'on_court' || m.state === 'active') && m.courtIds.includes(courtId),
      )
    return this.openCourts().filter((c) => !holds(c.id))
  }

  /**
   * Keep the Main Queue topped up, just in time: whenever an open court is free and no waiting
   * match is ready for it, Generate matches in the scenario's tab (at least one draft per free
   * court), review the drafts (one that shares a player with a draft already picked in this batch
   * stays unselected, as does one the client check refuses), then Add to Main Queue, as the
   * real-mode screen does; Auto Queue places them on the server. Drafts made long before a court
   * frees go stale (their players wait inside blocked matches while newer drafts jump ahead), so
   * the queue is never filled further ahead than one waiting match per open court.
   */
  async topUpQueue() {
    for (let round = 0; round < 3; round++) {
      const ctx = this.ctx()
      const free = this.freeCourts().length
      const ready = this.queue.matches.some(
        (m) => m.state === 'waiting' && matchStatus(m, ctx).kind === 'ready',
      )
      const waiting = this.queue.matches.filter((m) => m.state === 'waiting').length
      if (!free || ready || waiting >= this.openCourts().length) return
      if (!(await this.generateAndAdd(free))) return
    }
  }

  private async generateAndAdd(deficit: number) {
    const count = ([2, 3, 4, 6] as const).find((n) => n >= deficit) ?? 6
    const session = this.session.session
    const ctx = this.ctx()
    const generated = generateAutoQueueMatches({
      session,
      ctx,
      mode: this.mode,
      limit: count,
      now: this.at(this.t), // the nominal minute: real-time drift must not reorder the tabs
      rng: this.rng.fork(`gen:${this.t}:${this.queue.queueRevision}`).next,
      bagging: this.bagging,
    })
    if (generated.error) return false
    const picked = new Set<string>()
    const ok = generated.matches
      .map((m) => ({ ...m, id: '', mode: this.mode, reason: m.reason ?? '', fingerprint: '' }))
      .filter((d) => {
        const conflict = autoQueueDraftConflict(d, session, ctx)
        if (conflict) {
          this.log(`draft refused on the client: ${conflict}`)
          return false
        }
        if (allPlayers(d).some((id) => picked.has(id))) return false
        for (const id of allPlayers(d)) picked.add(id)
        return true
      })
    if (!ok.length) return false
    const { added, autoPlaced } = await this.api.transferDrafts(this.sessionId, this.queue, ok)
    this.log(
      `Generate matches (${this.cfg.strategy}) · ${generated.matches.length} drafts, ${added.length} added: ` +
        added.map((m) => `#${m.matchNo} ${this.lineupText(m)}`).join(' | ') +
        (autoPlaced.length ? ` · Auto Queue placed ${autoPlaced.length}` : ''),
    )
    await this.refresh()
    return true
  }

  private async startOnCourt() {
    if (this.ended) return
    const handled = new Set<string>()
    for (;;) {
      const m = this.queue.matches.find((x) => x.state === 'on_court' && !handled.has(x.id))
      if (!m) break
      handled.add(m.id)
      let go = true
      for (const plugin of this.plugins)
        if ((await plugin.beforeStart?.(this, m)) === false) go = false
      if (!go) continue
      const current = this.match(m.id) ?? m
      if (current.state !== 'on_court') continue
      const status = matchStatus(current, this.ctx())
      if (status.kind === 'needs-attention') {
        // Someone left right after Auto Queue put them On court (e.g. tired after Match done):
        // the Queue Master sends the match back; Auto Queue refills the court with another one.
        await this.api.sendBack(this.sessionId, m.id)
        this.log(`#${m.matchNo} On court needs attention (${status.reason}) · Send back to queue`)
        await this.refresh()
        continue
      }
      const reply = await this.api.sendStart(this.sessionId, m.id)
      if (reply.status >= 300) {
        this.fail(
          `Start match #${m.matchNo} refused: ${reply.status} ${JSON.stringify(reply.body)}`,
        )
        continue
      }
      const length = this.rng.int(15, 20)
      this.playing.set(m.id, this.t + length)
      this.log(
        `#${m.matchNo} ${this.courtLabel(current.courtIds[0] ?? '')} Start match ${this.lineupText(current)} (${length} min)`,
      )
    }
    await this.refresh()
  }

  private manualAtEnd = false

  /**
   * At the planned end the Queue Master stops new placements (Manual Queue), so no match goes On
   * court after the end. (Session done with a match left On court fails on the server: see
   * REG-DEF-01.)
   */
  private async stopPlacingAtEnd() {
    if (!this.ended || this.manualAtEnd) return
    this.manualAtEnd = true
    await this.api.setCourtFillMode(this.sessionId, 'manual')
    this.log('planned end · Manual Queue on (no new placements)')
  }

  private async step() {
    await this.refresh()
    await this.stopPlacingAtEnd()
    await this.finishDueMatches()
    await this.runEvents()
    await this.refresh()
    await this.fillReachedCourts()
    if (!this.ended) {
      await this.dropNeedsAttention()
      await this.topUpQueue()
    }
    await this.startOnCourt()
    for (const plugin of this.plugins) await plugin.afterStep?.(this)
  }

  private nextMinute() {
    const candidates: number[] = [...this.playing.values()]
    if (this.events[0] && this.events[0].at < this.sessionMinutes)
      candidates.push(this.events[0].at)
    const now = this.serverNow()
    for (const c of this.liveCourts()) {
      const opens = c.openedEarlyAt ?? c.startsAt
      if (opens && opens > now) candidates.push(Math.ceil(this.minuteOf(opens)))
    }
    if (!this.ended) candidates.push(this.sessionMinutes)
    const next = Math.min(...candidates.filter((x) => x > this.t))
    return Number.isFinite(next) ? next : null
  }

  async run() {
    await this.setup()
    await this.runUntil(Number.POSITIVE_INFINITY)
    await this.finish()
  }

  /**
   * The Queue Master's routine up to a virtual minute (after `setup`): steps, then stops at
   * `limit` with the clock moved there, so a test can act at that minute and call it again.
   * Returns true when the session ran to its end (nothing left playing).
   */
  async runUntil(limit: number) {
    for (let guard = 0; guard < 5000; guard++) {
      await this.step()
      if (this.ended && !this.playing.size) return true
      const next = this.nextMinute()
      if (next === null) return true
      if (next > limit) {
        await this.advanceTo(limit)
        return false
      }
      await this.advanceTo(next)
    }
    return true
  }

  // ---------- Session done ----------

  async finish() {
    await this.refresh()
    for (const m of this.queue.matches.filter((x) => x.state === 'on_court')) {
      await this.api.sendBack(this.sessionId, m.id)
      this.log(`#${m.matchNo} never started · Send back to queue`)
    }
    await this.refresh()
    this.review = await this.api.doneReview(this.sessionId)
    this.check(
      !this.review.blocking.length,
      `Session done is blocked: ${this.review.blocking.join(', ')}`,
    )
    const minimum = this.session.session.minimumGames
    this.log(
      `done review · below minimum (${minimum}): ` +
        (this.review.belowMinimum
          .map((p) => `${this.name(p.sessionPlayerId)}=${p.games}`)
          .join(' ') || 'none'),
    )
    for (const plugin of this.plugins) await plugin.beforeDone?.(this)
    let status = await this.api.finalize(this.sessionId)
    for (let i = 0; i < 40 && status.state !== 'done'; i++) {
      if (status.state === 'failed') break
      await sleep(500)
      status = await this.api.finalizationStatus(this.sessionId)
    }
    this.check(status.state === 'done', `Session done ended ${status.state} at ${status.stage}`)
    this.finished = true
    const standings = await this.api.standings(this.sessionId)
    if (!standings) this.fail('no result snapshot after Session done')
    this.standings = standings ?? []
    this.log(`Session done · ${status.state}`)
    for (const plugin of this.plugins) await plugin.finish?.(this)
  }

  /** After an error: leave no session running for the next test (one session at a time). */
  async abandon() {
    if (!this.sessionId) return
    try {
      if (!this.finished) await finishSession(this.api, this.sessionId)
    } catch (error) {
      this.lines.push(`cleanup failed: ${String(error)}`)
    }
    // The next session starts after this one's planned window (no time clash), clock forward only.
    await this.setVirtual(this.endAt + MINUTE)
  }

  /** Own tally of counted games from what this run did (cross-checked against the app). */
  tally() {
    const games = new Map<string, number>(this.roster.map((p) => [p.id, 0]))
    const add = (id: string) => games.set(id, (games.get(id) ?? 0) + 1)
    for (const d of this.decided) {
      if (d.kind !== 'completed') continue
      const subs = this.subs.filter((s) => s.matchId === d.matchId)
      const involved = new Set(subs.flatMap((s) => [s.inId, s.outId]))
      for (const id of d.lineup) if (!involved.has(id)) add(id)
      for (const s of subs) {
        if (s.credit === 'incoming') add(s.inId)
        if (s.credit === 'outgoing') add(s.outId)
      }
    }
    return games
  }
}

/** Invalidate whatever still plays, then Session done (the API path a stuck Queue Master takes). */
export async function finishSession(api: QueueMasterApi, sessionId: string) {
  await api.setCourtFillMode(sessionId, 'manual').catch(() => undefined)
  const { matches } = await api.readQueue(sessionId)
  for (const m of matches.filter((x) => x.state === 'on_court'))
    await api.sendBack(sessionId, m.id).catch(() => undefined)
  for (const m of matches.filter((x) => x.state === 'active'))
    await api.invalid(sessionId, m.id).catch(() => undefined)
  await api.finalize(sessionId)
  for (let i = 0; i < 20; i++) {
    const status = await api.finalizationStatus(sessionId)
    if (status.state === 'done' || status.state === 'failed') return
    await sleep(500)
  }
}

/** One session at a time: a session left running by an earlier test is finished first. */
export async function finishRunningSessions(api: QueueMasterApi) {
  for (const s of await api.listSessions())
    if (s.state === 'active') {
      try {
        await finishSession(api, s.id)
      } catch (error) {
        if (!(error instanceof ApiError)) throw error
      }
    }
}
