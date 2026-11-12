import { z } from 'zod'
import { emailField } from './email'
import { nameField } from './name'
import { experienceMonthsField, experienceYearsField, playingStyleField } from './personal-details'
import { phoneField } from './phone'
import { type SocialProvider, socialLinkField } from './social-link'

/** Approved Admin identity fields for Add player. */
export const adminPlayerCreateSchema = z.object({
  name: nameField,
  nickname: z.string().trim().max(60),
  phone: z.union([z.literal(''), phoneField]),
  email: z.union([z.literal(''), emailField]),
  place: z.enum(['CEB', 'MNL', 'DVO', 'ILO', 'BCD', 'TAG']),
  clubId: z.string(),
  allowDuplicate: z.boolean(),
})

/**
 * Real mode only: the Admin `PATCH /api/players/[playerId]` body (name, nickname, a photo link that
 * is never saved, reason). Real mode keeps this until the backend follow-up of A07.6.
 */
export const adminPlayerProfilePatchSchema = z.object({
  name: nameField,
  nickname: z.string().trim().max(60),
  picture: z.union([
    z.literal(''),
    z.url().refine((value) => value.startsWith('https://'), 'Use an HTTPS photo URL.'),
  ]),
  reason: z.string().trim().min(1, 'Enter a reason.'),
})

// ---------- A-PLAYER-EDIT (rotra-admin.html peErrors(), pmSave()) ----------
// The shared field rules decide what is valid; the messages are the Admin prototype's own copy.

/** The prototype's example link per provider (rotra-admin.html SOCIAL_KEYS). */
const ADMIN_LINK_EXAMPLE: Record<SocialProvider, [label: string, example: string]> = {
  facebook: ['Facebook', 'https://facebook.com/name'],
  instagram: ['Instagram', 'https://instagram.com/name'],
  youtube: ['YouTube', 'https://youtube.com/@channel'],
  linkedin: ['LinkedIn', 'https://linkedin.com/in/name'],
}
function adminLinkField(provider: SocialProvider) {
  const [label, example] = ADMIN_LINK_EXAMPLE[provider]
  const shared = socialLinkField(provider)
  return z
    .string()
    .trim()
    .refine((value) => shared.safeParse(value).success, `Use a ${label} link, like ${example}.`)
}

/**
 * A picture reference: null = initials, `character:<id>` (a shown library image; the mutation checks
 * it is shown), or a photo (an uploaded `data:image/…` or an https link). The previous picture is one
 * of these too.
 */
export const adminPlayerPictureField = z
  .string()
  .nullable()
  .refine(
    (value) =>
      value === null ||
      /^character:/.test(value) ||
      value.startsWith('data:image/') ||
      value.startsWith('https://'),
    'Choose a profile picture.',
  )

/**
 * Every field Admin › Players › Edit saves. Field-only rules; the rules that depend on the player
 * (email required for a registered player, no password for an unclaimed one, a reason when anything
 * changed) come from `adminPlayerEditSchemaFor`.
 *
 * Password *(for MVP or beta only)*: D-2026-11-09-14 amends D-2026-11-07-01 for the beta only; end
 * date not set. Empty keeps the current password. Never trimmed, never stored.
 */
export const adminPlayerEditSchema = z.object({
  picture: adminPlayerPictureField,
  // Same limits as nameField (required, 60 characters), with the prototype's messages.
  name: z
    .string()
    .trim()
    .min(1, 'Enter the full name.')
    .refine((value) => nameField.safeParse(value).success, 'Keep the name under 60 characters.'),
  nickname: z.string().trim().max(30, 'Keep the nickname under 30 characters.'),
  playingStyle: playingStyleField,
  /** As typed: '' or a whole number 0–80. Playing since is derived from experience, never sent. */
  experienceYears: z
    .string()
    .trim()
    .refine(
      (value) => experienceYearsField.safeParse(value).success,
      'Use a whole number of years.',
    ),
  /** As typed: '' or a whole number 0–11 */
  experienceMonths: z
    .string()
    .trim()
    .refine((value) => experienceMonthsField.safeParse(value).success, 'Use 0 to 11 months.'),
  facebook: adminLinkField('facebook'),
  instagram: adminLinkField('instagram'),
  youtube: adminLinkField('youtube'),
  linkedin: adminLinkField('linkedin'),
  profilePrivate: z.boolean(),
  phoneHidden: z.boolean(),
  /** '' or a Philippine mobile; parses to E.164 */
  phone: z
    .string()
    .trim()
    .refine(
      (value) => !value || phoneField.safeParse(value).success,
      'Enter the full phone number, like +63 917 555 0142.',
    )
    .transform((value) => (value ? phoneField.parse(value) : '')),
  email: z
    .string()
    .trim()
    .refine(
      (value) => !value || emailField.safeParse(value).success,
      'Enter an email like name@example.com.',
    ),
  password: z
    .string()
    .refine(
      (value) => !value || value.length >= 8,
      'Use at least 8 characters, or leave it empty to keep the current password.',
    ),
  /** Required when anything changed (checked against the loaded values, not here); up to 300 */
  reason: z.string().trim().max(300),
})

/** The rules that depend on the player being edited (rotra-admin.html peErrors()). */
export function adminPlayerEditSchemaFor(player: { claimed: boolean; hasAccount: boolean }) {
  return adminPlayerEditSchema.superRefine((values, ctx) => {
    // A player without a contact record keeps an empty email; there is nothing to sign in with yet.
    if (player.claimed && player.hasAccount && !values.email)
      ctx.addIssue({
        code: 'custom',
        path: ['email'],
        message: 'A registered player signs in with email. Enter one.',
      })
    if (!player.claimed && values.password)
      ctx.addIssue({
        code: 'custom',
        path: ['password'],
        message: "This player hasn't registered, so there's no password to replace.",
      })
  })
}

/** rotra-admin.html pmSave(): asked for only when something changed. */
export const ADMIN_PLAYER_REASON_REQUIRED = 'Say why you are making this change.'

export type AdminPlayerCreateValues = z.infer<typeof adminPlayerCreateSchema>
export type AdminPlayerProfilePatchValues = z.infer<typeof adminPlayerProfilePatchSchema>
/** The Edit form's values, as typed (phone in any accepted form) */
export type AdminPlayerEditValues = z.input<typeof adminPlayerEditSchema>
/** After parsing: trimmed, phone in E.164 */
export type AdminPlayerEditParsed = z.output<typeof adminPlayerEditSchema>
