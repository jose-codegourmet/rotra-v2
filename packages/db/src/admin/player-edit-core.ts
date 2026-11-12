import 'server-only'
import { adminPlayerChangedFields, validateAdminPlayerEdit } from '@rotra/data/admin-player/rules'
import type {
  AdminPlayerChangedField,
  AdminPlayerEdit,
  AdminPlayerEditInput,
} from '@rotra/data/admin-player/types'
import type { AdminContext } from '../auth/account-context'
import { prisma } from '../client/prisma'
import {
  currentExperienceMonths,
  experienceUpdate,
  PERSONAL_DETAILS_VERSION,
} from '../player/profile'
import { requireAdmin, requireRevision } from '../service/authorize'
import { ServiceError } from '../service/errors'
import { recordAudit } from './audit'
import { removeSupersededAdminPicture, uploadAdminPlayerPicture } from './player-edit-picture'
import { readAdminPlayerEdit } from './players'

const SOCIAL = ['facebook', 'instagram', 'youtube', 'linkedin'] as const
const CORE_FIELDS: AdminPlayerChangedField[] = [
  'profile picture',
  'name',
  'nickname',
  'playing style',
  'experience',
  'private profile',
  'phone privacy',
  'phone',
  'Facebook link',
  'Instagram link',
  'YouTube link',
  'LinkedIn link',
]

