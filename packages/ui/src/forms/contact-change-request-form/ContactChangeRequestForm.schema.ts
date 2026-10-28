import type { ContactChangeField } from '@rotra/data/contact-change-request/types'
import { emailField } from '@rotra/schema/email'
import { phoneField } from '@rotra/schema/phone'
import { z } from 'zod'

const FIELD_WORD: Record<ContactChangeField, string> = { phone: 'phone number', email: 'email' }

export type ContactChangeCurrent = {
  /** E.164 */
  currentPhone: string
  currentEmail: string
}

/**
 * P-CONTACT-REQUEST: discriminated on field. The new phone parses to E.164 and the new email to lower
 * case, and neither may equal the current value.
 */
export function makeContactChangeRequestSchema({ currentPhone, currentEmail }: ContactChangeCurrent) {
  const required = (field: ContactChangeField) =>
    z.string().trim().min(1, `Enter the new ${FIELD_WORD[field]}.`)
  return z.discriminatedUnion('field', [
    z.object({
      field: z.literal('phone'),
      toValue: required('phone')
        .superRefine((value, context) => {
          if (!phoneField.safeParse(value).success)
            context.addIssue({
              code: 'custom',
              message: 'Enter a Philippine mobile number, like 0917 555 0142.',
            })
        })
        .transform((value) => phoneField.parse(value))
        .refine((value) => value !== currentPhone, "That's already your phone number."),
    }),
    z.object({
      field: z.literal('email'),
      toValue: required('email')
        .superRefine((value, context) => {
          if (!emailField.safeParse(value).success)
            context.addIssue({ code: 'custom', message: 'Enter an email address, like name@example.com.' })
        })
        .transform((value) => value.toLowerCase())
        .refine((value) => value !== currentEmail.toLowerCase(), "That's already your email."),
    }),
  ])
}

export type ContactChangeRequestInput = { field: ContactChangeField; toValue: string }
export type ContactChangeRequestValues = z.infer<ReturnType<typeof makeContactChangeRequestSchema>>
