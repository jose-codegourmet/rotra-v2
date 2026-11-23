import { phoneField } from '@rotra/schema/phone'
import { checkMockSave } from '../mock/bridge'
import { MockError } from '../mock/errors'
import { delay } from '../mock/latency'
import { mockStore, readMockState } from '../mock/store'
import { PLAYING_LEVELS, type PlayingLevel } from '../player/player.types'
import {
  isCurrentRecord,
  savedDisplayName,
  savedRecordByEmail,
  syncUnclaimedProjection,
} from '../player/unclaimed'
import { isRealDataMode } from '../real/mode'
import { realGetClubPlayerDetails, realUpdateClubPlayerDetails } from '../real/queue'
import type {
  ClubPlayerDetails,
  ClubPlayerDetailsInput,
  ClubPlayerDetailsResult,
  ClubPlayerOwnDetails,
} from './clubPlayer.types'
import { clubPictureState } from './clubPlayerPicture.rules'
import { applyClubEmail, EDIT_PLAYER_EMAIL_ERROR, planClubEmail } from './email'
import { addEmailToLinkedEntry, followClubLinks } from './socialLink'

const NOT_EDITABLE = 'This player registered, so they keep their own details.'
const PHONE_ERROR = 'Enter a Philippine mobile number, like 0917 555 0142.'
const number = (typed: string) => (typed.trim() ? Number(typed) : null)
const NO_DETAILS: ClubPlayerOwnDetails = {
  playingStyle: '',
  experienceYears: null,
  experienceMonths: null,
  socialLinks: { facebook: '', instagram: '', youtube: '', linkedin: '' },
}

/**
 * Edit details for the club's own guest or unclaimed player; registered players are refused. Only
 * what this club entered is returned: never another club's version of the same person.
 */
export async function getClubPlayerDetails(id: string): Promise<ClubPlayerDetails> {
  if (isRealDataMode()) return realGetClubPlayerDetails(id)
  await delay(200)
  const state = readMockState()
  const row = state.clubPlayers.find((p) => p.id === id)
  if (!row) throw new MockError('permission', 'Player not available.')
  if (row.identity === 'registered') throw new MockError('permission', NOT_EDITABLE)
  const account = row.playerId
    ? state.playerAccounts.find((a) => a.playerId === row.playerId)
    : undefined
  const email = account?.email ?? state.pendingEmails?.[row.id] ?? ''
  const own = row.details ?? NO_DETAILS
  return {
    clubPlayerId: row.id,
    identity: row.identity,
    fullName: row.fullName,
    nickname: row.nickname,
    phoneOnFile: Boolean(state.privatePhones[row.id]),
    level: row.playingLevel ?? null,
    picture: clubPictureState(row, null),
    profile:
      row.identity === 'unclaimed' || email
        ? { ...own, socialLinks: { ...own.socialLinks }, email }
        : null,
  }
}

/**
 * Saves Edit details (rotra-queue.html saveEditPlayer()). The email is taken only when none is on
 * file: it makes a guest or an older record unclaimed with an RTR ID, links the record to the
 * ROTRA player who has that email, or waits for sync offline; once saved the club can't change it.
 * When the email already belongs to another saved player of the club, everything else is saved,
 * the email is not, and `samePerson` names that player for the "Same person as NAME?" step
 * (`moveSavedPlayer`). A phone is taken only for an unclaimed player with none on file.
 */
export async function updateClubPlayerDetails({
  id,
  values,
}: {
  id: string
  values: ClubPlayerDetailsInput
}): Promise<ClubPlayerDetailsResult> {
  if (isRealDataMode()) return realUpdateClubPlayerDetails(id, values)
  await delay(300)
  checkMockSave()
  if (!values.fullName.trim())
    throw new MockError('permission', 'Enter a name.', { fullName: 'Enter a name.' })
  let result: ClubPlayerDetailsResult | undefined
  mockStore.update((draft) => {
    const row = draft.clubPlayers.find((p) => p.id === id && isCurrentRecord(p))
    if (!row || row.identity === 'registered') throw new MockError('permission', NOT_EDITABLE)
    // A record saved with a social link only (#1019) has a person but no email yet: one can be added.
    const account = row.playerId
      ? draft.playerAccounts.find((a) => a.playerId === row.playerId)
      : undefined
    const linkOnly = !!account && !account.claimed && !account.email.trim()
    const emailOnFile = (!!row.playerId && !linkOnly) || !!draft.pendingEmails?.[row.id]
    // Everything is checked before the first write, so a refusal saves nothing.
    const plan = emailOnFile
      ? ({ kind: 'guest' } as const)
      : planClubEmail(draft, values.email, EDIT_PLAYER_EMAIL_ERROR)
    let phone: string | null = null
    if (row.identity === 'unclaimed' && !draft.privatePhones[row.id] && values.phone.trim()) {
      const parsed = phoneField.safeParse(values.phone)
      if (!parsed.success) throw new MockError('permission', PHONE_ERROR, { phone: PHONE_ERROR })
      phone = parsed.data
    }
    row.fullName = values.fullName.trim()
    row.nickname = values.nickname.trim() || null
    row.playingLevel = PLAYING_LEVELS.includes(values.level as PlayingLevel)
      ? (values.level as PlayingLevel)
      : null
    if (phone) draft.privatePhones[row.id] = phone
    if (row.identity === 'unclaimed')
      row.details = {
        playingStyle: values.playingStyle.trim(),
        experienceYears: number(values.experienceYears),
        experienceMonths: number(values.experienceMonths),
        socialLinks: {
          facebook: values.facebook.trim(),
          instagram: values.instagram.trim(),
          youtube: values.youtube.trim(),
          linkedin: values.linkedin.trim(),
        },
      }
    const message = `Details saved · ${row.fullName}`
    // #1019: with a link-only person the email joins that person when nobody else has it; the
    // link wins otherwise. With no email and no link left, this club's record is a guest again.
    if (linkOnly && plan.kind !== 'guest' && plan.kind !== 'pending')
      addEmailToLinkedEntry(draft, row, plan.email)
    if (linkOnly || plan.kind === 'guest') {
      if (followClubLinks(draft, row)) {
        result = { clubPlayerId: id, message: `${message} · now a guest`, samePerson: null }
        return
      }
      syncUnclaimedProjection(draft, row.playerId)
      result = { clubPlayerId: id, message, samePerson: null }
      return
    }
    const same = savedRecordByEmail(draft, row.clubId, plan.email, row.id)
    if (same) {
      result = {
        clubPlayerId: id,
        message,
        samePerson: { clubPlayerId: same.id, name: savedDisplayName(draft, same) },
      }
      return
    }
    const words = applyClubEmail(draft, row, plan)
    result = { clubPlayerId: id, message: `${message} · ${words}`, samePerson: null }
  })
  if (!result) throw new Error('Edit details produced no result.')
  return result
}
