import { describe, expect, it } from 'vitest'
import { asJson, CLOCK_RULES, RULE_RUNNERS } from './runners'

/** The shape of one rule case file; `@rotra/schema/rule-cases` is the checked definition. */
export type RuleCaseFile = {
  kind: 'rule'
  rule: string
  version: number
  cases: { name: string; now?: number; input: unknown; expected: unknown }[]
}

// Vite reads every case file at once. The path is relative because the files are JSON in a
// sibling package; `@rotra/rule-cases` is a devDependency so Turborepo hashes it for this test.
declare global {
  interface ImportMeta {
    glob(pattern: string, options: { eager: true; import: 'default' }): Record<string, RuleCaseFile>
  }
}
export const CASE_FILES = import.meta.glob('../../../rule-cases/cases/v*/**/*.json', {
  eager: true,
  import: 'default',
})

export const caseFile = (version: number, area: string, rule: string) => {
  const file = CASE_FILES[`../../../rule-cases/cases/v${version}/${area}/${rule}.json`]
  if (!file) throw new Error(`No rule cases for v${version}/${area}/${rule}`)
  return file
}

/** One `describe` per rule: every case of `v<version>/<area>/<rule>.json` against today's TypeScript. */
export function describeRuleCases(area: string, rule: string, version = 1) {
  const key = `${area}/${rule}`,
    run = RULE_RUNNERS[key],
    file = caseFile(version, area, rule)
  describe(`rule cases · ${key} (v${version})`, () => {
    it('has a runner and names itself', () => {
      expect(run).toBeTypeOf('function')
      expect(file.rule).toBe(rule)
    })
    for (const c of file.cases) {
      it(c.name, () => {
        if (CLOCK_RULES.has(key)) expect(c.now).toBeTypeOf('number')
        expect(asJson(run?.(c.input, c.now))).toEqual(c.expected)
      })
    }
  })
}
