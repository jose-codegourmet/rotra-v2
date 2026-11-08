import { z } from 'zod'
import { emailField } from './email'
import { nameField } from './name'
import { phoneField } from './phone'

/**
 * Approved Admin identity fields. Contacts are set directly only during creation; an edited email is
 * sent for review as a contact-change request and never changes the player here.
 */
export const adminPlayerCreateSchema = z.object({
  name: nameField,
  nickname: z.string().trim().max(60),
  phone: z.union([z.literal(''), phoneField]),
  email: z.union([z.literal(''), emailField]),
  place: z.enum(['CEB', 'MNL', 'DVO', 'ILO', 'BCD', 'TAG']),
  clubId: z.string(),
  allowDuplicate: z.boolean(),
})
export const adminPlayerEditSchema = z.object({
  name: nameField,
  nickname: z.string().trim().max(60),
  picture: z.union([
    z.literal(''),
    z.url().refine((value) => value.startsWith('https://'), 'Use an HTTPS photo URL.'),
  ]),
  email: z.union([z.literal(''), emailField]),
  reason: z.string().trim().min(1, 'Enter a reason.'),
})
export type AdminPlayerCreateValues = z.infer<typeof adminPlayerCreateSchema>
export type AdminPlayerEditValues = z.infer<typeof adminPlayerEditSchema>
