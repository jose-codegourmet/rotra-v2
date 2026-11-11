import type { AdminPlayerEditValues } from '@rotra/schema/admin-player'
import { phoneField } from '@rotra/schema/phone'
import { plainIdentity } from '../club/club.rules'
import { PLAYING_LEVELS } from '../player/player.types'
import { levelLabel } from '../session-roster/sessionRoster.rules'
import type {
  AdminPlayerAccountFilter,
  AdminPlayerChangedField,
  AdminPlayerEdit,
  RankStatus,
  SameNameGroup,
} from './adminPlayer.types'

/** Rows per page; the Players screen asks for this many more each time. */
export const ADMIN_PLAYER_PAGE_SIZE = 25

/**
 * rotra-admin.html rankOf(). `threshold` is the recent-match requirement in effect (Player
 * Information ranking settings, initially 10) until A04.4 switches it to the effective settings version.
 */
export function rankStatusOf(
  levelIndex: number | null,
  recentStandardMatches: number,
  threshold: number,
): RankStatus {
  const level = levelIndex === null ? undefined : PLAYING_LEVELS[levelIndex]
  if (!level) return { kind: 'none', text: 'No rank yet' }
  if (recentStandardMatches < threshold) {
    return {
      kind: 'below',
      text: `${levelLabel(level)} · ${recentStandardMatches} of ${threshold} recent matches`,
    }
  }
  return { kind: 'board', text: `${levelLabel(level)} · on the overall leaderboard` }
}

/**
 * rotra-admin.html playerMatches(): name, nickname, RTR ID and email match accent- and case-insensitive;
 * phone digits match only when the query has 4 or more digits, and a leading 0 also matches as 63.
 * Admin only: public search must never match phones or emails.
 */
export function matchesAdminPlayerSearch(
  player: {
    name: string
    nickname: string | null
    rtrId: string | null
    email?: string
    phone?: string
  },
  q: string | undefined,
): boolean {
  const query = (q ?? '').trim()
  if (!query) return true
  const text = plainIdentity(
    [player.name, player.nickname ?? '', player.rtrId ?? '', player.email ?? ''].join(' '),
  )
  if (text.includes(plainIdentity(query))) return true
  const digits = query.replace(/\D/g, '')
  if (digits.length < 4) return false
  const phone = (player.phone ?? '').replace(/\D/g, '')
  return phone.includes(digits) || phone.includes(digits.replace(/^0/, '63'))
}

export function matchesAccountFilter(
  claimed: boolean,
  account: AdminPlayerAccountFilter = 'all',
): boolean {
  return account === 'all' || (account === 'registered' ? claimed : !claimed)
}

/** Names that more than one identity shares, in first-seen order (exact name match, never merged). */
export function sameNameGroups(rows: readonly { name: string }[]): SameNameGroup[] {
  const counts = new Map<string, number>()
  for (const row of rows) counts.set(row.name, (counts.get(row.name) ?? 0) + 1)
  return [...counts].filter(([, count]) => count > 1).map(([name, count]) => ({ name, count }))
}

/** 'RTR-PH-CEB-031526-0001' → '2026-03-15' (the date segment is MMDDYY); '' when malformed. */
export function createdOnFromRtrId(rtrId: string): string {
  const segment = rtrId.split('-')[3] ?? ''
  if (!/^\d{6}$/.test(segment)) return ''
  return `20${segment.slice(4, 6)}-${segment.slice(0, 2)}-${segment.slice(2, 4)}`
}

// ---------- A-PLAYER-EDIT (rotra-admin.html pmSave()) ----------

/** The toast when Save changes finds no difference; nothing is saved or logged. */
export const ADMIN_PLAYER_NOTHING_CHANGED = 'Nothing changed.'

/** The Edit form's starting values: the loaded record, an empty password and an empty reason. */
export function adminPlayerEditValuesOf(edit: AdminPlayerEdit): AdminPlayerEditValues {
  return {
    picture: edit.picture,
    name: edit.name,
    nickname: edit.nickname ?? '',
    playingStyle: edit.playingStyle,
    experienceYears: edit.experienceYears === null ? '' : String(edit.experienceYears),
    experienceMonths: edit.experienceMonths === null ? '' : String(edit.experienceMonths),
    ...edit.socialLinks,
    profilePrivate: edit.profilePrivate,
    phoneHidden: edit.phoneHidden,
    phone: edit.phone ?? '',
    email: edit.email ?? '',
    password: '',
    reason: '',
  }
}

/** '' = not given; a typed whole number otherwise (an invalid one compares as typed). */
const wholeOrNull = (value: string) => {
  const trimmed = value.trim()
  return trimmed === '' ? null : /^\d+$/.test(trimmed) ? Number(trimmed) : trimmed
}
/** Phones compare as E.164 whatever their typed form. */
const phoneOf = (value: string | undefined) => {
  const trimmed = value?.trim() ?? ''
  if (!trimmed) return ''
  const parsed = phoneField.safeParse(trimmed)
  return parsed.success ? parsed.data : trimmed
}

/**
 * rotra-admin.html pmSave(): the changed fields as the Activity log and toast name them — the
 * picture first, the password last, experience once for years and months. A typed password always
 * counts as a change (it is never compared, because it is never stored).
 */
export function adminPlayerChangedFields(
  edit: AdminPlayerEdit,
  values: AdminPlayerEditValues,
): AdminPlayerChangedField[] {
  const changed: AdminPlayerChangedField[] = []
  const add = (field: AdminPlayerChangedField, differs: boolean) => {
    if (differs && !changed.includes(field)) changed.push(field)
  }
  add('profile picture', (values.picture ?? null) !== (edit.picture ?? null))
  add('name', values.name.trim() !== edit.name)
  add('nickname', values.nickname.trim() !== (edit.nickname ?? ''))
  add('playing style', values.playingStyle.trim() !== edit.playingStyle)
  add(
    'experience',
    wholeOrNull(values.experienceYears) !== edit.experienceYears ||
      wholeOrNull(values.experienceMonths) !== edit.experienceMonths,
  )
  add('private profile', values.profilePrivate !== edit.profilePrivate)
  add('phone privacy', values.phoneHidden !== edit.phoneHidden)
  add('phone', phoneOf(values.phone) !== phoneOf(edit.phone))
  add('email', values.email.trim() !== (edit.email ?? ''))
  add('Facebook link', values.facebook.trim() !== edit.socialLinks.facebook)
  add('Instagram link', values.instagram.trim() !== edit.socialLinks.instagram)
  add('YouTube link', values.youtube.trim() !== edit.socialLinks.youtube)
  add('LinkedIn link', values.linkedin.trim() !== edit.socialLinks.linkedin)
  add('password', values.password !== '')
  return changed
}

/** The toast after a save (rotra-admin.html pmSave()); never mentions the password itself. */
export function adminPlayerSavedMessage(
  name: string,
  changed: readonly AdminPlayerChangedField[],
): string {
  if (!changed.length) return ADMIN_PLAYER_NOTHING_CHANGED
  return `Saved ${name}: ${changed.join(', ')}.${changed.includes('password') ? ' Give the new password to the player yourself.' : ''}`
}

/** The Activity log line for one save (rotra-admin.html pmSave() log()). No contact values, no password. */
export function adminPlayerEditedSummary(
  name: string,
  changed: readonly AdminPlayerChangedField[],
  reason: string,
): string {
  return `Edited ${name}: ${changed.join(', ')}. Reason: ${reason}`
}
