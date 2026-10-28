import { z } from 'zod'

export const NOTHING_SELECTED_ERROR = 'Choose at least one thing to publish.'

/**
 * D-PUBLISH: which result slides go on the public session page. Standings and Awards are the two
 * slides; Include Off Day is the explicit opt-in (D-OFF-DAY). At least one of the three must be on.
 */
export const publishResultsSchema = z
  .object({
    standings: z.boolean(),
    awards: z.boolean(),
    includeOffDay: z.boolean(),
  })
  .refine((values) => values.standings || values.awards || values.includeOffDay, {
    message: NOTHING_SELECTED_ERROR,
    path: ['standings'],
  })

/** What the checkboxes hold */
export type PublishResultsFormInput = z.input<typeof publishResultsSchema>
/** What onSubmit receives: the selection to publish, replacing any previous one */
export type PublishResultsFormValues = z.output<typeof publishResultsSchema>
