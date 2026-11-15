import { z } from 'zod'

/**
 * The shape of the JSON files in `@rotra/rule-cases` (track rule-cases, R2). The JSON Schema files
 * in that package are generated from these shapes (`ruleCaseJsonSchemas`); a test keeps them in
 * step. Money is integer minor units, ids are strings, times are epoch milliseconds.
 */
const name = z.string().min(1),
  identifier = z.string().regex(/^[A-Za-z][A-Za-z0-9_]*$/, 'A rule or command name, no spaces'),
  version = z.number().int().min(1),
  /** Epoch milliseconds. A case carries it when its rule reads the clock. */
  epochMs = z.number().int()

export const ruleCaseFile = z.strictObject({
  kind: z.literal('rule'),
  rule: identifier,
  version,
  cases: z
    .array(z.strictObject({ name, now: epochMs.optional(), input: z.json(), expected: z.json() }))
    .min(1),
})

export const commandCaseFile = z.strictObject({
  kind: z.literal('command'),
  command: identifier,
  version,
  cases: z
    .array(
      z.strictObject({
        name,
        before: z.json(),
        args: z.json(),
        operationId: name,
        now: epochMs,
        expected: z.union([
          z.strictObject({ after: z.json() }),
          z.strictObject({ rejected: z.json() }),
        ]),
      }),
    )
    .min(1),
})

export type RuleCaseFile = z.infer<typeof ruleCaseFile>
export type CommandCaseFile = z.infer<typeof commandCaseFile>

/** The two JSON Schemas as committed under `packages/rule-cases/schema/`. */
export const ruleCaseJsonSchemas = {
  'rule-case.schema.json': z.toJSONSchema(ruleCaseFile, { target: 'draft-2020-12' }),
  'command-case.schema.json': z.toJSONSchema(commandCaseFile, { target: 'draft-2020-12' }),
} as const
