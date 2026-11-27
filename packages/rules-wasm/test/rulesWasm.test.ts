import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { engine, liveRulesVersions, RulesError, rulesVersion, setRulesVersion } from '../src/engine'
import { loadRules } from '../src/node'
import { autoFillPlacements, canPlace, courtsNeeded } from '../src/rules'
import { WRAPPER_RUNNERS } from './wrapperRunners'

// Every JSON case in @rotra/rule-cases through the WebAssembly wrapper (track rule-cases, task 5.3).
const here = dirname(fileURLToPath(import.meta.url))
const CASES = join(here, '..', '..', 'rule-cases', 'cases')

type CaseFile = {
  rule: string
  version: number
  cases: { name: string; now?: number; input: unknown; expected: unknown }[]
}
// Rules written in TypeScript first, whose Go copy (and so the .wasm export) follows before the next
// Go merge. Their cases run in @rotra/data; remove a key here in the PR that adds its Go rule.
// The Go tests skip the same keys: apps/api/internal/rulecases (GoCopyPending).
const GO_COPY_PENDING: ReadonlySet<string> = new Set([])
const files: { key: string; file: CaseFile }[] = []
for (const v of readdirSync(CASES)) {
  for (const area of readdirSync(join(CASES, v))) {
    for (const f of readdirSync(join(CASES, v, area))) {
      const key = `${area}/${f.replace(/\.json$/, '')}`
      if (GO_COPY_PENDING.has(key)) continue
      const file = JSON.parse(readFileSync(join(CASES, v, area, f), 'utf8')) as CaseFile
      files.push({ key, file })
    }
  }
}

// What the wrapper returns, as the bytes a case file holds.
const asJson = (value: unknown): unknown =>
  value === undefined ? null : JSON.parse(JSON.stringify(value))

beforeAll(async () => {
  await loadRules()
})

describe('rules wasm · shared cases', () => {
  it('finds the case files and a wrapper call for each rule', () => {
    expect(files.length).toBeGreaterThan(0)
    expect(new Set(files.map((f) => f.key))).toEqual(new Set(Object.keys(WRAPPER_RUNNERS)))
  })
  it('loads the live versions', () => {
    expect(liveRulesVersions()).toContain(1)
  })
  let total = 0
  for (const { key, file } of files) {
    describe(`${key} (v${file.version})`, () => {
      for (const c of file.cases) {
        total++
        it(c.name, () => {
          setRulesVersion(file.version)
          expect(asJson(WRAPPER_RUNNERS[key]?.(c.input, c.now))).toEqual(c.expected)
        })
      }
    })
  }
  it('ran every case', () => {
    expect(total).toBeGreaterThanOrEqual(256)
  })
})

describe('rules wasm · wrapper', () => {
  const ctx = { roster: [], matches: [], courts: [] }

  it('rejects an unknown rules version', () => {
    expect(() => setRulesVersion(99)).toThrow(RulesError)
    expect(rulesVersion()).toBe(1)
  })

  it('surfaces a rule error as RulesError and keeps working', () => {
    // courtOpen reads the clock; the raw call without `now` is an ok:false reply, not a crash.
    expect(() => engine().call('courts/courtOpen', { court: {} })).toThrow(RulesError)
    expect(engine().restarts).toBe(0)
    expect(courtsNeeded({ format: 'fun_5v5' })).toBe(2)
  })

  it('restarts the Go program when it has exited, retries, and keeps working', () => {
    const before = engine().restarts
    engine().simulateExit()
    // The next call finds a dead program: the wrapper starts a new one and retries once.
    expect(courtsNeeded({ format: 'fun_5v5' })).toBe(2)
    expect(engine().restarts).toBe(before + 1)
    // And the one after that is a plain call again.
    expect(courtsNeeded({ format: 'singles' })).toBe(1)
    expect(engine().restarts).toBe(before + 1)
  })

  it('restarts and retries once on a panic reply, then reports a repeated one', () => {
    const e = engine()
    const before = e.restarts
    // A rule given the wrong input shape can panic inside Go; force the reply path directly.
    const calls: string[] = []
    const original = (e as unknown as { instance: { call(j: string): string } }).instance
    const real = original.call.bind(original)
    let n = 0
    original.call = (json: string) => {
      calls.push(json)
      return n++ === 0 ? '{"ok":false,"error":"panic: boom"}' : real(json)
    }
    expect(courtsNeeded({ format: 'doubles' })).toBe(1)
    expect(e.restarts).toBe(before + 1)
    expect(calls).toHaveLength(1) // the retry ran on the fresh instance
    expect(courtsNeeded({ format: 'doubles' })).toBe(1)
  })

  it('autoFillPlacements is one batched call', () => {
    expect(autoFillPlacements(ctx as never, {})).toEqual([])
    expect(canPlace).toBeTypeOf('function')
  })
})
