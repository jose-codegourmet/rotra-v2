import 'server-only'
import type { ClubContext } from '../auth/account-context'
import { prisma } from '../client/prisma'
import type { SocialProvider } from '../generated/prisma/client'
import { currentExperienceMonths, experienceUpdate } from '../player/profile'
import {
  emailWords,
  followClubLinks,
  lockEmail,
  normalizeEmail,
  openEntryByEmail,
  pointRecordAt,
  registeredPlayerByEmail,
  resolveEmail,
  savedRecordFor,
} from '../player/shared-entry'
import { requireClubEntitlement } from '../service/authorize'
import { ServiceError } from '../service/errors'
import { ownDetailsJson, readOwnDetails } from './club-player-own-details'
import { type ClubPictureStateDto, clubPictureStateOf } from './club-player-picture'

const E164 = /^\+639\d{9}$/
const NOT_EDITABLE = 'This player registered, so they keep their own details.'
const EMAIL_ERROR = 'Enter an email address, like name@example.com.'

/**
 * Q-SAVED-PLAYERS › Edit details (owner decision 2026-11-08; D-2026-11-16-04 since P15.8). The
 * club fills in what it knows about its own guest or unclaimed player. A registered player owns
 * their details, so the club cannot edit them. The email is the club's once: taken only when none
 * is on file, never changed here (only Admin changes it on the shared entry). A phone already on
 * file is never replaced here. Only this club's version is returned: never another club's.
 */
export type ClubPlayerDetailsDto = {
  clubPlayerId: string
  identity: 'guest' | 'pending' | 'unclaimed'
  fullName: string
  nickname: string | null
  phoneOnFile: boolean
  /** The club-set picture and the previous photo kept (D-2026-11-09-12) */
  picture: ClubPictureStateDto
  /** Unclaimed records only (email '' for an older record with none: Details required); null for guests */
  profile: {
    email: string
    playingStyle: string
    experienceYears: number | null
    experienceMonths: number | null
    socialLinks: Record<SocialProvider, string>
  } | null
}

async function loadEditable(context: ClubContext, clubPlayerId: string) {
  const row = await prisma.clubPlayer.findUnique({
    where: { clubId_id: { clubId: context.clubId, id: clubPlayerId } },
    select: {
      id: true,
      displayName: true,
      nickname: true,
      playerId: true,
      sharedEntryId: true,
      removedAt: true,
      privateInput: { select: { phoneE164: true, presetFields: true } },
      sharedEntry: { select: { email: true } },
      player: { select: { profileState: true } },
      avatarRef: true,
      avatarPreviousRef: true,
    },
  })
  if (!row || row.removedAt) throw new ServiceError('not_found')
  if (row.player?.profileState === 'claimed')
    throw new ServiceError('forbidden', { player: NOT_EDITABLE })
  return row
}

/** Saved with an email (a shared entry), or an older record with a phone and no email. */
const isUnclaimed = (row: Awaited<ReturnType<typeof loadEditable>>) =>
  Boolean(row.sharedEntryId || row.playerId || row.privateInput?.phoneE164)

export async function readClubPlayerDetails(
  context: ClubContext,
  clubPlayerId: string,
): Promise<ClubPlayerDetailsDto> {
  await requireClubEntitlement(context)
  const row = await loadEditable(context, clubPlayerId)
  const unclaimed = isUnclaimed(row)
  const own = readOwnDetails(row.privateInput?.presetFields)
  const months = currentExperienceMonths(own.experienceMonths, own.experienceRecordedAt)
  return {
    clubPlayerId: row.id,
    identity: unclaimed ? 'unclaimed' : 'guest',
    fullName: row.displayName,
    nickname: row.nickname,
    phoneOnFile: Boolean(row.privateInput?.phoneE164),
    picture: clubPictureStateOf(row),
    profile: unclaimed
      ? {
          email: row.sharedEntry?.email ?? '',
          playingStyle: own.playingStyle,
          experienceYears: months == null ? null : Math.floor(months / 12),
          experienceMonths: months == null ? null : months % 12,
          socialLinks: own.socialLinks,
        }
      : null,
  }
}

/**
 * Saves Edit details (rotra-queue.html saveEditPlayer()), answering like mock mode: `message`
 * "Details saved · NAME" plus what the email did ("· unclaimed · RTR-…", "· linked to their ROTRA
 * account", "· already on ROTRA · RTR-…"). When the email typed already belongs to another of this
 * club's saved players, everything else is saved, the email is not, and `samePerson` names that
 * player for the "Same person as NAME?" step (`moveSavedPlayer`). One transaction.
 */
