import { NICKNAME_MAX } from '@rotra/schema/personal-details'
import { z } from 'zod'

/**
 * Club nickname: one optional field, trimmed, up to 24 characters (the same limit as an account
 * nickname). Empty is allowed and removes the club nickname.
 */
export const clubNicknameSchema = z.object({
  nickname: z
    .string()
    .trim()
    .max(NICKNAME_MAX, `Use ${NICKNAME_MAX} characters or fewer.`),
})

export type ClubNicknameFormInput = z.input<typeof clubNicknameSchema>
/** What onSubmit receives: the trimmed club nickname; '' removes it. */
export type ClubNicknameFormValues = z.output<typeof clubNicknameSchema>
