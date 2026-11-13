import {
  courtTimeOnSession,
  courtWindowError,
  sessionWindowError,
} from '@rotra/schema/court-window'
import { formatPeso, moneyField } from '@rotra/schema/money'
import { formatPhoneForDisplay, phoneField } from '@rotra/schema/phone'
import { describe, expect, it } from 'vitest'
import * as club from './club/club.rules'
import * as license from './license/license.rules'
import * as autoQueue from './match/autoQueue.rules'
import * as match from './match/match.rules'
import * as rankingSettings from './ranking-settings/rankingSettings.rules'
import * as sessionCost from './session-cost/sessionCost.rules'
import * as sessionPayment from './session-payment/sessionPayment.rules'
import * as sessionResult from './session-result/sessionResult.rules'

/**
 * Runs every case in `@rotra/rule-cases` (packages/rule-cases/cases) against the TypeScript rules.
 * The Go tests read the same files. Comparison is a deep subset match; see case.schema.json.
 */
type Rule = (...args: unknown[]) => unknown
const kebab = (name: string) => name.replace(/(?<!^)([A-Z])/g, '-$1').toLowerCase()
const registry = (area: string, ...modules: object[]) =>
  Object.fromEntries(
    modules.flatMap((mod) =>
      Object.entries(mod)
        .filter(([, value]) => typeof value === 'function')
        .map(([name, fn]) => [`${area}/${kebab(name)}`, fn as Rule]),
    ),
  )
const rules: Record<string, Rule> = {
  ...registry('club', club),
  ...registry('license', license),
  ...registry('match', match, autoQueue),
  ...registry('ranking-settings', rankingSettings),
  ...registry('session-cost', sessionCost),
  ...registry('session-payment', sessionPayment),
  ...registry('session-result', sessionResult),
  'court-window/session-window-error': (start, end) =>
    sessionWindowError(start as number, end as number),
  'court-window/court-window-error': (start, end, sessionStart, sessionEnd) =>
    courtWindowError(
      start as number,
      end as number | null,
      sessionStart as number,
      sessionEnd as number,
    ),
  'court-window/court-time-on-session': (sessionStartsAt, at) =>
    courtTimeOnSession(sessionStartsAt as number, at as number),
  'money/money-field-parse': (value) => moneyField.parse(value),
  'money/money-field-accepts': (value) => moneyField.safeParse(value).success,
  'money/format-peso': (minor) => formatPeso(minor as number),
  'phone/phone-field-parse': (value) => phoneField.parse(value),
  'phone/phone-field-accepts': (value) => phoneField.safeParse(value).success,
  'phone/format-phone-for-display': (value) => formatPhoneForDisplay(value as string),
}

type CaseFile = {
  rule: string
  version: number
  cases: { name: string; input: { args: unknown[]; select?: string }; expected: unknown }[]
}

// Vite inlines the JSON files; the path is the package's folder in this repo (the Go tests read it too).
declare global {
  interface ImportMeta {
    glob(pattern: string, options: { eager: true; import: 'default' }): Record<string, CaseFile>
  }
}
const caseFiles = import.meta.glob('../../rule-cases/cases/**/*.json', {
  eager: true,
  import: 'default',
})
const files = Object.keys(caseFiles).sort()

/** Turns the tagged values of case.schema.json back into Date, undefined, non-finite numbers and `rng`. */
function decode(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(decode)
  if (value && typeof value === 'object') {
    const tagged = value as Record<string, unknown>
    if ('$date' in tagged) return new Date(tagged.$date as string)
    if ('$undefined' in tagged) return undefined
    if ('$number' in tagged) return Number(tagged.$number)
    if ('$constant' in tagged) return () => tagged.$constant
    return Object.fromEntries(Object.entries(tagged).map(([key, item]) => [key, decode(item)]))
  }
  return value
}

/** Every key in `expected` is present and equal in `actual`; arrays match in length and per element. */
function subsetMismatch(expected: unknown, actual: unknown, at = 'result'): string | null {
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || actual.length !== expected.length) return `${at}: array length`
    for (const [index, item] of expected.entries()) {
      const bad = subsetMismatch(item, actual[index], `${at}[${index}]`)
      if (bad) return bad
    }
    return null
  }
  if (expected && typeof expected === 'object') {
    if (!actual || typeof actual !== 'object') return `${at}: not an object`
    for (const [key, value] of Object.entries(expected)) {
      const bad = subsetMismatch(value, (actual as Record<string, unknown>)[key], `${at}.${key}`)
      if (bad) return bad
    }
    return null
  }
  return Object.is(expected, actual)
    ? null
    : `${at}: expected ${String(expected)}, got ${String(actual)}`
}

const select = (value: unknown, path?: string) =>
  path
    ? path.split('.').reduce<unknown>((v, key) => (v as Record<string, unknown>)[key], value)
    : value

describe('shared rule cases', () => {
  it('has a case file', () => expect(files.length).toBeGreaterThan(0))
  for (const file of files) {
    const data = caseFiles[file] as CaseFile
    describe(data.rule, () => {
      it('has a TypeScript rule', () => expect(rules[data.rule]).toBeTypeOf('function'))
      for (const item of data.cases) {
        it(item.name, () => {
          const result = select(
            rules[data.rule]?.(...(decode(item.input.args) as unknown[])),
            item.input.select,
          )
          expect(subsetMismatch(decode(item.expected), result)).toBeNull()
        })
      }
    })
  }
})