export async function updateClubPlayerDetails(
  context: ClubContext,
  input: {
    clubPlayerId: string
    fullName: string
    nickname: string | null
    /** E.164 from the Route Handler; only used when no phone is on file */
    phoneE164: string | null
    email: string | null
    playingStyle: string
    experienceYears: number | null
    experienceMonths: number | null
    socialLinks: Partial<Record<SocialProvider, string>>
  },
) {
  await requireClubEntitlement(context)
  const fullName = input.fullName.trim()
  if (!fullName) throw new ServiceError('invalid', { fullName: 'Enter a name.' })
  const phone = input.phoneE164?.trim() || null
  if (phone && !E164.test(phone))
    throw new ServiceError('invalid', {
      phone: 'Enter a Philippine mobile number, like 0917 555 0142.',
    })
  const years = input.experienceYears ?? 0
  const months = input.experienceMonths ?? 0
  if (
    !Number.isInteger(years) ||
    !Number.isInteger(months) ||
    years < 0 ||
    years > 80 ||
    months < 0 ||
    months > 11
  )
    throw new ServiceError('invalid', {
      experience: 'Enter whole years from 0 to 80 and months from 0 to 11.',
    })
  const experience =
    input.experienceYears == null && input.experienceMonths == null ? null : years * 12 + months

  const row = await loadEditable(context, input.clubPlayerId)
  const unclaimed = isUnclaimed(row)
  // #1019: a record saved with a social link only has an entry and no email yet: one can be added.
  const linkOnly = Boolean(row.sharedEntryId && !row.playerId && !row.sharedEntry?.email)
  const emailOnFile = Boolean(row.sharedEntryId || row.playerId) && !linkOnly
  const typedEmail = emailOnFile ? '' : (input.email?.trim() ?? '')
  const email = typedEmail ? normalizeEmail(typedEmail) : null
  if (typedEmail && !email) throw new ServiceError('invalid', { email: EMAIL_ERROR })
  const onFile = row.privateInput?.phoneE164 ?? null
  return prisma.$transaction(async (tx) => {
    const now = new Date()
    await tx.clubPlayer.update({
      where: { clubId_id: { clubId: context.clubId, id: row.id } },
      data: {
        displayName: fullName,
        nickname: input.nickname?.trim() || null,
        revision: { increment: 1 },
      },
    })
    // A phone is taken only for an unclaimed player with none on file; a guest has none.
    const newPhone = unclaimed && phone && !onFile ? phone : null
    if (newPhone) {
      const taken = await tx.clubPlayer.findFirst({
        where: {
          clubId: context.clubId,
          id: { not: row.id },
          removedAt: null,
          OR: [
            { privateInput: { phoneE164: newPhone } },
            { player: { privateContact: { phoneE164: newPhone } } },
          ],
        },
        select: { displayName: true },
      })
      if (taken)
        throw new ServiceError('conflict', {
          phone: `${taken.displayName} already has this number.`,
        })
    }
    if (unclaimed) {
      const own = readOwnDetails(row.privateInput?.presetFields)
      const shown = currentExperienceMonths(own.experienceMonths, own.experienceRecordedAt)
      const changed = experienceUpdate(experience, shown, now)
      const presetFields = ownDetailsJson({
        playingStyle: input.playingStyle.trim(),
        experienceMonths:
          'experienceMonths' in changed ? (changed.experienceMonths ?? null) : own.experienceMonths,
        experienceRecordedAt:
          'experienceRecordedAt' in changed
            ? (changed.experienceRecordedAt ?? null)
            : own.experienceRecordedAt,
        socialLinks: {
          facebook: input.socialLinks.facebook?.trim() ?? own.socialLinks.facebook,
          instagram: input.socialLinks.instagram?.trim() ?? own.socialLinks.instagram,
          youtube: input.socialLinks.youtube?.trim() ?? own.socialLinks.youtube,
          linkedin: input.socialLinks.linkedin?.trim() ?? own.socialLinks.linkedin,
        },
      })
      await tx.clubPlayerPrivateInput.upsert({
        where: { clubPlayerId: row.id },
        update: {
          presetFields,
          ...(newPhone ? { phoneE164: newPhone } : {}),
          revision: { increment: 1 },
        },
        create: {
          clubPlayerId: row.id,
          clubId: context.clubId,
          phoneE164: newPhone,
          presetFields,
          capturedAt: now,
        },
      })
    }
    const message = `Details saved · ${fullName}`
    if (linkOnly && row.sharedEntryId) {
      // The email joins the person when nobody on ROTRA has it; the link wins otherwise.
      if (email) {
        await lockEmail(tx, email)
        const taken =
          (await registeredPlayerByEmail(tx, email)) || (await openEntryByEmail(tx, email))
        if (!taken)
          await tx.sharedPlayerEntry.update({
            where: { id: row.sharedEntryId },
            data: { email, revision: { increment: 1 } },
          })
      }
    }
    // #1019: the entry's link key follows this club's links; no email and no link left is a guest.
    if (row.sharedEntryId && !row.playerId) {
      const links = readOwnDetails(
        (await tx.clubPlayerPrivateInput.findUnique({ where: { clubPlayerId: row.id } }))
          ?.presetFields,
      ).socialLinks
      if (await followClubLinks(tx, context.clubId, row.id, row.sharedEntryId, links, now))
        return { clubPlayerId: row.id, message: `${message} · now a guest`, samePerson: null }
    }
    if (!email || linkOnly) return { clubPlayerId: row.id, message, samePerson: null }
    const known = await resolveEmail(tx, context.clubId, email, now, false)
    if (known) {
      const same = await savedRecordFor(tx, context.clubId, known, row.id)
      if (same)
        return {
          clubPlayerId: row.id,
          message,
          samePerson: {
            clubPlayerId: same.id,
            name: same.player?.fullName || same.displayName,
          },
        }
    }
    const resolution = known ?? (await resolveEmail(tx, context.clubId, email, now))
    if (!resolution) throw new Error('Email resolution failed')
    await pointRecordAt(tx, context.clubId, row.id, resolution)
    return {
      clubPlayerId: row.id,
      message: `${message} · ${emailWords(resolution)}`,
      samePerson: null,
    }
  })
}