/** Apply the profile portion of an Admin edit under the player's loaded revision. */
export async function saveAdminPlayerCore(
  context: AdminContext,
  input: {
    playerId: string
    revision: string
    values: Omit<AdminPlayerEditInput, 'id' | 'revision'>
    operationId: string
  },
) {
  requireAdmin(context)
  const loaded = await readAdminPlayerEdit(context, input.playerId)
  if (!loaded.claimed)
    throw new ServiceError('invalid', { player: 'Only registered players can be edited here.' })
  requireRevision(BigInt(loaded.revision), input.revision)
  const edit: AdminPlayerEdit = { ...loaded, revision: Number(loaded.revision) }
  const preliminary = validateAdminPlayerEdit(edit, { ...input.values, picture: null })
  if (!preliminary.success)
    throw new ServiceError(
      'invalid',
      Object.fromEntries(
        preliminary.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
      ),
    )
  const changed = adminPlayerChangedFields(edit, input.values)
  const parsed = validateAdminPlayerEdit(
    edit,
    changed.includes('profile picture') ? input.values : { ...input.values, picture: null },
  )
  if (!parsed.success) {
    throw new ServiceError(
      'invalid',
      Object.fromEntries(
        parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
      ),
    )
  }
  const values = parsed.data
  if (changed.length && !values.reason)
    throw new ServiceError('invalid', { reason: 'Say why you are making this change.' })
  const coreChanged = changed.filter((field) => CORE_FIELDS.includes(field))
  if (!coreChanged.length) return { changed, coreChanged, revision: input.revision }
  let picture = changed.includes('profile picture') ? values.picture : edit.picture
  let upload: Awaited<ReturnType<typeof uploadAdminPlayerPicture>> | undefined
  if (coreChanged.includes('profile picture') && picture?.startsWith('data:image/')) {
    upload = await uploadAdminPlayerPicture(input.playerId, picture)
    picture = upload.reference
  }
  try {
    const result = await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<
        { id: string }[]
      >`SELECT "id" FROM "players" WHERE "id" = ${input.playerId}::uuid FOR UPDATE`
      if (!locked.length) throw new ServiceError('not_found')
      const player = await tx.player.findUniqueOrThrow({ where: { id: input.playerId } })
      requireRevision(player.revision, input.revision)
      if (coreChanged.includes('profile picture')) {
        if (
          picture?.startsWith('character:') &&
          picture !== player.avatarPreviousRef &&
          !(await tx.profileCharacter.findFirst({
            where: { id: picture.slice(10), shown: true, deletedAt: null },
            select: { id: true },
          }))
        )
          throw new ServiceError('invalid', { picture: 'Choose a character.' })
        if (
          picture?.startsWith('https://') &&
          !upload &&
          picture !== player.avatarPreviousRef &&
          picture !== player.avatarRef
        )
          throw new ServiceError('invalid', { picture: 'Choose a profile picture.' })
      }
      if (coreChanged.includes('phone')) {
        const inFlight = await tx.playerContactChangeRequest.findFirst({
          where: {
            playerId: player.id,
            field: 'phone',
            status: { in: ['approved', 'applying', 'failed'] },
          },
          select: { id: true },
        })
        if (inFlight)
          throw new ServiceError('conflict', { phone: 'Resolve the active phone change first.' })
        const contact = await tx.playerPrivateContact.findUnique({ where: { playerId: player.id } })
        if (!contact || !values.phone)
          throw new ServiceError('invalid', { phone: 'Enter a phone number.' })
        const duplicate = await tx.playerPrivateContact.findUnique({
          where: { phoneE164: values.phone },
        })
        if (duplicate && duplicate.playerId !== player.id)
          throw new ServiceError('invalid', {
            phone: 'This phone number is already linked to another player.',
          })
        const now = new Date()
        const pending = await tx.playerContactChangeRequest.findMany({
          where: { playerId: player.id, field: 'phone', status: 'pending' },
          select: { id: true },
        })
        for (const request of pending) {
          await tx.playerContactChangeRequest.update({
            where: { id: request.id },
            data: {
              status: 'rejected',
              reviewedByAdminId: context.adminId,
              reviewedAt: now,
              rejectedAt: now,
              supersededAt: now,
              resolutionNote: 'Superseded by an Admin edit',
              revision: { increment: 1 },
            },
          })
          await recordAudit(tx, context, {
            action: 'player.contact_change_rejected',
            targetType: 'player',
            targetId: player.id,
            metadata: { requestId: request.id, field: 'phone', superseded: true },
          })
        }
        const saved = await tx.playerPrivateContact.update({
          where: { playerId: player.id },
          data: {
            phoneE164: values.phone,
            phoneVerifiedAt: null,
            revision: { increment: 1 },
          },
        })
        await tx.playerAccount.updateMany({
          where: { playerId: player.id, contactSyncStatus: 'in_sync' },
          data: { contactSyncVersion: saved.revision, revision: { increment: 1 } },
        })
      }
      const months =
        values.experienceYears === '' && values.experienceMonths === ''
          ? null
          : Number(values.experienceYears || 0) * 12 + Number(values.experienceMonths || 0)
      const updated = await tx.player.update({
        where: { id: player.id },
        data: {
          fullName: values.name,
          nickname: values.nickname || null,
          ...(coreChanged.includes('profile picture')
            ? { avatarRef: picture, avatarPreviousRef: player.avatarRef }
            : {}),
          ...(coreChanged.includes('playing style')
            ? {
                personalDetails: { playingStyle: values.playingStyle },
                detailsVersion: PERSONAL_DETAILS_VERSION,
              }
            : {}),
          ...(coreChanged.includes('experience')
            ? experienceUpdate(
                months,
                currentExperienceMonths(player.experienceMonths, player.experienceRecordedAt),
                new Date(),
              )
            : {}),
          ...(coreChanged.includes('private profile')
            ? {
                profileVisibility: values.profilePrivate
                  ? player.profileVisibility === 'always_private'
                    ? 'always_private'
                    : 'private'
                  : 'public',
              }
            : {}),
          ...(coreChanged.includes('phone privacy')
            ? { hidePhoneFromClubs: values.phoneHidden }
            : {}),
          revision: { increment: 1 },
        },
      })
      for (const provider of SOCIAL) {
        if (
          !coreChanged.includes(
            `${provider === 'youtube' ? 'YouTube' : provider === 'linkedin' ? 'LinkedIn' : provider[0]?.toUpperCase() + provider.slice(1)} link` as AdminPlayerChangedField,
          )
        )
          continue
        const url = values[provider]
        if (!url) await tx.playerSocialLink.deleteMany({ where: { playerId: player.id, provider } })
        else
          await tx.playerSocialLink.upsert({
            where: { playerId_provider: { playerId: player.id, provider } },
            create: { playerId: player.id, provider, url },
            update: { url },
          })
      }
      await recordAudit(tx, context, {
        action: 'player.profile_updated',
        targetType: 'player',
        targetId: player.id,
        metadata: {
          before: { name: player.fullName, nickname: player.nickname },
          after: { name: values.name, nickname: values.nickname || null },
          changed: coreChanged,
          reason: values.reason,
          operationId: input.operationId,
        },
      })
      return {
        revision: updated.revision.toString(),
        oldPrevious: player.avatarPreviousRef,
        previous: player.avatarRef,
      }
    })
    if (
      coreChanged.includes('profile picture') &&
      result.oldPrevious !== result.previous &&
      result.oldPrevious !== picture
    )
      await removeSupersededAdminPicture(input.playerId, result.oldPrevious).catch(() => undefined)
    return { changed, coreChanged, revision: result.revision }
  } catch (error) {
    if (upload && error instanceof ServiceError) await upload.remove().catch(() => undefined)
    throw error
  }
}
