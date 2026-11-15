import type { Reply } from './types'

/** One running copy of the Go program. Its three calls are synchronous string-in, string-out. */
export type GoInstance = {
  call(json: string): string
  autoFillPlacements(json: string): string
  versions(): string
  /** Test hook: make the Go program look exited, as if the runtime had stopped. */
  simulateExit(): void
}

/** Starts a fresh Go program from an already compiled module. Synchronous, so a restart is too. */
export type InstanceFactory = () => GoInstance

export class RulesError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RulesError'
  }
}

const isCrash = (reply: Reply) => !reply.ok && reply.error.startsWith('panic:')

export class RulesEngine {
  private instance: GoInstance
  private version: number
  readonly liveVersions: number[]
  /** How many times the Go program was started again after a crash. */
  restarts = 0

  constructor(private readonly start: InstanceFactory) {
    this.instance = start()
    this.liveVersions = JSON.parse(this.instance.versions()) as number[]
    this.version = Math.max(...this.liveVersions)
  }

  get rulesVersion() {
    return this.version
  }

  setRulesVersion(version: number) {
    if (!this.liveVersions.includes(version)) {
      throw new RulesError(
        `rules version ${version} is not in this build (has ${this.liveVersions})`,
      )
    }
    this.version = version
  }

  private restart() {
    this.instance = this.start()
    this.restarts++
  }

  private run(pick: (i: GoInstance) => string): unknown {
    let reply: Reply
    try {
      reply = JSON.parse(pick(this.instance)) as Reply
    } catch {
      // The Go program exited (or threw): start it again and retry once.
      this.restart()
      reply = JSON.parse(pick(this.instance)) as Reply
    }
    if (isCrash(reply)) {
      this.restart()
      reply = JSON.parse(pick(this.instance)) as Reply
    }
    if (!reply.ok) throw new RulesError(reply.error)
    return reply.result
  }

  call(rule: string, input: unknown, now?: number): unknown {
    const envelope = JSON.stringify({ version: this.version, rule, now, input })
    return this.run((i) => i.call(envelope))
  }

  autoFillPlacements(input: unknown, now?: number): unknown {
    const envelope = JSON.stringify({ version: this.version, now, input })
    return this.run((i) => i.autoFillPlacements(envelope))
  }

  /** Test hook: the next call finds a dead Go program. */
  simulateExit() {
    this.instance.simulateExit()
  }
}

let current: RulesEngine | null = null

export function setEngine(engine: RulesEngine) {
  current = engine
}

export function engine(): RulesEngine {
  if (!current) throw new RulesError('rules are not loaded: await loadRules() first')
  return current
}

export const isRulesLoaded = () => current !== null

/** Pick the rules version of the Queue Session being shown (the session's stamped version). */
export const setRulesVersion = (version: number) => engine().setRulesVersion(version)
export const rulesVersion = () => engine().rulesVersion
export const liveRulesVersions = () => [...engine().liveVersions]
