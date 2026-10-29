import { clubPriceField } from '@rotra/schema/club-price'
import { nameField } from '@rotra/schema/name'
import { passwordField } from '@rotra/schema/password'
import { z } from 'zod'

export const CLUB_NAME_MAX = 60
export const CLUB_PASSWORD_MIN = 8
export const USERNAME_MIN = 3
export const USERNAME_MAX = 30
/** Lowercase letters and numbers, optionally separated by single dots (rotra-admin.html addErrors). */
export const USERNAME_PATTERN = /^[a-z0-9]+(\.[a-z0-9]+)*$/
export const USERNAME_FORMAT_ERROR = 'Use 3 to 30 lowercase letters, numbers and dots, like lahug.smash.'

/** rotra-admin.html plain(): strips accents and lowercases, so "Lahúg" and "lahug" compare equal. */
export const plainText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

export type AddClubSchemaOptions = {
  /** Every existing club name; a match ignoring case and accents is refused */
  takenNames?: string[]
  /** Every username already used by an account; a match ignoring case and accents is refused */
  takenUsernames?: string[]
}

/** A-ADD-CLUB step 1: club identity, the Queue app sign-in and the club's price. */
export function createAddClubSchema({ takenNames = [], takenUsernames = [] }: AddClubSchemaOptions = {}) {
  const names = new Set(takenNames.map((name) => plainText(name.trim())))
  const usernames = new Set(takenUsernames.map((username) => plainText(username.trim())))
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, 'Enter the club name.')
      .max(CLUB_NAME_MAX, 'Keep the name under 60 characters.')
      .refine((name) => !names.has(plainText(name)), 'A club with this name already exists.')
      .pipe(nameField),
    foundingAddress: z.string().trim().min(1, 'Enter the address where the club was founded.'),
    cityCode: z.string().min(1, 'Choose the founding city.'),
    username: z
      .string()
      .trim()
      .min(1, 'Choose a username.')
      .refine(
        (username) =>
          USERNAME_PATTERN.test(username) &&
          username.length >= USERNAME_MIN &&
          username.length <= USERNAME_MAX,
        USERNAME_FORMAT_ERROR,
      )
      .refine(
        (username) => !usernames.has(plainText(username)),
        'That username is already taken.',
      ),
    password: z.string().min(CLUB_PASSWORD_MIN, 'Use at least 8 characters.').pipe(passwordField),
    price: clubPriceField,
  })
}

/** What the fields hold while typing (prices as peso text). */
export type AddClubFormInput = z.input<ReturnType<typeof createAddClubSchema>>
/** What onSubmit receives: trimmed text and prices in integer centavos. */
export type AddClubFormValues = z.output<ReturnType<typeof createAddClubSchema>>
