import { clubNicknameSchema } from '@rotra/ui/forms/club-nickname-form/schema'
import { z } from 'zod'

export const EDIT_LIVE_GAMES_MIN = 0
export const EDIT_LIVE_GAMES_MAX = 99

/**
 * Edit player during a session (D-EDIT-LIVE-PLAYER): the club nickname (the same rule as Saved
 * players › Club nickname; only registered players have the field), the games played shown for
 * tonight (0–99) and whether the player is present.
 */
export const editLivePlayerSchema = z.object({
  nickname: clubNicknameSchema.shape.nickname,
  games: z
    .number()
    .int()
    .min(EDIT_LIVE_GAMES_MIN, 'Games played cannot be below 0.')
    .max(EDIT_LIVE_GAMES_MAX, `Games played cannot be above ${EDIT_LIVE_GAMES_MAX}.`),
  present: z.boolean(),
})

export type EditLivePlayerFormInput = z.input<typeof editLivePlayerSchema>
/** What onSave receives: the trimmed nickname ('' removes it), the games to show, and presence. */
export type EditLivePlayerFormValues = z.output<typeof editLivePlayerSchema>
