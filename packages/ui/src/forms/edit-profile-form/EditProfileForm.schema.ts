import { favoriteOtherCheck, gettingToKnowShape } from '@rotra/schema/getting-to-know'
import {
  type PersonalDetailsValues,
  personalDetailsFieldsSchema,
} from '@rotra/ui/personal-details-fields/schema'
/**
 * Personal fields and links only (strict, so phone, email and the RTR ID can never be submitted),
 * plus the three getting-to-know answers of Playing style. The container splits them on save.
 */
export const editProfileSchema = personalDetailsFieldsSchema
  .extend(gettingToKnowShape)
  .superRefine(favoriteOtherCheck)
export type EditProfileValues = PersonalDetailsValues & {
  playStyle: '' | 'front' | 'back' | 'all'
  shots: string[]
  shotsOther: string[]
  favoritePlayer: string
  favoritePlayerOther: string
}
