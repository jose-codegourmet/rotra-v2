import { dateField, timeField } from '@rotra/schema/date'
import { sessionFinancialsSchema, CUSTOM_FEE_ERROR } from '@rotra/ui/forms/session-financials-fields/schema'
import { z } from 'zod'

export const SESSION_TITLE_ERROR = 'Give the session a title.'
export const VENUE_ERROR = 'Choose where you are playing.'
export const EXPECTED_ERROR = 'Use a whole number, 1 or more, or leave it empty.'
export const MINIMUM_ERROR = 'Use a whole number, 0 or more.'
export const STEP_ERROR = 'Fix the highlighted fields to continue.'

/** Optional whole number typed as text: '' stays null */
const optionalWhole = (min: number, message: string) =>
  z
    .string()
    .trim()
    .transform((value, ctx) => {
      if (value === '') return null
      const n = Number(value)
      if (!Number.isInteger(n) || n < min) {
        ctx.addIssue({ code: 'custom', message })
        return z.NEVER
      }
      return n
    })

const whole = (min: number, message: string) =>
  z
    .string()
    .trim()
    .transform((value, ctx) => {
      const n = Number(value)
      if (value === '' || !Number.isInteger(n) || n < min) {
        ctx.addIssue({ code: 'custom', message })
        return z.NEVER
      }
      return n
    })

export const sessionSetupSchema = z
  .object({
    title: z.string().trim().min(1, SESSION_TITLE_ERROR),
    /** YYYY-MM-DD */
    date: dateField,
    startTime: timeField,
    endTime: timeField,
    venue: z
      .object({ venueId: z.string(), name: z.string(), address: z.string() })
      .refine((v) => v.venueId !== '', { message: VENUE_ERROR }),
    repeat: z.enum(['none', 'weekly', 'biweekly', 'monthly']),
    repeatCount: z.number().int().min(2).max(12),
    courtLabels: z.array(z.string().trim().min(1, 'Give the court a label.')).min(1),
    playersPerCourt: z.number().int().min(2).max(20),
    allowSingles: z.boolean(),
    allowDoubles: z.boolean(),
    sessionMode: z.enum(['chill', 'fair', 'hard']),
    minimumIsCalculated: z.boolean(),
    /** Only read when minimumIsCalculated is false */
    minimumGames: z.string(),
    expectedPlayers: optionalWhole(1, EXPECTED_ERROR),
    notes: z.string(),
  })
  .extend(sessionFinancialsSchema.shape)
  .superRefine((values, ctx) => {
    if (values.paymentMode === 'custom' && values.customFeePerHead === null)
      ctx.addIssue({ code: 'custom', message: CUSTOM_FEE_ERROR, path: ['customFeePerHead'] })
    if (!values.minimumIsCalculated) {
      const result = whole(0, MINIMUM_ERROR).safeParse(values.minimumGames)
      if (!result.success)
        ctx.addIssue({ code: 'custom', message: MINIMUM_ERROR, path: ['minimumGames'] })
    }
  })

/** What the fields hold while typing */
export type SessionSetupInput = z.input<typeof sessionSetupSchema>
/** What onSubmit receives (whole numbers parsed; minimumGames still text, see minimumGamesOf) */
export type SessionSetupValues = z.output<typeof sessionSetupSchema>

/** The wizard's three pages and the fields each one validates */
export const PAGE_FIELDS: (keyof SessionSetupInput)[][] = [
  ['title', 'date', 'startTime', 'endTime', 'venue', 'courtLabels', 'playersPerCourt'],
  [
    'allowSingles',
    'allowDoubles',
    'sessionMode',
    'minimumIsCalculated',
    'minimumGames',
    'expectedPlayers',
  ],
  ['courtFeePerCourtHour', 'entranceFeePerHead', 'shuttles', 'paymentMode', 'customFeePerHead', 'notes'],
]
