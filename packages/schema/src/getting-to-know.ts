import { z } from 'zod'

/** The message under Player's name when Others is picked and no name is typed (P-ONBOARD step 4). */
export const FAVORITE_OTHER_REQUIRED = "Type the player's name, or pick another answer."

/**
 * The getting-to-know answers as the onboarding steps and Edit profile › Playing style hold them
 * (D-2026-11-19-11). All optional: '' or an empty list means not answered. The ids match
 * `@rotra/data/player/types` (CourtPosition, ShotId, FavoritePlayerId); the shot and own-shot rules
 * are checked by the data layer on save and by ShotChips while typing.
 */
export const gettingToKnowShape = {
  playStyle: z.enum(['front', 'back', 'all', '']),
  shots: z.array(z.string()),
  shotsOther: z.array(z.string()),
  favoritePlayer: z.string(),
  favoritePlayerOther: z.string(),
}

/** Adds the Others-needs-a-name issue to a form schema that includes the getting-to-know shape. */
export function favoriteOtherCheck(
  values: { favoritePlayer: string; favoritePlayerOther: string },
  ctx: z.core.$RefinementCtx<{ favoritePlayer: string; favoritePlayerOther: string }>,
) {
  if (values.favoritePlayer === 'other' && !values.favoritePlayerOther.trim())
    ctx.addIssue({
      code: 'custom',
      path: ['favoritePlayerOther'],
      message: FAVORITE_OTHER_REQUIRED,
    })
}

export const gettingToKnowSchema = z.object(gettingToKnowShape).superRefine(favoriteOtherCheck)
export type GettingToKnowValues = z.infer<typeof gettingToKnowSchema>
