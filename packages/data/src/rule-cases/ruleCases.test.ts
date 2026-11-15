import { describe, expect, it } from 'vitest'
import { CASE_FILES, describeRuleCases } from './describeRuleCases'
import { RULE_RUNNERS } from './runners'

// Every file in `@rotra/rule-cases` (track rule-cases, R3 and R4) against today's TypeScript rules.
// The same files will drive the Go tests and the WebAssembly wrapper, so a case here is the contract.
const files = Object.keys(CASE_FILES)
  .map((path) => /cases\/v(\d+)\/([^/]+)\/([^/]+)\.json$/.exec(path))
  .filter((m): m is RegExpExecArray => m !== null)
  .map((m) => ({ version: Number(m[1]), area: m[2] as string, rule: m[3] as string }))
  .sort((a, b) => `${a.area}/${a.rule}`.localeCompare(`${b.area}/${b.rule}`))

describe('rule cases', () => {
  it('finds the case files', () => {
    expect(files.length).toBeGreaterThan(0)
  })
  it('has a TypeScript runner for every rule with cases, and cases for every runner', () => {
    expect(new Set(files.map((f) => `${f.area}/${f.rule}`))).toEqual(
      new Set(Object.keys(RULE_RUNNERS)),
    )
  })
})

for (const f of files) describeRuleCases(f.area, f.rule, f.version)
